import { describe, expect, it } from "vitest";

import {
  CAESURA_DEFAULT_SECS,
  liveOffset,
  parseCaesuras,
  timeAtOffset,
  visibleChars,
} from "../caesura";

/**
 * The parity suite for FT-02's standing invariant: this file and
 * `src-tauri/src/teleprompter.rs` implement the SAME parser and the SAME
 * `offset(elapsed)` function. If they drift, the preview and the projector
 * drift, which is the one bug this architecture exists to prevent.
 *
 * Every case in `parses_inline_caesuras` below is ported one-for-one from the
 * Rust test of the same name. Change one suite, change the other.
 */
describe("parseCaesuras — ported case-for-case from the Rust suite", () => {
  const d = CAESURA_DEFAULT_SECS;

  it("finds a bare caesura at the right visible-char position", () => {
    const cs = parseCaesuras("aaaaa -- bbbbb", d);
    expect(cs).toHaveLength(1);
    // "aaaaa " = 6 visible chars, so the first dash is at visible index 6.
    expect(Math.abs(cs[0].pos - 6)).toBeLessThan(1e-4);
    expect(Math.abs(cs[0].dur - d)).toBeLessThan(1e-6);
    expect(cs[0].width).toBe(2);
  });

  it("lets a trailing number override the default duration", () => {
    expect(Math.abs(parseCaesuras("go --2 stop", d)[0].dur - 2)).toBeLessThan(1e-6);
    expect(Math.abs(parseCaesuras("go --0.5 stop", d)[0].dur - 0.5)).toBeLessThan(1e-6);
  });

  it("gives a bare caesura whatever default it is handed", () => {
    expect(Math.abs(parseCaesuras("a -- b", 1.5)[0].dur - 1.5)).toBeLessThan(1e-6);
  });

  it("does NOT match bullets, hyphenated words, three dashes, or unfenced dashes", () => {
    expect(parseCaesuras("- a bullet line", d)).toHaveLength(0);
    expect(parseCaesuras("well-known term", d)).toHaveLength(0);
    expect(parseCaesuras("a --- b", d)).toHaveLength(0);
    expect(parseCaesuras("a--b", d)).toHaveLength(0);
  });

  it("treats line edges as a fence and indexes globally across newlines", () => {
    const cs = parseCaesuras("-- first\nlast --", d);
    expect(cs).toHaveLength(2);
    // Global visible-char indices (the newline is not counted): "-- first" is
    // 8 visible chars (0..7), then "last " → the second "--" starts at 13.
    expect(Math.floor(cs[0].pos)).toBe(0);
    expect(Math.floor(cs[1].pos)).toBe(13);
  });

  it("clamps an absurd duration the way the Rust CAESURA_MAX_SECS does", () => {
    expect(parseCaesuras("a --999 b", d)[0].dur).toBe(30);
  });

  /**
   * These inputs USED to diverge between the twins, silently — the two surfaces
   * dwelled for different lengths on the same token and drifted apart, which is
   * exactly what the twin invariant exists to prevent.
   *
   *   `--2.5.3` → JS `parseFloat` prefix-parsed 2.5; Rust rejected it (0.75).
   *   41 digits → f64 stayed finite and clamped to 30; f32 saturated to inf
   *               and fell back to 0.75.
   *
   * Both are now excluded by the scanner on BOTH sides, so neither language
   * ever parses them. The matching Rust cases live in
   * `teleprompter.rs::parses_inline_caesuras`.
   */
  it("rejects a multi-dot number instead of prefix-parsing it", () => {
    expect(parseCaesuras("a --2.5.3 b", d)).toHaveLength(0);
    expect(parseCaesuras("a --1..2 b", d)).toHaveLength(0);
    expect(parseCaesuras("a --0.5. b", d)).toHaveLength(0);
  });

  it("rejects a numeric field longer than the shared cap", () => {
    expect(parseCaesuras(`a --${"9".repeat(41)} b`, d)).toHaveLength(0);
    // Exactly at the cap is still a caesura, and still clamps to the max.
    expect(parseCaesuras("a --12345678 b", d)).toHaveLength(1);
    expect(parseCaesuras("a --12345678 b", d)[0].dur).toBe(30);
    // One over the cap is not.
    expect(parseCaesuras("a --123456789 b", d)).toHaveLength(0);
  });
});

