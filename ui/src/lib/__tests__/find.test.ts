import { describe, expect, it } from "vitest";

import {
  findMatches,
  matchContext,
  matchNearest,
  replaceAll,
  replaceMatch,
  stepMatch,
} from "../find";

const plain = { caseSensitive: false, wholeWord: false };

/** Find & replace (FT-M07). */
describe("findMatches", () => {
  it("finds every occurrence, case-insensitively by default", () => {
    expect(findMatches("Cat cat CAT", "cat", plain)).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
      { start: 8, end: 11 },
    ]);
  });

  it("respects case when asked", () => {
    expect(findMatches("Cat cat", "cat", { caseSensitive: true, wholeWord: false })).toEqual([
      { start: 4, end: 7 },
    ]);
  });

  it("matches whole words only when asked", () => {
    const script = "cat cats concat";
    expect(findMatches(script, "cat", plain)).toHaveLength(3);
    expect(findMatches(script, "cat", { caseSensitive: false, wholeWord: true })).toEqual([
      { start: 0, end: 3 },
    ]);
  });

  it("gives nothing for an empty query", () => {
    expect(findMatches("anything", "", plain)).toEqual([]);
  });

  /** Non-overlapping, which is what makes replace-all's count equal the number
   * of replacements it actually performs. */
  it("does not report overlapping matches", () => {
    expect(findMatches("aaaa", "aa", plain)).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });

  /**
   * ⚠️ Offsets are STRING indices, and an astral character is two UTF-16 units
   * while `Array.from` gives it one entry. A match reported in code points
   * would replace the wrong characters of any script containing an emoji.
   */
  it("reports string indices, so a replacement lands where it was found", () => {
    const script = "😀 target";
    const [match] = findMatches(script, "target", plain);
    expect(script.slice(match.start, match.end)).toBe("target");
    expect(replaceMatch(script, match, "x")).toBe("😀 x");
  });

  /**
   * ⚠️ The case-folding trap FT-M02's twin already paid for, from the other
   * side: `İ` lowercases to TWO code points. Folding the whole string would
   * slide every index after it — and here an index is where an edit is about to
   * be written, so a slid index eats the wrong letter out of the script.
   * A missed match is the price; a wrong offset is not acceptable.
   */
  it("keeps offsets exact across a character that widens when lowercased", () => {
    const script = "İstanbul and target";
    const [match] = findMatches(script, "target", plain);
    expect(script.slice(match.start, match.end)).toBe("target");
  });

  /** The query comes from a text field and this runs on every keystroke over a
   * script of up to 200,000 characters, so it must not be a regex — both
   * because the operator's punctuation is not syntax, and because a regex over
   * user input is the exact shape that froze this app for fourteen seconds
   * once already. */
  it("treats the query as text, never as a pattern", () => {
    expect(findMatches("a.c abc", ".", plain)).toEqual([{ start: 1, end: 2 }]);
    expect(findMatches("cost is $5 (net)", "$5 (net)", plain)).toHaveLength(1);
    // A pathological query against a pathological script, which a backtracking
    // engine would not return from.
    const script = "a".repeat(50_000);
    expect(findMatches(script, `${"a".repeat(1000)}b`, plain)).toEqual([]);
  });
});

describe("replaceAll", () => {
  it("replaces every match and counts them", () => {
    expect(replaceAll("cat cat", "cat", "dog", plain)).toEqual({ text: "dog dog", count: 2 });
  });

  /** Built from the ORIGINAL matches in one pass: replacing and re-searching
   * would find the replacement itself and never terminate. */
  it("terminates when the replacement contains the query", () => {
    expect(replaceAll("cat", "cat", "cats", plain)).toEqual({ text: "cats", count: 1 });
  });

  it("leaves the script alone when nothing matches", () => {
    expect(replaceAll("cat", "dog", "x", plain)).toEqual({ text: "cat", count: 0 });
  });

  it("can delete, by replacing with nothing", () => {
    expect(replaceAll("a-b-c", "-", "", plain)).toEqual({ text: "abc", count: 2 });
  });
});

describe("moving between matches", () => {
  /** Wrapping rather than stopping: a find that stops at the last match makes
   * the operator work out where they are before they can carry on. */
  it("wraps at both ends", () => {
    expect(stepMatch(3, 2, 1)).toBe(0);
    expect(stepMatch(3, 0, -1)).toBe(2);
    expect(stepMatch(0, 0, 1)).toBe(0);
  });

  /** An edit above the current hit must not throw the operator back to the top
   * of the script. */
  it("re-anchors on the match at or after where it was", () => {
    const matches = findMatches("cat cat cat", "cat", plain);
    expect(matchNearest(matches, 4)).toBe(1);
    expect(matchNearest(matches, 0)).toBe(0);
    expect(matchNearest(matches, 999)).toBe(0);
  });

  it("shows a match in context, on one line", () => {
    const script = "line one\nthe target here\nline three";
    const [match] = findMatches(script, "target", plain);
    const context = matchContext(script, match, 6);
    expect(context.text).not.toContain("\n");
    expect(context.text.slice(context.start, context.end)).toBe("target");
  });
});
