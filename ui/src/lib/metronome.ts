/**
 * The metronome click (FT-N03).
 *
 * Synthesised in the webview with a short oscillator blip — there is no audio
 * file to bundle and none to license, which is the charter's rule about shipped
 * assets applied to sound.
 *
 * # Why this is a scheduler and not a `setInterval`
 *
 * `setInterval(fn, 60000 / bpm)` is the obvious implementation and it is wrong
 * twice over. Its callback is a *timer*, so it fires whenever the main thread
 * gets round to it — a layout on a long script, or a garbage collection, moves
 * a click audibly — and each firing starts the next interval from where the
 * last one actually ran, so the error compounds. Over a ten-minute read that is
 * seconds out against a scroll doing exact arithmetic.
 *
 * Instead: a coarse timer wakes ~every {@link TICK_MS} and *schedules* every
 * click falling in the next {@link LOOKAHEAD_SEC} at an exact
 * `AudioContext.currentTime`. Audio hardware honours those timestamps to the
 * sample, so the wake-up jitter that ruins the naive version is absorbed
 * entirely — the timer only has to wake often enough not to miss the window.
 *
 * Every click's time comes from {@link beatAudioTime}, which computes from the
 * beat INDEX rather than from the previous beat. That is the property the Phase
 * A DoD asks to be measured, and `tempo.test.ts` measures it: nothing
 * accumulates, so the 2500th click of a ten-minute read is as exact as the
 * first.
 */

import { beatAudioTime, beatSeconds, clampBeatsPerBar } from "./tempo";

/** How often the scheduler wakes to look ahead. Well inside `LOOKAHEAD_SEC`, so
 * a wake-up that runs late still lands before the window it had to fill. */
const TICK_MS = 25;
/** How far ahead clicks are queued with the audio clock. Long enough to survive
 * a stalled main thread, short enough that a stop or a tempo change is not left
 * with a queue of clicks it can no longer take back. */
const LOOKAHEAD_SEC = 0.15;

/** Click length. Short enough to read as a tick rather than a tone. */
const CLICK_SEC = 0.03;
/** The downbeat is pitched higher than the rest of the bar — the convention
 * every metronome uses, and what makes a bar audible as a bar. */
const DOWNBEAT_HZ = 1600;
const BEAT_HZ = 1000;
/** Peak gain of a click. Deliberately modest: this plays under someone
 * rehearsing out loud, not over them. */
const CLICK_GAIN = 0.14;

/** Where the read is, and how fast — sampled by the caller at the moment it
 * calls {@link Metronome.start}. */
export type MetronomeClock = {
  /** BPM to click at. */
  bpm: number;
  /** Beats to a bar — the downbeat accent falls on the first of each. */
  beatsPerBar: number;
  /**
   * The read's own elapsed seconds, right now.
   *
   * **Negative during the start-countdown pre-roll**, which is exactly what
   * makes the pre-roll a count-in: beat 0 is the downbeat the scroll starts on,
   * so the pre-roll's clicks are the negative beats leading up to it.
   *
   * This is the read's clock, not the wall clock — `timeAtOffset(offset, …)`,
   * which counts caesura holds. Anchoring to wall-clock instead would put the
   * click a caesura's worth out of step with the script after the first pause.
   */
  readSec: number;
};

/**
 * A running metronome.
 *
 * One instance owns one `AudioContext`, created on the first click rather than
 * at import: a context constructed before a user gesture starts `suspended`
 * under every browser's autoplay policy, and one constructed and never used
 * still holds an audio device open.
 */
export class Metronome {
  private ctx: AudioContext | null = null;
  private timer: number | null = null;
  /** The next beat index to schedule. */
  private nextBeat = 0;
  /** The current anchor: the read position and the audio time it was taken at. */
  private anchor: { clock: MetronomeClock; atAudioSec: number } | null = null;
  /**
   * The audio time of the last click actually queued, or `-Infinity`.
   *
   * Re-anchoring (a seek, a tempo change, a keystroke that re-broadcasts the
   * engine state) recomputes the beat index from the new position, and without
   * this a beat already sitting in the audio queue would be queued a second
   * time — heard as a flam rather than a click. Clicks cannot be un-queued, so
   * the only fix is not to queue them twice.
   */
  private lastQueuedAt = Number.NEGATIVE_INFINITY;

