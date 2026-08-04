/**
 * The speed model (FT-14, calibratable since FT-N02): chars/sec ↔ BPM.
 *
 * The engine's speed is **always** characters per second — that is what the
 * projector and the LAN mirror read, and what the caesura maths is written in.
 * BPM is an alternate *display and entry* mode for musical pacing, converted at
 * the edge and never stored.
 *
 * The conversion needs one number: how many characters a performer gets through
 * in one beat. That is **not** a universal constant — a rapper and a balladeer
 * differ by an order of magnitude — which is exactly what ROADMAP open question
 * 4 asked. The answer this file implements: ship a sane default, and let the
 * performer calibrate it against their own delivery (`chars_per_beat` in
 * settings; measured by the tap-tempo pane in `tempo.ts`).
 */

/**
 * The uncalibrated default: one beat ≈ one short word or syllable.
 *
 * Mirror of Rust `settings::DEFAULT_CHARS_PER_BEAT`. It is the value every
 * install starts on, so changing it re-paces every existing user's BPM mode.
 */
export const DEFAULT_CHARS_PER_BEAT = 3.5;

/** The calibration's outer bounds. Mirror of Rust's `CHARS_PER_BEAT_MIN/MAX`.
 * Wide enough for a drone at one end and an auctioneer at the other; bounded so
 * `bpmRange` below can never collapse to nothing. */
export const CHARS_PER_BEAT_MIN = 0.5;
export const CHARS_PER_BEAT_MAX = 40;

/** The musical range BPM entry is offered over, before calibration narrows it. */
export const BPM_MIN = 20;
export const BPM_MAX = 250;

/**
 * The engine's own chars/sec clamp (mirror of Rust `MIN_SPEED`/`MAX_SPEED`).
 *
 * Exported because two things need it and neither owns it: `bpmRange` below,
 * and `rehearsal.ts`'s suggested speed. Rust made the same call — `settings.rs`
 * imports these from `teleprompter.rs` rather than re-declaring them, under the
 * comment "two copies of these numbers would drift silently".
 */
export const SPEED_MIN = 1;
export const SPEED_MAX = 60;

/**
 * `value` clamped to `[lo, hi]`, with a non-finite value falling back.
 *
 * The fallback is the point: `Math.min`/`Math.max` PROPAGATE NaN rather than
 * correcting it, so a NaN would sail through a plain clamp and reach the engine
 * as a NaN speed, which stops the scroll dead. The twin of Rust's
 * `clamp_finite`, and here for the same reason it is there — so the next
 * clamped setting does not add a third copy of these three lines.
 */
export const clampFinite = (value: number, lo: number, hi: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(lo, Math.min(hi, value)) : fallback;

export const bpmFromSpeed = (charsPerSec: number, charsPerBeat: number): number =>
  Math.round((charsPerSec * 60) / clampCharsPerBeat(charsPerBeat));

export const speedFromBpm = (bpm: number, charsPerBeat: number): number =>
  (bpm * clampCharsPerBeat(charsPerBeat)) / 60;

/** Clamp a calibration into the settable range. */
export const clampCharsPerBeat = (value: number): number =>
  clampFinite(value, CHARS_PER_BEAT_MIN, CHARS_PER_BEAT_MAX, DEFAULT_CHARS_PER_BEAT);

/**
 * The BPM range that is actually settable at this calibration.
 *
 * The load-bearing invariant of the whole speed model is that **every BPM the
 * user can enter maps to a chars/sec the engine will accept unchanged**. The
 * engine clamps to 1–60, so at a given `charsPerBeat` the reachable BPMs are
 * those whose converted speed lands in that window — and once the calibration
 * moves, the musical 20–250 is no longer all reachable.
 *
 * Narrowing the offered range is the honest resolution. The alternative —
 * keeping 20–250 on screen and letting the engine's clamp quietly correct the
 * ends — is the failure the invariant exists to prevent: a number displayed
 * that does not describe what the scroll is doing.
 */
export function bpmRange(charsPerBeat: number): { min: number; max: number } {
  const cpb = clampCharsPerBeat(charsPerBeat);
  // Ceil the low end and floor the high end: rounding the other way would put
  // the boundary BPM itself a hair outside the engine's clamp.
  return {
    min: Math.max(BPM_MIN, Math.ceil((SPEED_MIN * 60) / cpb)),
    max: Math.min(BPM_MAX, Math.floor((SPEED_MAX * 60) / cpb)),
  };
}

/** Clamp a BPM into the range settable at this calibration. */
export const clampBpm = (bpm: number, charsPerBeat: number): number => {
  const { min, max } = bpmRange(charsPerBeat);
  return Math.max(min, Math.min(max, bpm));
};
