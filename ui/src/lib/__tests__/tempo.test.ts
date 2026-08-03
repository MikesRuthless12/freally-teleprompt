import { describe, expect, it } from "vitest";

import {
  BPM_MAX,
  BPM_MIN,
  CHARS_PER_BEAT_MAX,
  CHARS_PER_BEAT_MIN,
  DEFAULT_CHARS_PER_BEAT,
  bpmFromSpeed,
  bpmRange,
  clampBpm,
  clampCharsPerBeat,
  speedFromBpm,
} from "../speed";
import {
  DEFAULT_BEATS_PER_BAR,
  TAP_RESET_MS,
  barBeat,
  barLineTimes,
  beatAudioTime,
  beatSeconds,
  charsPerBeatFrom,
  clampBeatsPerBar,
  tapBpm,
  tapSession,
} from "../tempo";

/**
 * Phase A's timing maths. Everything the metronome, the bar/beat counter and
 * the rehearsal report stand on is in here, so these are the tests that decide
 * whether any of the three can be trusted.
 */

describe("the calibratable speed model (FT-14 + FT-N02)", () => {
  it("BPM and chars/sec round-trip at any calibration", () => {
    for (const cpb of [CHARS_PER_BEAT_MIN, 2, DEFAULT_CHARS_PER_BEAT, 8, CHARS_PER_BEAT_MAX]) {
      const { min, max } = bpmRange(cpb);
      for (const bpm of [min, Math.round((min + max) / 2), max]) {
        expect(bpmFromSpeed(speedFromBpm(bpm, cpb), cpb), `cpb ${cpb} bpm ${bpm}`).toBe(bpm);
      }
    }
  });

  /**
   * The load-bearing property, generalised from the uncalibrated version it
   * replaces: every BPM the user can enter must map to a speed the ENGINE will
   * accept unchanged (it clamps to 1–60 chars/sec). If this fails, a legal BPM
   * is silently altered by a clamp underneath and the number on screen stops
   * describing what the scroll is doing.
   *
   * Calibration is what made this non-trivial. At 3.5 chars/beat the whole
   * musical 20–250 fits inside the engine's window; at 20 chars/beat it does
   * not, and the honest answer is to offer a narrower range rather than to keep
   * showing numbers that do not work.
   */
  it("every offered BPM lands inside the engine's chars/sec clamp, at every calibration", () => {
    for (let cpb = CHARS_PER_BEAT_MIN; cpb <= CHARS_PER_BEAT_MAX; cpb += 0.25) {
      const { min, max } = bpmRange(cpb);
      expect(max, `cpb ${cpb} offers no BPM at all`).toBeGreaterThanOrEqual(min);
      for (const bpm of [min, max]) {
        const speed = speedFromBpm(bpm, cpb);
        expect(speed, `cpb ${cpb} bpm ${bpm}`).toBeGreaterThanOrEqual(1);
        expect(speed, `cpb ${cpb} bpm ${bpm}`).toBeLessThanOrEqual(60);
      }
    }
  });

  it("keeps the full musical range at the shipped default", () => {
    // Nobody who never opens the calibration should notice it exists.
    expect(bpmRange(DEFAULT_CHARS_PER_BEAT)).toEqual({ min: BPM_MIN, max: BPM_MAX });
  });

  it("clamps entry to the range the calibration actually allows", () => {
    expect(clampBpm(0, DEFAULT_CHARS_PER_BEAT)).toBe(BPM_MIN);
    expect(clampBpm(9000, DEFAULT_CHARS_PER_BEAT)).toBe(BPM_MAX);
    expect(clampBpm(120, DEFAULT_CHARS_PER_BEAT)).toBe(120);
    // At 20 chars/beat the top of the musical range is out of the engine's
    // reach, so entry clamps to the top that IS reachable, not to 250.
    const { max } = bpmRange(20);
    expect(max).toBeLessThan(BPM_MAX);
    expect(clampBpm(BPM_MAX, 20)).toBe(max);
  });

  it("falls back rather than propagating a non-finite calibration", () => {
    // Math.min/max pass NaN straight through, which would then reach the
    // engine as a NaN speed and stop the scroll dead.
    expect(clampCharsPerBeat(Number.NaN)).toBe(DEFAULT_CHARS_PER_BEAT);
    expect(clampCharsPerBeat(Number.POSITIVE_INFINITY)).toBe(DEFAULT_CHARS_PER_BEAT);
    expect(clampCharsPerBeat(0)).toBe(CHARS_PER_BEAT_MIN);
    expect(clampCharsPerBeat(1e9)).toBe(CHARS_PER_BEAT_MAX);
    expect(Number.isFinite(speedFromBpm(120, Number.NaN))).toBe(true);
  });
});

