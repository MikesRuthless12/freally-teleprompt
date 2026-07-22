/**
 * The speed model (FT-14): chars/sec ↔ BPM.
 *
 * The engine's speed is **always** characters per second — that is what the
 * projector and the LAN mirror read, and what the caesura maths is written in.
 * BPM is an alternate *display and entry* mode for musical pacing, converted at
 * the edge and never stored.
 *
 * One beat ≈ one short word or syllable. That ratio is what keeps the whole
 * 20–250 BPM range inside the engine's own 1–60 chars/sec clamp, so no BPM the
 * user can enter is silently altered by a second clamp underneath.
 */
const CHARS_PER_BEAT = 3.5;

export const BPM_MIN = 20;
export const BPM_MAX = 250;

export const bpmFromSpeed = (charsPerSec: number): number =>
  Math.round((charsPerSec * 60) / CHARS_PER_BEAT);

export const speedFromBpm = (bpm: number): number => (bpm * CHARS_PER_BEAT) / 60;

/** Clamp a BPM into the settable range. */
export const clampBpm = (bpm: number): number => Math.max(BPM_MIN, Math.min(BPM_MAX, bpm));
