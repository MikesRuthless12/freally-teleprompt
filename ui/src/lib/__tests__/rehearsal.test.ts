import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseCaesuras, timeAtOffset } from "../caesura";
import {
  PACE_WARN_SEC,
  type Sample,
  crossedAt,
  paceDrift,
  sections,
  suggestedSpeed,
  timings,
} from "../rehearsal";

/**
 * FT-N01's arithmetic, and the charter promise underneath it.
 */

describe("sections — the script's own paragraphs", () => {
  it("splits on blank lines, in visible-char offsets", () => {
    const script = ["first line", "still the first", "", "second part"].join("\n");
    const parts = sections(script);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ index: 0, label: "first line", start: 0 });
    // "first line" (10) + "still the first" (15) = 25 visible chars; newlines
    // are not counted, matching the engine's scroll unit.
    expect(parts[0].end).toBe(25);
    expect(parts[1]).toMatchObject({ index: 1, label: "second part", end: 36 });
    expect(parts[1].start).toBe(25);
  });

  it("ignores runs of blank lines and leading or trailing ones", () => {
    expect(sections("\n\n\nonly\n\n\n")).toHaveLength(1);
    expect(sections("a\n\n\n\nb")).toHaveLength(2);
    // A line of spaces is blank too — a writer cannot see the difference, so
    // the app must not act on one.
    expect(sections("a\n   \nb")).toHaveLength(2);
  });

  it("has nothing to report for an empty script", () => {
    expect(sections("")).toEqual([]);
    expect(sections("\n \n")).toEqual([]);
  });

  it("labels a section by its opening line, trimmed", () => {
    const parts = sections("  Verse one begins here  \nand runs on");
    expect(parts[0].label).toBe("Verse one begins here");
  });

  /**
   * The case blank lines alone get wrong, and the reason sections take the
   * keyword list. This is how a lyric sheet is actually written — the exact
   * user FT-M02 and Phase A were built for — and under a blank-line-only rule
   * it rehearses as ONE section and reports one row.
   */
  it("starts a section at a label line, even with no blank lines at all", () => {
    const script = [
      "[Verse 1]",
      "I woke up this morning",
      "and the sky was grey",
      "[Chorus]",
      "hold me closer now",
    ].join("\n");
    const parts = sections(script, ["Verse", "Chorus"]);
    expect(parts).toHaveLength(2);
    // Named the way FT-M05's jump list names it — the brackets are decoration
    // on the marker, not part of what the section is called.
    expect(parts[0].label).toBe("Verse 1");
    expect(parts[1].label).toBe("Chorus");
    // The label's own characters belong to neither section — they cost no time,
    // so counting them in would credit a section with a span the scroll
    // crosses in an instant.
    expect(parts[0].start).toBe(9);
    expect(parts[1].start).toBe(9 + 22 + 20 + 8);
  });

  it("falls back to blank lines where the script uses no labels", () => {
    const script = ["first part", "", "second part"].join("\n");
    // Keywords are configured, but this script has none of them in it.
    expect(sections(script, ["Verse", "Chorus"])).toHaveLength(2);
  });

  /**
   * ⚠️ Proven red: one marker line used to switch the WHOLE script off the
   * blank-line rule. A prose script carrying a single `# Title` from a Markdown
   * import — or one shot-list line reading `#3 CAMERA B` — collapsed from a row
   * per paragraph to two, and the operator lost the per-paragraph timings the
   * report exists for. One marker labels a script; it does not divide it.
   */
  it("does not abandon paragraphs for a single stray marker line", () => {
    const prose = ["# Title", "", "one", "", "two", "", "three"].join("\n");
    expect(sections(prose)).toHaveLength(4);

    // Two or more, and the script really is structured by them.
    const structured = ["# One", "aaa", "# Two", "bbb"].join("\n");
    expect(sections(structured).map((s) => s.label)).toEqual(["One", "Two"]);
  });

  /**
   * ⚠️ The other side of the same rule, and a fixed threshold cannot serve
   * both. A script with NO blank lines and one heading — the shape the `.docx`
   * and Markdown importers produce — has only that heading dividing it, so
   * requiring two markers collapsed it to a single unlabelled row and lost the
   * timing for the section the operator had explicitly marked.
   */
  it("uses one marker where it is the only thing dividing the script", () => {
    // Two rows — the preamble (named by its opening line) and the marked
    // section — rather than the single unlabelled row a `>= 2` rule gave.
    const noBlanks = ["opening line", "# Part Two", "closing line"].join("\n");
    expect(sections(noBlanks).map((s) => s.label)).toEqual(["opening line", "Part Two"]);

    // Same for a lyric sheet whose only structure is one configured label.
    const lyric = ["first line", "Chorus", "sing along"].join("\n");
    expect(sections(lyric, ["Chorus"]).map((s) => s.label)).toEqual(["first line", "Chorus"]);
  });

  it("numbers its rows consecutively even where a section is declined", () => {
    // Two labels back to back: the first names a section with nothing in it.
    const parts = sections("Chorus\nVerse\nreal words here", ["Chorus", "Verse"]);
    expect(parts).toHaveLength(1);
    expect(parts.map((p) => p.index)).toEqual([0]);
    expect(parts[0].label).toBe("Verse");
  });

  /** The bounds are handed straight to `timeAtOffset`, so they have to be in
   * the same unit the engine scrolls in — this is that contract, stated. */
  it("produces bounds the timing model accepts unchanged", () => {
    const script = "one -- two\n\nthree --2 four";
    const caesuras = parseCaesuras(script, 0.75);
    for (const part of sections(script)) {
      const span = timeAtOffset(part.end, 10, caesuras) - timeAtOffset(part.start, 10, caesuras);
      expect(span).toBeGreaterThan(0);
    }
  });
});