describe("tap tempo (FT-N02)", () => {
  /** Taps at a steady `ms` interval, starting at `from`. */
  const evenTaps = (ms: number, count: number, from = 1000) =>
    Array.from({ length: count }, (_, i) => from + i * ms);

  it("says nothing until there are two intervals to compare", () => {
    expect(tapBpm([])).toBeNull();
    expect(tapBpm([1000])).toBeNull();
    expect(tapBpm([1000, 1500])).toBeNull();
    expect(tapBpm([1000, 1500, 2000])).toBe(120);
  });

  it("reads a steady tap as its tempo", () => {
    expect(tapBpm(evenTaps(500, 8))).toBe(120);
    expect(tapBpm(evenTaps(1000, 5))).toBe(60);
    expect(tapBpm(evenTaps(300, 6))).toBe(200);
  });

  /**
   * The reason it is a median and not a mean. Nobody taps evenly, and one
   * fumble is one bad interval — a median steps over it, where a mean folds
   * half of it into the answer and reports a tempo the user did not tap.
   */
  it("ignores a single fumbled tap instead of averaging it in", () => {
    // Steady 120 BPM, with one tap landing very late and the next catching up.
    const taps = [0, 500, 1000, 1500, 2400, 2500, 3000, 3500, 4000];
    expect(tapBpm(taps)).toBe(120);
  });

  it("starts a new session after a long gap, rather than averaging across it", () => {
    const first = evenTaps(500, 4, 0); // 120 BPM
    const gap = first[first.length - 1] + TAP_RESET_MS + 1;
    const second = evenTaps(300, 4, gap); // 200 BPM
    expect(tapSession([...first, ...second])).toEqual(second);
    expect(tapBpm([...first, ...second])).toBe(200);
  });

  it("keeps a run whose gaps are all inside the reset window", () => {
    const taps = evenTaps(TAP_RESET_MS - 1, 4);
    expect(tapSession(taps)).toEqual(taps);
  });
});

describe("calibration (FT-N02) — ROADMAP open question 4", () => {
  it("derives chars-per-beat from a delivery actually measured", () => {
    // 14 chars/sec performed against 120 BPM: 14 * 60 / 120 = 7 chars a beat.
    expect(charsPerBeatFrom(14, 120)).toBeCloseTo(7, 10);
    // The identity that makes it a calibration at all: measuring a delivery
    // and then converting back returns the speed it was measured at.
    const cpb = charsPerBeatFrom(9, 150);
    expect(speedFromBpm(150, cpb)).toBeCloseTo(9, 10);
  });

  it("refuses a nonsensical tempo instead of returning Infinity", () => {
    expect(charsPerBeatFrom(12, 0)).toBe(DEFAULT_CHARS_PER_BEAT);
    expect(charsPerBeatFrom(12, -60)).toBe(DEFAULT_CHARS_PER_BEAT);
    expect(charsPerBeatFrom(12, Number.NaN)).toBe(DEFAULT_CHARS_PER_BEAT);
  });
});

