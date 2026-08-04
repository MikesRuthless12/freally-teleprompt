import { useEffect, useMemo, useState } from "react";

import type { TeleprompterState } from "../api/types";
import { type Caesura, liveOffset, timeAtOffset } from "./caesura";

/**
 * The read's own clock (Phase A), live.
 *
 * Everything in Phase A is timed against the same quantity: **how far into the
 * read the script currently is, in seconds**, caesura holds counted. The
 * bar/beat counter shows it, the metronome anchors to it, the pace warning
 * compares against it and the rehearsal report is built from it. One
 * implementation, so the four can never disagree by a caesura.
 *
 * It is **negative during the start-countdown pre-roll** — that is what makes
 * the pre-roll double as the metronome's count-in, with the downbeat at zero.
 *
 * # Why this is cheap
 *
 * The naive live version is `timeAtOffset(liveOffset(...))` every tick, which
 * is two O(script) scans at whatever rate the tick runs. It is not needed:
 * `timeAtOffset` and `liveOffset` are exact inverses, so the read's elapsed
 * time is just *the elapsed time at the last broadcast offset, plus the wall
 * time since*. The one scan is memoised per broadcast and the tick does an
 * addition.
 *
 * The tick is a timer, not `requestAnimationFrame`, and deliberately so. This
 * drives numbers a person reads — the fastest tempo the app offers still gives
 * a beat every 240 ms — so 60 Hz would be twenty React renders nobody can see,
 * on top of the two surfaces already animating at that rate.
 */

/** How often the clock re-reads. Comfortably finer than a beat at any tempo the
 * app offers, and far coarser than the animation loops. */
const TICK_MS = 50;

/**
 * The read's elapsed seconds at `now`, from a broadcast and the moment it
 * arrived.
 *
 * Split out because two callers need the same arithmetic on two different
 * clocks: this hook at 20 Hz for the counter, and `useRehearsal` at 4 Hz for
 * its samples. The pre-roll's sign convention — negative while counting in —
 * is written down once, here.
 */
export function readSecAt(
  now: number,
  anchor: { baseSec: number; t: number; playing: boolean; countdown: number },
): number {
  const raw = anchor.playing ? (now - anchor.t) / 1000 : 0;
  // The pre-roll holds the scroll and reads as a count-in: while it runs, the
  // read has not started, so its clock is the negative of what is left.
  const countingIn = Math.max(0, anchor.countdown - raw);
  return countingIn > 0 ? -countingIn : anchor.baseSec + Math.max(0, raw - anchor.countdown);
}

/**
 * Where the last broadcast put the read, on the read's own clock.
 *
 * One O(script) scan per engine event rather than one per tick — see the note
 * on cost in this module's header.
 */
export function useBaseReadSec(state: TeleprompterState, caesuras: Caesura[]): number {
  const speed = state.speed > 0 ? state.speed : 1;
  return useMemo(
    () => timeAtOffset(state.offset, speed, caesuras),
    [state.offset, speed, caesuras],
  );
}

/**
 * Where the scroll is **now**, in visible characters (FT-M05).
 *
 * ⚠️ `state.offset` is an ANCHOR, not a position. The engine broadcasts on
 * events — a play, a pause, a seek, a speed change — and never on a timer, so
 * during a three-minute read it holds the offset the read *started* at while
 * every surface animates locally from it. Anything that asks "where are we?"
 * and reads `state.offset` is therefore asking "where did this play begin?",
 * which for the marker controls meant Next jumping to the marker after the one
 * the operator pressed play on, however far into the script they had got.
 *
 * Same 50 ms timer and the same reasoning as `useReadClock`, not
 * `requestAnimationFrame`: this drives a jump list and two buttons a person
 * looks at, and the two surfaces that genuinely animate are already running at
 * 60 Hz. **Call it from the smallest component that needs it** — the pace
 * warning is its own component for exactly this reason, so its clock re-renders
 * one span rather than the whole operator window.
 */
export function useLiveOffset(
  state: TeleprompterState,
  caesuras: Caesura[],
  active: boolean,
): number {
  const [offset, setOffset] = useState(state.offset);

  useEffect(() => {
    const anchor = {
      offset: state.offset,
      t: performance.now(),
      playing: state.playing,
      countdown: state.countdownRemaining,
      speed: state.speed > 0 ? state.speed : 1,
    };
    const read = () => {
      const raw = anchor.playing ? (performance.now() - anchor.t) / 1000 : 0;
      // The pre-roll holds the scroll, so it is subtracted rather than counted
      // — the same sign convention `readSecAt` states for the other clock.
      const elapsed = Math.max(0, raw - anchor.countdown);
      setOffset(liveOffset(anchor.offset, elapsed, anchor.speed, caesuras));
    };
    read();
    if (!active || !state.playing) return;
    const id = window.setInterval(read, TICK_MS);
    return () => window.clearInterval(id);
  }, [active, state.playing, state.offset, state.speed, state.countdownRemaining, caesuras]);

  return offset;
}

export function useReadClock(
  state: TeleprompterState,
  caesuras: Caesura[],
  /** Set false where nothing is watching, so the timer is not run for nobody. */
  active: boolean,
): number {
  const baseSec = useBaseReadSec(state, caesuras);
  const [readSec, setReadSec] = useState(baseSec);

  useEffect(() => {
    // `performance.now()` during render would be impure, so the anchor is taken
    // here — the moment this broadcast arrived. No ref: the effect's own deps
    // ARE the anchor, so a second copy of them could only ever disagree.
    const anchor = {
      baseSec,
      t: performance.now(),
      playing: state.playing,
      countdown: state.countdownRemaining,
    };
    const read = () => setReadSec(readSecAt(performance.now(), anchor));
    read();
    if (!active || !state.playing) return;
    const id = window.setInterval(read, TICK_MS);
    return () => window.clearInterval(id);
    // `baseSec` and `countdownRemaining` are in the list so a seek or a new
    // pre-roll re-reads immediately rather than at the next tick — a paused
    // scroll has no timer running to notice on its own.
  }, [active, state.playing, baseSec, state.countdownRemaining]);

  return readSec;
}