  /**
   * Start clicking, or re-anchor a running click onto a new read position.
   *
   * Re-anchoring is what a tempo change, a seek, or a play-after-pause does:
   * the beat index is recomputed from the new position, so the click lands
   * where the SCRIPT says the beat is rather than continuing a count from
   * wherever it had got to.
   */
  start(clock: MetronomeClock): void {
    const ctx = this.context();
    if (!ctx) {
      // No Web Audio here (a jsdom unit test, or a webview with audio
      // disabled). The read carries on silently, which is the honest
      // degradation — a prompter that refused to scroll without a click would
      // be a worse app.
      this.stop();
      return;
    }
    this.anchor = { clock, atAudioSec: ctx.currentTime };
    // The first beat still ahead of the anchor. `ceil`, not `floor`: a beat
    // already behind the read position has been played or missed, and firing it
    // now would put a click a fraction of a beat out of place. The epsilon
    // keeps a position sitting exactly on a beat from being nudged to the next.
    const next = Math.ceil(clock.readSec / beatSeconds(clock.bpm) - 1e-9);
    // A re-anchor that steps the count BACKWARDS is a seek or a rewind, not a
    // re-broadcast of the same position — so the duplicate guard, which is
    // measured on the previous anchor's timeline, no longer applies. Left in
    // place it suppressed every click due within half a beat of the seek, which
    // could be the downbeat the operator seeked to hear.
    if (next < this.nextBeat) this.lastQueuedAt = Number.NEGATIVE_INFINITY;
    this.nextBeat = next;
    if (this.timer === null) {
      this.timer = window.setInterval(() => this.pump(), TICK_MS);
    }
    // Fill the first window at once, so a click due within `TICK_MS` of the
    // start is not missed while waiting for the first wake-up.
    this.pump();
  }

  /** Stop clicking and release the audio device. */
  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.anchor = null;
    this.lastQueuedAt = Number.NEGATIVE_INFINITY;
    // Closed rather than suspended: one rehearsal can be a long way from the
    // next, and a suspended context still holds the device open.
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  /** Queue every click falling inside the lookahead window. */
  private pump(): void {
    const anchor = this.anchor;
    const ctx = this.ctx;
    if (!anchor || !ctx) return;
    const { clock, atAudioSec } = anchor;
    const beatSec = beatSeconds(clock.bpm);
    const until = ctx.currentTime + LOOKAHEAD_SEC;
    const perBar = clampBeatsPerBar(clock.beatsPerBar);
    // Bounded rather than `while (true)`: a pathological tempo must not spin
    // the main thread. The bound is generous — at 250 BPM a 150 ms window holds
    // a single beat.
    for (let guard = 0; guard < 64; guard++) {
      const at = beatAudioTime(this.nextBeat, clock.bpm, atAudioSec, clock.readSec);
      if (at > until) return;
      this.nextBeat += 1;
      // Too old to play: a wake-up that ran very late, or a re-anchor that
      // stepped backwards. Dropped rather than fired in a burst.
      if (at <= ctx.currentTime - beatSec) continue;
      // Already queued by a previous anchor — see `lastQueuedAt`.
      if (at <= this.lastQueuedAt + beatSec / 2) continue;
      const when = Math.max(at, ctx.currentTime);
      this.lastQueuedAt = when;
      // `% perBar` is safe on a negative index only if it is normalised first,
      // and the count-in runs on negative indices — so the downbeat test is
      // written to hold on both sides of zero.
      this.click(ctx, when, (((this.nextBeat - 1) % perBar) + perBar) % perBar === 0);
    }
  }

  /** One blip at `at`, accented on a downbeat. */
  private click(ctx: AudioContext, at: number, downbeat: boolean): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = downbeat ? DOWNBEAT_HZ : BEAT_HZ;
    // A square wave under a fast decay reads as a "tick"; a bare sine reads as
    // a beep. The envelope matters more than the waveform — switching a gain
    // from full to zero instantly is a discontinuity, which is itself an
    // audible click, so it is ramped down across the blip's whole length.
    osc.type = "square";
    gain.gain.setValueAtTime(CLICK_GAIN, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + CLICK_SEC);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + CLICK_SEC);
  }

  /** The audio context, created on first use; null where Web Audio is absent. */
  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    return this.ctx;
  }
}