describe("bars and beats (FT-N04)", () => {
  it("counts bars and beats from 1, the way a musician does", () => {
    const bpm = 120; // half a second a beat
    expect(barBeat(0, bpm, 4)).toEqual({ bar: 1, beat: 1, countIn: 0 });
    expect(barBeat(0.5, bpm, 4)).toEqual({ bar: 1, beat: 2, countIn: 0 });
    expect(barBeat(1.5, bpm, 4)).toEqual({ bar: 1, beat: 4, countIn: 0 });
    expect(barBeat(2.0, bpm, 4)).toEqual({ bar: 2, beat: 1, countIn: 0 });
    expect(barBeat(4.0, bpm, 4)).toEqual({ bar: 3, beat: 1, countIn: 0 });
  });

  it("honours the bar length", () => {
    expect(barBeat(1.5, 120, 3)).toEqual({ bar: 2, beat: 1, countIn: 0 });
    expect(clampBeatsPerBar(0)).toBe(2);
    expect(clampBeatsPerBar(99)).toBe(12);
    expect(clampBeatsPerBar(Number.NaN)).toBe(DEFAULT_BEATS_PER_BAR);
  });

  /**
   * Before the scroll moves, elapsed time is negative — that is the pre-roll
   * countdown, which doubles as the metronome's count-in. It must read as a
   * count DOWN to the downbeat, never as "bar -1 beat -3", and `%` on a
   * negative in JavaScript returns a negative, so this is exactly where a
   * naive implementation produces one.
   */
  it("reports the pre-roll as a count-in, never as a negative bar", () => {
    expect(barBeat(-0.25, 120, 4)).toEqual({ bar: 0, beat: 0, countIn: 1 });
    expect(barBeat(-1.75, 120, 4)).toEqual({ bar: 0, beat: 0, countIn: 4 });
    // The instant the read starts is the downbeat, not the last count-in beat.
    expect(barBeat(0, 120, 4).countIn).toBe(0);
  });

  it("puts bar lines on real bar boundaries", () => {
    // 120 BPM in 4/4 = a bar every 2 seconds.
    expect(barLineTimes(9, 120, 4, 100)).toEqual([2, 4, 6, 8]);
    expect(barLineTimes(0, 120, 4, 100)).toEqual([]);
    expect(barLineTimes(1, 120, 4, 100)).toEqual([]);
  });

  /**
   * A ten-minute read at 250 BPM is 625 bars, which is a solid block of ink on
   * a seek bar. Thinning by an integer stride keeps every drawn line on a real
   * bar; truncating at `maxLines` instead would quietly claim the read ends
   * partway along.
   */
  it("thins dense bar lines by a stride instead of truncating them", () => {
    const totalSec = 600;
    const lines = barLineTimes(totalSec, 250, 4, 40);
    expect(lines.length).toBeLessThanOrEqual(40);
    // Still real bars: every line is a whole number of bars from the start.
    const barSec = beatSeconds(250) * 4;
    for (const t of lines) {
      expect(Math.abs(t / barSec - Math.round(t / barSec))).toBeLessThan(1e-9);
    }
    // And it still covers the read rather than stopping partway.
    expect(lines[lines.length - 1]).toBeGreaterThan(totalSec * 0.9);
  });
});

describe("the metronome's schedule (FT-N03)", () => {
  /**
   * **The no-drift proof the Phase A DoD asks for.**
   *
   * Every click is computed from the beat INDEX against a fixed pair of
   * anchors, so the error in the last click of a long read is one rounding of
   * one multiplication — not a rounding per beat added up. A scheduler written
   * as `next += 60 / bpm` accumulates instead, and against a scroll doing the
   * arithmetic the other way that is audible.
   *
   * Measured here over ten minutes at the fastest tempo the app offers — 250
   * BPM, so 2500 beats — against the exact rational answer.
   */
  it("does not drift across a ten-minute read at the fastest tempo", () => {
    const bpm = 250;
    const beats = 2500; // 10 minutes
    const anchorAudio = 1234.5;
    const anchorRead = 0;
    let worst = 0;
    for (let i = 0; i <= beats; i++) {
      const exact = anchorAudio + (i * 60) / bpm;
      worst = Math.max(worst, Math.abs(beatAudioTime(i, bpm, anchorAudio, anchorRead) - exact));
    }
    // A microsecond is four orders of magnitude below anything audible; the
    // accumulating alternative reaches milliseconds over the same span.
    expect(worst).toBeLessThan(1e-6);

    // And the same, stated as the thing that actually matters: the last click
    // of the read lands on the second the scroll says it should.
    const last = beatAudioTime(beats, bpm, anchorAudio, anchorRead) - anchorAudio;
    expect(last).toBeCloseTo(600, 9);
  });

  it("schedules the count-in before the downbeat", () => {
    // Anchored mid-pre-roll: the read has -2s on the clock, so beat 0 is two
    // seconds of audio time away and the count-in beats come before it.
    const t0 = beatAudioTime(0, 120, 100, -2);
    expect(t0).toBeCloseTo(102, 9);
    expect(beatAudioTime(-1, 120, 100, -2)).toBeCloseTo(101.5, 9);
    expect(beatAudioTime(-4, 120, 100, -2)).toBeCloseTo(100, 9);
  });

  it("keeps the click on the read's clock after a seek", () => {
    // Anchored at 30s into the read: beat 0 is 30 seconds BEHIND the anchor,
    // so the next click is the one the script's position calls for, not a
    // restart of the count from wherever the pointer landed.
    const anchorAudio = 500;
    const readAt = 30;
    const beat = Math.ceil(readAt / beatSeconds(120));
    expect(beatAudioTime(beat, 120, anchorAudio, readAt)).toBeGreaterThanOrEqual(anchorAudio);
    expect(beatAudioTime(beat, 120, anchorAudio, readAt)).toBeLessThan(
      anchorAudio + beatSeconds(120),
    );
  });
});
