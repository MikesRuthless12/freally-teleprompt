import { useCallback, useEffect, useRef, useState } from "react";

import type { TeleprompterState } from "../api/types";
import { type Caesura, liveOffset } from "./caesura";
import type { Sample } from "./rehearsal";
import { readSecAt, useBaseReadSec } from "./useReadClock";

/**
 * The rehearsal recorder (FT-N01) — the stateful half of `rehearsal.ts`.
 *
 * It records **two numbers at a time**: how long the rehearsal has been running
 * and where the read had got to. That is the entire recording. There is no
 * microphone here and no audio API of any kind; `rehearsal.test.ts` asserts
 * that over the source rather than trusting this sentence.
 *
 * The clock keeps running through a pause, and that is the point rather than an
 * oversight: the thing a rehearsal is trying to surface is the section you had
 * to stop in the middle of, and a stopwatch that stopped with the scroll could
 * not see one.
 */

/** How often the read's position is recorded. Four times a second is far finer
 * than any section boundary matters to, and `crossedAt` interpolates between
 * samples anyway — so this trades nothing for being cheap. */
const SAMPLE_MS = 250;

/** A cap on the recording, so a rehearsal left running overnight cannot grow
 * without bound. At 4 Hz this is a little over two hours, which is longer than
 * any script this app can hold. */
const MAX_SAMPLES = 32_000;

export type Rehearsal = {
  /**
   * A copy of everything recorded so far.
   *
   * A **function**, not a field, and that is the whole design. The recording
   * lives in a ref and is appended to in place: `[...previous, sample]` four
   * times a second is O(n²) in the length of the rehearsal — a thirty-minute
   * take copies about 26 million element references and allocates 7,200 arrays
   * to do it. But a ref is not something a render may read, so the buffer is
   * never handed out live; it is copied here, in the event handler that asks
   * for the report, which is exactly once per rehearsal.
   */
  snapshot: () => Sample[];
  /** Wall-clock seconds since the rehearsal began — pauses included. */
  elapsedSec: number;
  /**
   * Where the read was, on its own clock, when the rehearsal began.
   *
   * The pace warning needs it: `elapsedSec` counts from the toggle, and the
   * read clock counts from the top of the script. Subtracting one from the
   * other is only meaningful once both are measured from the same instant —
   * without this, starting a rehearsal 60 seconds into a take reported "ahead
   * by 1:00" immediately and stayed wrong for the rest of it.
   */
  startReadSec: number;
  /** Whether anything has been recorded yet. */
  started: boolean;
};

export function useRehearsal(
  state: TeleprompterState,
  caesuras: Caesura[],
  /** Rehearsal mode is on. Turning it on discards the previous recording. */
  active: boolean,
): Rehearsal {
  const samples = useRef<Sample[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [startReadSec, setStartReadSec] = useState(0);
  /**
   * Whether anything has been recorded. Real state, not `startedAt.current !==
   * null` read during render — a ref read that way is not reactive, and the
   * very first tick sets `elapsedSec` to 0 when it is already 0, so React bails
   * out of the render and the caller never sees it change. `phaseA.spec.ts`
   * caught that as a report that refused to open.
   */
  const [started, setStarted] = useState(false);
  /** When the rehearsal began, on `performance.now()`'s clock; null before it
   * has. A ref because it is read by a timer, not rendered. */
  const startedAt = useRef<number | null>(null);

  const baseSec = useBaseReadSec(state, caesuras);

  // The sampler reads these at tick time rather than closing over them, so an
  // edit or a speed change mid-rehearsal does not restart the timer (which
  // would drop the samples taken since the last one). Written in an effect
  // rather than during render — a ref assigned during render is not a value
  // the renderer can see, and `react-hooks` says so.
  const live = useRef({ state, caesuras });
  useEffect(() => {
    live.current = { state, caesuras };
  });

  /**
   * Starting a rehearsal throws the previous recording away.
   *
   * ⚠️ Its OWN effect, keyed on `active` alone. It used to live at the top of
   * the sampler effect below — which also re-runs whenever the engine
   * broadcasts — so the recording was wiped by every pause, every seek and
   * every speed change, i.e. by exactly the three things a rehearsal exists to
   * measure. The report then showed `0:00` actual for every section read before
   * the first pause and offered to "correct" the pace to 60 chars/sec.
   *
   * ⚠️ And on START, never on stop. The report is read AFTER the mode is
   * switched off — switching it off is what asks for the report — so clearing
   * on the way out hands the report an empty recording.
   */
  useEffect(() => {
    if (!active) return;
    // Refs only. The observable state that goes with them — `elapsedSec`,
    // `startReadSec`, `started` — is rewritten by the sampler's very first
    // tick, which runs synchronously below; setting it here as well would be a
    // cascading render for nothing, and `react-hooks` says so.
    samples.current = [];
    startedAt.current = null;
  }, [active]);

  useEffect(() => {
    if (!active) return;
    // Re-anchored on every broadcast, exactly as the read clock is — but
    // sampled at 4 Hz rather than 20, because a section boundary does not care
    // and `crossedAt` interpolates between whatever it is given.
    //
    // `baseSec` is in the dep list rather than read through a ref so that a
    // speed change while PAUSED re-anchors: it moves the read's clock without
    // moving `state.offset`, so nothing else here would notice.
    const anchor = {
      baseSec,
      t: performance.now(),
      playing: state.playing,
      countdown: state.countdownRemaining,
    };
    const tick = () => {
      const now = performance.now();
      const read = readSecAt(now, anchor);
      if (startedAt.current === null) {
        startedAt.current = now;
        // The read's clock at the instant the stopwatch started, so the two can
        // be compared — see `startReadSec`.
        setStartReadSec(read);
      }
      const at = (now - startedAt.current) / 1000;
      const { state: s, caesuras: holds } = live.current;
      // The position that read time corresponds to. `liveOffset` from zero by
      // the read's own elapsed seconds IS that position — the same inverse pair
      // the seek bar's timestamps rest on, so a sample and the number under the
      // prompter can never disagree.
      const offset = liveOffset(0, Math.max(0, read), s.speed > 0 ? s.speed : 1, holds);
      if (samples.current.length < MAX_SAMPLES) samples.current.push({ atSec: at, offset });
      setElapsedSec(at);
      setStarted(true);
    };
    tick();
    const id = window.setInterval(tick, SAMPLE_MS);
    return () => window.clearInterval(id);
  }, [active, state.playing, baseSec, state.countdownRemaining]);

  const snapshot = useCallback(() => samples.current.slice(), []);
  return { snapshot, elapsedSec, startReadSec, started };
}
