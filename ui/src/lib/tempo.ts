/**
 * Musical time (Phase A): tap tempo, calibration, and bars & beats.
 *
 * Everything here is pure maths over numbers the caller already has. The audio
 * lives in `metronome.ts`, the recording in `rehearsal.ts`, and the settings
 * that persist a calibration live in Rust — this file is the shared vocabulary
 * all three speak, and the only place the timing rules are written down.
 *
 * **The clock is the read's own elapsed time**, in seconds, measured from the
 * moment the scroll starts moving — i.e. `timeAtOffset(offset, …)` from
 * `caesura.ts`, which counts caesura holds. Beats are therefore musical time,
 * so a caesura hold keeps counting through, and a seek lands on the bar that
 * position really falls on. Deriving beats from wall-clock instead would put
 * the counter and the click a caesura's worth out of step with the script after
 * the very first pause.
 */

import { clampCharsPerBeat, clampFinite } from "./speed";

/** Beats in a bar. Mirror of Rust's `BEATS_PER_BAR_MIN/MAX`; 4 is the default. */
export const BEATS_PER_BAR_MIN = 2;
export const BEATS_PER_BAR_MAX = 12;
export const DEFAULT_BEATS_PER_BAR = 4;

/**
 * Taps further apart than this start a new tapping session.
 *
 * 3 seconds is not arbitrary: it is one beat at `BPM_MIN` (20), so it is the
 * longest gap that could still be someone tapping a tempo the app will accept.
 * Anything longer is a person who walked away and came back.
 */
export const TAP_RESET_MS = 3000;

/** Taps needed before a tempo is reported — three taps, so there are two
 * intervals to take a median of. One interval is a guess with no way to tell a
 * fumble from a tempo. */
const MIN_TAPS = 3;

/** Drop the taps that belong to an earlier session, keeping the current run. */
export function tapSession(timesMs: readonly number[]): number[] {
  let start = 0;
  for (let i = 1; i < timesMs.length; i++) {
    if (timesMs[i] - timesMs[i - 1] > TAP_RESET_MS) start = i;
  }
  return timesMs.slice(start);
}

/**
 * The tempo a run of taps describes, or null while there are too few.
 *
 * The **median** interval, not the mean: one fumbled tap is one bad interval,
 * and a median ignores it where a mean folds half of it into the answer. That
 * is the whole reason tap tempo is usable at all — nobody taps evenly.
 */
export function tapBpm(timesMs: readonly number[]): number | null {
  const taps = tapSession(timesMs);
  if (taps.length < MIN_TAPS) return null;
  const gaps: number[] = [];
  for (let i = 1; i < taps.length; i++) gaps.push(taps[i] - taps[i - 1]);
  gaps.sort((a, b) => a - b);
  const mid = gaps.length >> 1;
  const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
  if (!(median > 0)) return null;
  return Math.round(60000 / median);
}

/**
 * The calibration a measured delivery implies: how many characters this
 * performer actually gets through in one beat.
 *
 * This is the answer to ROADMAP open question 4 in one line — the mapping is
 * measured, not assumed. `charsPerSec` is the pace the read was actually
 * running at, `bpm` the tempo it was performed against.
 */
export function charsPerBeatFrom(charsPerSec: number, bpm: number): number {
  if (!(bpm > 0)) return clampCharsPerBeat(Number.NaN);
  return clampCharsPerBeat((charsPerSec * 60) / bpm);
}

/** Clamp a bar length into the settable range. */
export const clampBeatsPerBar = (value: number): number =>
  clampFinite(Math.round(value), BEATS_PER_BAR_MIN, BEATS_PER_BAR_MAX, DEFAULT_BEATS_PER_BAR);

/** Seconds per beat at this tempo. */
export const beatSeconds = (bpm: number): number => 60 / Math.max(bpm, 1e-6);

/**
 * Which beat of which bar the read is on at `elapsedSec`.
 *
 * Both numbers are **1-based**, because that is how a musician counts them —
 * "bar 3, beat 1", never "bar 2, beat 0".
 *
 * Before the read starts, `elapsedSec` is negative (the start-countdown
 * pre-roll, which doubles as the metronome's count-in). Those beats are
 * reported as `countIn`, counting DOWN to the downbeat: the last click before
 * the scroll moves is 1. A caller showing a counter should show nothing, or the
 * count-in number — never "bar -1".
 */
export function barBeat(
  elapsedSec: number,
  bpm: number,
  beatsPerBar: number,
): { bar: number; beat: number; countIn: number } {
  const perBar = clampBeatsPerBar(beatsPerBar);
  const index = Math.floor(elapsedSec / beatSeconds(bpm));
  if (index < 0) return { bar: 0, beat: 0, countIn: -index };
  return {
    bar: Math.floor(index / perBar) + 1,
    // `index % perBar` is safe here — `index` is non-negative on this branch,
    // so the sign quirk of `%` on negatives cannot reach it.
    beat: (index % perBar) + 1,
    countIn: 0,
  };
}

/**
 * When each drawn bar line falls, in read-elapsed seconds.
 *
 * `maxLines` exists because the honest answer can be enormous: a ten-minute
 * read at 250 BPM in 4/4 is 625 bars, which is a solid block of ink on a seek
 * bar 600 pixels wide. Rather than truncate — which would silently claim the
 * read ends at bar 200 — the lines are **thinned by an integer stride**, so
 * what is drawn is still every Nth real bar line and still lands on real bars.
 */
export function barLineTimes(
  totalSec: number,
  bpm: number,
  beatsPerBar: number,
  maxLines: number,
): number[] {
  const barSec = beatSeconds(bpm) * clampBeatsPerBar(beatsPerBar);
  if (!(totalSec > 0) || !(barSec > 0) || maxLines < 1) return [];
  const bars = Math.floor(totalSec / barSec);
  if (bars < 1) return [];
  const stride = Math.max(1, Math.ceil(bars / maxLines));
  const out: number[] = [];
  for (let bar = stride; bar <= bars; bar += stride) out.push(bar * barSec);
  return out;
}

/**
 * The audio-clock time to schedule beat `beatIndex` at.
 *
 * **This is the no-drift property, and it is why it is a function of the beat
 * INDEX rather than of the previous beat.** Every click is computed from the
 * same two anchors, so the error in the thousandth click is one rounding of one
 * multiplication — not a thousand rounding errors added up. A scheduler that
 * walks `next += 60 / bpm` accumulates instead, and over a ten-minute read that
 * is audible against a scroll which is doing the arithmetic the other way.
 *
 * `anchorAudioSec` is `AudioContext.currentTime` at the moment the anchor was
 * taken; `anchorReadSec` is the read's own elapsed time at that same moment.
 * Beat 0 is the downbeat the scroll starts on, so a negative index is a
 * count-in click during the pre-roll.
 */
export function beatAudioTime(
  beatIndex: number,
  bpm: number,
  anchorAudioSec: number,
  anchorReadSec: number,
): number {
  return anchorAudioSec + (beatIndex * beatSeconds(bpm) - anchorReadSec);
}
