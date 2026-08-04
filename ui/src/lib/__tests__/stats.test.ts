import { describe, expect, it } from "vitest";

import { LONG_LINE_CHARS, scriptStats } from "../stats";

/** Script statistics (FT-M03). */
describe("scriptStats", () => {
  it("counts words and visible characters", () => {
    const stats = scriptStats("one two three\nfour");
    expect(stats.words).toBe(4);
    // Newlines are not visible characters — the scroll engine's own unit.
    expect(stats.chars).toBe("one two threefour".length);
  });

  it("counts nothing where there is nothing", () => {
    expect(scriptStats("")).toMatchObject({ words: 0, chars: 0, longestLine: 0 });
    // A whitespace-only script has no words but it does have characters, and
    // the scroll takes real time to cross them — so saying zero would put a
    // count beside a duration that disagreed with it.
    expect(scriptStats("   \n  ")).toMatchObject({ words: 0, chars: 5 });
  });

  /**
   * A caesura is an instruction to the scroll, not a word. Counting one would
   * put a word count beside a duration that correctly ignores it, on the same
   * line of the same footer.
   */
  it("does not count a caesura as a word or as characters", () => {
    const stats = scriptStats("hold -- on");
    expect(stats.words).toBe(2);
    expect(stats.chars).toBe("hold  on".length);
  });

  /** ...including its digits: ` --2.5 ` is no more a word than ` -- ` is. */
  it("does not count a timed caesura's digits either", () => {
    expect(scriptStats("hold --2.5 on").words).toBe(2);
    expect(scriptStats("hold --2.5 on").chars).toBe("hold  on".length);
  });

  /**
   * ⚠️ A caesura's digits are counted in the SOURCE, not in a newline-free copy
   * of it. Proven red against the first version, which scanned the visible
   * characters — where the line break here does not exist, so the `5` that
   * begins the next line looked like part of ` --5 ` and was eaten out of the
   * script: two words instead of three, and one character short.
   */
  it("does not mistake the next line's first digit for a caesura's", () => {
    const stats = scriptStats("a --\n5 b");
    expect(stats.words).toBe(3);
    expect(stats.chars).toBe("a 5 b".length);
  });

  /** A skipped label is seen and not performed (FT-M02), so it is not in the
   * count of what there is to perform. */
  it("does not count skipped labels", () => {
    const script = "Chorus\nsing the words";
    expect(scriptStats(script, ["Chorus"]).words).toBe(3);
    // With no keywords configured it is ordinary lyric text and does count.
    expect(scriptStats(script).words).toBe(4);
  });

  /** A caesura written inside a label is inside a run that costs no time — and
   * splicing the two out separately would take a character of real script with
   * them. */
  it("survives a caesura that overlaps a skipped label", () => {
    const stats = scriptStats("Verse -- one\nwords", ["Verse"]);
    expect(stats.chars).toBe(scriptStats("Verse -- one\nwords", ["Verse"]).chars);
    expect(stats.words).toBe(2);
  });

  describe("the longest line", () => {
    it("measures the raw script, labels included", () => {
      const stats = scriptStats("short\na much longer line here\nmid");
      expect(stats.longestLine).toBe("a much longer line here".length);
      expect(stats.longestLineNumber).toBe(2);
    });

    it("warns only past the threshold, and never refuses anything", () => {
      const ok = scriptStats("x".repeat(LONG_LINE_CHARS));
      expect(ok.longLine).toBe(false);
      const long = scriptStats("x".repeat(LONG_LINE_CHARS + 1));
      expect(long.longLine).toBe(true);
      expect(long.chars).toBe(LONG_LINE_CHARS + 1);
    });

    it("counts a line in characters, not UTF-16 units", () => {
      // Four astral characters are eight UTF-16 units and four columns.
      expect(scriptStats("😀😀😀😀").longestLine).toBe(4);
    });
  });

  /** Most of the 18 languages this app ships in put spaces between words; the
   * few that do not have no answer a prompter could give without a segmenter
   * per language, and a confidently wrong number is worse than a plain one. */
  it("counts runs between whitespace, whatever the script", () => {
    expect(scriptStats("  leading and trailing  ").words).toBe(3);
    expect(scriptStats("привет мир").words).toBe(2);
    expect(scriptStats("one\n\ntwo").words).toBe(2);
  });
});
