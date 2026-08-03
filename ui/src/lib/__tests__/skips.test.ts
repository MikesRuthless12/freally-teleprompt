import { describe, expect, it } from "vitest";

import {
  CAESURA_DEFAULT_SECS,
  liveOffset,
  parseCaesuras,
  parseSkips,
  timeAtOffset,
  timedRegions,
  visibleChars,
} from "../caesura";

/**
 * FT-M02 — labels you read but do not perform.
 *
 * The parity suite for this lives in `src-tauri/src/teleprompter.rs`, the same
 * way the caesura suite does: both sides implement the SAME matcher, and if
 * they drift, the preview and the projector drift with them.
 */

const WORDS = ["Chorus", "Verse", "Bridge"];

describe("parseSkips — which characters cost no time", () => {
  it("skips a whole line that is nothing but a label", () => {
    const script = "Chorus";
    expect(parseSkips(script, WORDS)).toEqual([{ pos: 0, width: 6 }]);
  });

  it("sees through the decoration people actually write labels in", () => {
    for (const line of ["[Verse 1]", "## Bridge", "Chorus:", "(chorus)", "  Verse 12  "]) {
      const skips = parseSkips(line, WORDS);
      expect(skips, line).toHaveLength(1);
      // The WHOLE line goes, brackets and number included — they are decoration
      // on something nobody performs.
      expect(skips[0], line).toEqual({ pos: 0, width: Array.from(line).length });
    }
  });

  /**
   * The case the automatic rule exists for. "back to the chorus now" is a
   * lyric; skipping the whole line would take three sung words out of the
   * timing and put the song out by that much.
   */
  it("skips only the word when the line is a real lyric", () => {
    const script = "and back to the chorus now";
    expect(parseSkips(script, WORDS)).toEqual([{ pos: 16, width: 6 }]);
  });

  it("matches whole words only", () => {
    // `versed` is not `verse`, and `chorusing` is not `chorus`.
    expect(parseSkips("well versed in chorusing", WORDS)).toEqual([]);
  });

  /**
   * The word-boundary test has to mean what Rust's `char::is_alphanumeric()`
   * means, which is the Unicode **Alphabetic** property — strictly wider than
   * category `L`. A combining vowel sign is Alphabetic but not a Letter, so
   * with `\p{L}` this side treated one as a boundary and Rust did not, and the
   * two surfaces skipped different characters of the same script.
   */
  it("treats a combining mark as part of a word, as Rust does", () => {
    // U+093F DEVANAGARI VOWEL SIGN I directly after the keyword.
    expect(parseSkips("verseि", ["verse"])).toEqual([]);
    // A space after it is still a boundary, so the ordinary case is unchanged.
    expect(parseSkips("verse two", ["verse"])).toEqual([{ pos: 0, width: 5 }]);
  });

  it("is case-insensitive both ways round", () => {
    expect(parseSkips("CHORUS", WORDS)).toHaveLength(1);
    expect(parseSkips("Chorus", ["chorus"])).toHaveLength(1);
  });

  /**
   * Parity with the Rust twin, on the one input where naive lowercasing
   * diverges. `İ` (U+0130) lowercases to TWO code points, which would slide
   * every index after it — so both sides leave such a line's word-matching
   * alone rather than reporting a run at the wrong offset.
   *
   * The whole-line branch is unaffected: it compares strings, not indices.
   */
  it("leaves a line alone where lowercasing would widen a character", () => {
    // A keyword really is present, and is still not matched — deliberately.
    expect(parseSkips("İstanbul chorus tonight", WORDS)).toEqual([]);
    // The same line without the widening character matches as normal.
    expect(parseSkips("Istanbul chorus tonight", WORDS)).toEqual([{ pos: 9, width: 6 }]);
    // And a bare label containing one is still a bare label.
    expect(parseSkips("İ", ["İ"])).toEqual([{ pos: 0, width: 1 }]);
  });

  it("does nothing at all with no keywords", () => {
    expect(parseSkips("Chorus\nVerse", [])).toEqual([]);
    expect(parseSkips("Chorus", ["", "   "])).toEqual([]);
  });

  /**
   * **A hostile script must not be able to freeze the app.**
   *
   * The label test used to strip a trailing number with `/[ \t]*\d+$/`, which
   * backtracks catastrophically on a long whitespace run that does not end in
   * a digit: the engine retries the star from every position and rewinds the
   * whole run each time. At the app's own 200,000-character script cap one
   * call took **14 seconds**, and this runs per line, per surface, per
   * keystroke — so a plain `.txt` someone was handed would lock the window on
   * every key pressed. It is a backwards scan now.
   *
   * The bound is deliberately loose. What is being caught is a quadratic
   * blow-up measured in seconds, not a regression of a few milliseconds, and a
   * tight bound on a shared CI runner is a flaky test.
   */
  it("cannot be frozen by a long whitespace run", () => {
    const hostile = `a${" ".repeat(200_000)}a`;
    const started = performance.now();
    expect(parseSkips(hostile, WORDS)).toEqual([]);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  /** The same shape, through the entry point the surfaces actually call. */
  it("cannot be frozen by a script full of labels and holds", () => {
    // 22,000 caesuras and 22,000 labels — the overlap filter was O(n×m) here.
    const hostile = "Chorus\nhold -- on\n".repeat(11_000);
    const started = performance.now();
    const { regions } = timedRegions(hostile, CAESURA_DEFAULT_SECS, WORDS);
    expect(regions.length).toBeGreaterThan(20_000);
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it("indexes across lines in visible chars, newlines excluded", () => {
    // "one" (3) + "Chorus" (6) + "two" (3)
    const script = "one\nChorus\ntwo";
    expect(parseSkips(script, WORDS)).toEqual([{ pos: 3, width: 6 }]);
    expect(visibleChars(script)).toBe(12);
  });

  it("merges two keywords that mark the same text", () => {
    // Both `Verse` and `Verse 1` are configured; the runs overlap and must come
    // back as one, or the timing loop would walk a pair that overlaps.
    const script = "sing the verse 1 line";
    const skips = parseSkips(script, ["verse", "verse 1"]);
    for (let i = 1; i < skips.length; i++) {
      expect(skips[i].pos).toBeGreaterThanOrEqual(skips[i - 1].pos + skips[i - 1].width);
    }
  });

  /**
   * The one divergence a 6,000-case differential fuzz against the Rust twin
   * found, and it is reachable: Windows Notepad still writes "UTF-8 with BOM",
   * and a byte-order mark is whitespace to `String.trim` but NOT to Rust's
   * `str::trim`. U+0085 is the same story the other way round. Both are in
   * `LABEL_DECORATION` now, so they are stripped before either side's trim.
   */
  it("sees a label through a byte-order mark or a next-line character", () => {
    const BOM = String.fromCharCode(0xfeff);
    const NEL = String.fromCharCode(0x85);
    expect(parseSkips(`${BOM}Chorus`, WORDS)).toEqual([{ pos: 0, width: 7 }]);
    expect(parseSkips(`${NEL}Chorus,`, WORDS)).toEqual([{ pos: 0, width: 8 }]);
    expect(parseSkips(`${BOM}Verse 1${NEL}`, WORDS)).toEqual([{ pos: 0, width: 9 }]);
  });

  it("leaves a caesura's dashes alone when they trail a label", () => {
    // Dashes are not decoration: stripping them would make `Chorus --` look
    // like a bare label and silently swallow a pause the writer asked for.
    expect(parseSkips("Chorus --", WORDS)).toEqual([{ pos: 0, width: 6 }]);
  });
});

describe("timedRegions — skips cost nothing, holds still cost", () => {
  it("takes a skipped label out of the read time entirely", () => {
    const script = "one two\nChorus\nthree four";
    const withWords = timedRegions(script, CAESURA_DEFAULT_SECS, WORDS).regions;
    const without = timedRegions(script, CAESURA_DEFAULT_SECS, []).regions;
    const total = visibleChars(script);
    // Six characters of label, at ten a second, is the 0.6s that comes off.
    expect(timeAtOffset(total, 10, without) - timeAtOffset(total, 10, withWords)).toBeCloseTo(
      0.6,
      9,
    );
  });

  it("crosses a skipped run in no time at all", () => {
    const script = "ab\nChorus\ncd";
    const { regions } = timedRegions(script, CAESURA_DEFAULT_SECS, WORDS);
    // Reaching the label and reaching the far side of it are the same instant.
    expect(timeAtOffset(2, 10, regions)).toBeCloseTo(timeAtOffset(8, 10, regions), 9);
    // And the scroll steps straight over it rather than dwelling inside.
    const atLabel = timeAtOffset(2, 10, regions);
    expect(liveOffset(0, atLabel + 1e-6, 10, regions)).toBeGreaterThanOrEqual(8);
  });

  it("keeps caesura holds that are not inside a skip", () => {
    const script = "one -- two\nChorus";
    const { regions } = timedRegions(script, 2, WORDS);
    const total = visibleChars(script);
    // The two-second hold survives; only the label's own characters go.
    expect(timeAtOffset(total, 10, regions)).toBeGreaterThan(2);
  });

  it("drops a caesura written inside a skipped label", () => {
    // The label costs no time, so a pause inside it is a pause inside
    // something nobody performs. Overlapping regions would also break the
    // timing loop, which walks them in order assuming they do not.
    const { regions } = timedRegions("go -- on\n--", 5, ["--"]);
    for (let i = 1; i < regions.length; i++) {
      expect(regions[i].pos).toBeGreaterThanOrEqual(regions[i - 1].pos + regions[i - 1].width);
    }
  });

  it("is exactly parseCaesuras when no keywords are configured", () => {
    const script = "hold -- here and --2 there";
    const { regions, skips } = timedRegions(script, CAESURA_DEFAULT_SECS, []);
    // Not a self-comparison: the whole claim is that the new entry point is the
    // OLD one when the feature is switched off, which is what every existing
    // install is.
    expect(regions).toEqual(parseCaesuras(script, CAESURA_DEFAULT_SECS));
    expect(skips).toEqual([]);
  });

  /**
   * `skips` cannot be recovered from `regions` by looking for `dur === 0`, and
   * this is the case that proves it: ` --0 ` is a real caesura the writer
   * asked for. Recovering the label runs that way would dim it on screen and
   * silence it in read-aloud — which is why `timedRegions` returns both.
   */
  it("does not confuse a written --0 hold with a label", () => {
    const { regions, skips } = timedRegions("go --0 on", CAESURA_DEFAULT_SECS, WORDS);
    expect(skips).toEqual([]);
    expect(regions).toHaveLength(1);
    expect(regions[0].dur).toBe(0);
  });

  /** The property every surface rests on, restated with skips in the mix: the
   * counter under the prompter is still the exact inverse of the animation. */
  it("keeps the counter exact across a script full of skips and holds", () => {
    const script = [
      "[Verse 1]",
      "I woke up -- this morning",
      "",
      "Chorus",
      "hold me --2 closer",
    ].join("\n");
    const { regions, skips } = timedRegions(script, CAESURA_DEFAULT_SECS, WORDS);
    const total = visibleChars(script);
    let worst = 0;
    for (let target = 0; target <= total; target += 0.05) {
      const seconds = timeAtOffset(target, 11, regions);
      const back = liveOffset(0, seconds, 11, regions);
      // Inside a skipped run every position shares one instant, so the inverse
      // lands at the run's far end rather than back where it started. That is
      // the correct answer, not an error — the read really is at the end of a
      // region it crossed in no time.
      const inSkip = skips.some((s) => target > s.pos && target < s.pos + s.width);
      if (!inSkip) worst = Math.max(worst, Math.abs(back - target));
    }
    expect(worst).toBeLessThan(1e-9);
  });
});