describe("crossedAt — when the read reached a point", () => {
  const samples: Sample[] = [
    { atSec: 0, offset: 0 },
    { atSec: 1, offset: 10 },
    { atSec: 2, offset: 20 },
  ];

  it("interpolates between samples rather than stepping in lumps", () => {
    expect(crossedAt(samples, 0)).toBe(0);
    expect(crossedAt(samples, 10)).toBe(1);
    expect(crossedAt(samples, 15)).toBeCloseTo(1.5, 10);
    expect(crossedAt(samples, 20)).toBe(2);
  });

  it("says nothing for a point the read never reached", () => {
    expect(crossedAt(samples, 25)).toBeNull();
    expect(crossedAt([], 1)).toBeNull();
  });

  /**
   * A reader who scrubs back to take a line again crosses the same point
   * twice. "When did you get here" means the first time — the second is a
   * re-read, and counting it would quietly credit the section with time it
   * spent being performed properly the first time round.
   */
  it("takes the FIRST crossing when the read doubles back", () => {
    const doubled: Sample[] = [
      { atSec: 0, offset: 0 },
      { atSec: 1, offset: 10 },
      { atSec: 2, offset: 4 }, // scrubbed back
      { atSec: 3, offset: 10 },
    ];
    expect(crossedAt(doubled, 10)).toBe(1);
  });

  it("survives a stretch of samples at a standstill", () => {
    // A paused scroll samples the same offset repeatedly: the interpolation
    // must not divide by a zero span.
    const paused: Sample[] = [
      { atSec: 0, offset: 5 },
      { atSec: 1, offset: 5 },
      { atSec: 2, offset: 5 },
    ];
    expect(crossedAt(paused, 5)).toBe(0);
    expect(Number.isFinite(crossedAt(paused, 5) as number)).toBe(true);
  });
});