describe("visibleChars", () => {
  it("excludes newlines, matching the Rust total_chars", () => {
    expect(visibleChars("abc")).toBe(3);
    expect(visibleChars("ab\ncd")).toBe(4);
    expect(visibleChars("")).toBe(0);
    // Rust counts `char`s, so astral characters count once, not twice.
    expect(visibleChars("a\u{1F600}b")).toBe(3);
  });
});

describe("liveOffset — the mirror of Rust Inner::offset", () => {
  it("returns the base for a non-positive elapsed", () => {
    expect(liveOffset(5, 0, 10, [])).toBe(5);
    expect(liveOffset(5, -1, 10, [])).toBe(5);
  });

  it("advances at exactly speed x elapsed with no caesuras", () => {
    expect(liveOffset(0, 2, 10, [])).toBeCloseTo(20, 10);
    expect(liveOffset(5, 1.5, 4, [])).toBeCloseTo(11, 10);
  });

  it("dwells across a caesura, so the same wall-time reaches a lower offset", () => {
    const script = "aaaaaaaa --2 bbbbbbbb";
    const cs = parseCaesuras(script, CAESURA_DEFAULT_SECS);
    const plain = liveOffset(0, 0.3, 40, []);
    const withPause = liveOffset(0, 0.3, 40, cs);
    expect(withPause).toBeLessThan(plain);
  });

  it("crawls the two dashes over exactly the caesura's duration", () => {
    // One caesura at 10, 2 chars wide, 1s long, at 1000 chars/sec: the approach
    // costs 0.01s, then the crawl takes the full second regardless of speed.
    const cs = [{ pos: 10, width: 2, dur: 1 }];
    expect(liveOffset(0, 0.01, 1000, cs)).toBeCloseTo(10, 6);
    // Halfway through the crawl → halfway across the two dashes.
    expect(liveOffset(0, 0.51, 1000, cs)).toBeCloseTo(11, 6);
    // Crawl finished → past the caesura, then racing again at full speed.
    expect(liveOffset(0, 1.01, 1000, cs)).toBeCloseTo(12, 6);
  });

  it("skips caesuras that are already behind the base offset", () => {
    const cs = [{ pos: 0, width: 2, dur: 5 }];
    // Starting past the caesura must not re-pay its pause.
    expect(liveOffset(2, 1, 10, cs)).toBeCloseTo(12, 10);
  });

  it("guards a zero speed the way the Rust max(1e-4) does", () => {
    expect(Number.isFinite(liveOffset(0, 1, 0, []))).toBe(true);
  });
});

describe("timeAtOffset — the seek bar's timestamp axis", () => {
  it("is plain distance/speed with no caesuras", () => {
    expect(timeAtOffset(20, 10, [])).toBeCloseTo(2, 10);
  });

  it("adds each caesura pause crossed along the way", () => {
    const cs = [{ pos: 10, width: 2, dur: 1 }];
    // 10 chars at 10/sec = 1s, then the full 1s crawl, then 8 more chars.
    expect(timeAtOffset(20, 10, cs)).toBeCloseTo(1 + 1 + 0.8, 6);
  });

  it("is the inverse of liveOffset, which is what keeps the seek bar honest", () => {
    const cs = parseCaesuras("hello -- world -- again", CAESURA_DEFAULT_SECS);
    for (const target of [0, 3, 7, 12, 18]) {
      const seconds = timeAtOffset(target, 9, cs);
      expect(liveOffset(0, seconds, 9, cs)).toBeCloseTo(target, 6);
    }
  });
});