describe("the timing report", () => {
  const script = ["first section here", "", "second section here"].join("\n");
  const parts = sections(script);

  it("reports a read that simply ran as matching the plan", () => {
    // The scroll at 10 chars/sec, sampled as it would really advance.
    const samples: Sample[] = [];
    const total = 37; // visible chars
    for (let offset = 0; offset <= total; offset++) {
      samples.push({ atSec: offset / 10, offset });
    }
    const rows = timings(parts, samples, 10, []);
    for (const row of rows) {
      expect(row.actualSec).not.toBeNull();
      expect(row.actualSec as number).toBeCloseTo(row.estSec, 6);
    }
    // Nothing to suggest — the read was delivered at the pace it was planned.
    expect(suggestedSpeed(rows, 10)).toBeNull();
  });

  it("catches a section that ran long, and suggests a slower pace", () => {
    const total = 37;
    const samples: Sample[] = [];
    // The first section is read as planned; the second takes twice as long
    // (paused halfway through to catch up).
    for (let offset = 0; offset <= 18; offset++) samples.push({ atSec: offset / 10, offset });
    for (let offset = 19; offset <= total; offset++) {
      samples.push({ atSec: 1.8 + ((offset - 18) / 10) * 2, offset });
    }
    const rows = timings(parts, samples, 10, []);
    expect(rows[0].actualSec as number).toBeCloseTo(rows[0].estSec, 6);
    expect(rows[1].actualSec as number).toBeGreaterThan(rows[1].estSec * 1.5);

    const next = suggestedSpeed(rows, 10);
    expect(next).not.toBeNull();
    expect(next as number).toBeLessThan(10);
  });

  it("leaves a section the read never finished as unmeasured, not as zero", () => {
    // Stopped partway through the second section.
    const samples: Sample[] = [];
    for (let offset = 0; offset <= 25; offset++) samples.push({ atSec: offset / 10, offset });
    const rows = timings(parts, samples, 10, []);
    expect(rows[0].actualSec).not.toBeNull();
    expect(rows[1].actualSec).toBeNull();
    // And the suggestion is built only from what was actually completed.
    expect(suggestedSpeed(rows, 10)).toBeNull();
  });

  it("counts caesura holds in the estimate, like every other timing here", () => {
    const held = ["one -- two", "", "three"].join("\n");
    const caesuras = parseCaesuras(held, 2);
    const rows = timings(sections(held), [], 10, caesuras);
    // The first section carries a two-second hold; the second carries none.
    expect(rows[0].estSec).toBeGreaterThan(2);
    expect(rows[1].estSec).toBeLessThan(1);
  });

  it("never suggests a speed the engine would refuse", () => {
    const rows = timings(parts, [], 10, []);
    // A read so slow the naive ratio would go under the engine's floor.
    const crawl: Sample[] = [
      { atSec: 0, offset: 0 },
      { atSec: 10_000, offset: 37 },
    ];
    const next = suggestedSpeed(timings(parts, crawl, 10, []), 10);
    expect(next).not.toBeNull();
    expect(next as number).toBeGreaterThanOrEqual(1);
    expect(next as number).toBeLessThanOrEqual(60);
    expect(rows.every((r) => r.actualSec === null)).toBe(true);
  });
});

describe("pace drift (FT-N05)", () => {
  it("is zero while the read simply runs", () => {
    expect(paceDrift(12, 12)).toBe(0);
  });

  it("is positive when the read is running long", () => {
    // Twenty seconds spent to reach where the script says fifteen.
    expect(paceDrift(20, 15)).toBe(5);
    expect(paceDrift(20, 15)).toBeGreaterThan(PACE_WARN_SEC);
  });

  it("is negative when the read is ahead of the plan", () => {
    expect(paceDrift(10, 15)).toBe(-5);
  });
});

/**
 * **The Phase A DoD asks for this one by name: rehearsal must provably record
 * no audio, "asserted by test, not just by intent".**
 *
 * The honest way to assert an absence is over the source rather than over
 * behaviour — a behavioural test can only show that a microphone was not opened
 * on the paths it happened to walk. This reads the module itself and the one
 * module it imports, and fails if any audio-capture API appears in either.
 *
 * `metronome.ts` is deliberately NOT covered by this: it is an audio *output*
 * path, it has no capture in it, and conflating the two would make this test
 * fail for the wrong reason the day someone adds a click to rehearsal mode.
 */
describe("rehearsal records no audio", () => {
  const CAPTURE = [
    "getUserMedia",
    "mediaDevices",
    "MediaRecorder",
    "AudioContext",
    "createMediaStreamSource",
    "dictationStart",
    "AudioWorklet",
    "ScriptProcessor",
  ];

  it("names no audio-capture API anywhere in the rehearsal path", () => {
    // `useRehearsal.ts` is the file the recorder actually lives in — it was
    // missing from this list, which meant the assertion did not cover the
    // module it exists to protect. `useReadClock.ts` is the clock both it and
    // the counter run on.
    for (const file of ["rehearsal.ts", "useRehearsal.ts", "useReadClock.ts", "caesura.ts"]) {
      const source = readFileSync(resolve(import.meta.dirname, "..", file), "utf8");
      for (const api of CAPTURE) {
        expect(source, `${file} mentions ${api}`).not.toContain(api);
      }
    }
  });
});
