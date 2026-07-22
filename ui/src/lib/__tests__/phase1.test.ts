import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { chipLabel, isChip, normalizePaste, tokenize } from "../caesuraChips";
import { parseCaesuras, scanCaesuraAt } from "../caesura";
import { FONT_FAMILY_IDS, FONT_STACKS, fontStack } from "../fonts";
import { BPM_MAX, BPM_MIN, bpmFromSpeed, clampBpm, speedFromBpm } from "../speed";
import { fmtTime } from "../time";
import { paceToRate } from "../tts";

/**
 * The pure halves of Phase 1: the chip tokenizer (FT-11), the speed model
 * (FT-14), the typeface table (FT-15), and read-aloud's pace mapping (FT-16).
 * Everything here is DOM-free on purpose — the components that use it are
 * contenteditables and canvases of state that a unit test should not have to
 * stand up in order to check arithmetic.
 */

describe("caesura chips (FT-11)", () => {
  it("re-joining the tokens reproduces the script byte-for-byte", () => {
    for (const script of [
      "plain text with no pause",
      "hold here -- then continue",
      "hold longer --2 then continue",
      "half a beat --0.5 then continue",
      "-- at the very start",
      "at the very end --",
      "two\nlines -- with a pause",
      "",
    ]) {
      const rejoined = tokenize(script)
        .map((tok) => (isChip(tok) ? tok.chip : tok.text))
        .join("");
      expect(rejoined).toBe(script);
    }
  });

  /**
   * The contract that makes the chips honest: a chip appears exactly where the
   * scroll engine sees a caesura. If these two ever disagree, the operator is
   * shown a pause the prompter will not take (or vice versa).
   */
  it("chips appear exactly where the scroll engine parses a caesura", () => {
    for (const script of [
      "a -- b",
      "a --2 b",
      "a --- b", // three dashes: not a caesura
      "a--b", // unfenced: not a caesura
      "well-known term",
      "- a bullet line",
      "-- first\nlast --",
      "go --0.5 stop",
      // MALFORMED NUMERIC FIELDS — the cases that actually caught a bug. The
      // chip tokenizer used to carry its own scanner without the one-dot and
      // max-length bounds, so it chipped all of these while the engine skipped
      // them: the operator saw a pause the prompter would never take. The
      // well-formed cases above all agreed, which is why this went unnoticed.
      "a --2.5.3 b",
      "a --1..2 b",
      "a --0.5. b",
      `a --${"9".repeat(41)} b`,
      "a --12345678 b", // exactly at the cap: still a caesura on both sides
      "a --123456789 b", // one over: neither
    ]) {
      const chips = tokenize(script).filter(isChip).length;
      expect(chips, script).toBe(parseCaesuras(script, 0.75).length);
    }
  });

  /** Read-aloud's dash detector is the third consumer of the same grammar. It
   * decides what is spoken aloud versus held as a silence, so a disagreement
   * means `--` gets pronounced "dash dash" — or a real pause is swallowed. */
  it("read-aloud splits on exactly the caesuras the engine parses", () => {
    for (const script of ["a -- b", "a --2.5.3 b", "a --2 b", `a --${"9".repeat(41)} b`]) {
      // `buildChunks` is internal, so assert through the shared scanner the
      // module now uses: the same token boundaries the engine found.
      const chars = Array.from(script);
      let found = 0;
      for (let i = 0; i < chars.length; i++) {
        const token = scanCaesuraAt(chars, i);
        if (token) {
          found += 1;
          i = token.end - 1;
        }
      }
      expect(found, script).toBe(parseCaesuras(script, 0.75).length);
    }
  });

  it("labels a bare chip with the operator default and a numbered one with its own", () => {
    expect(chipLabel("--", 0.75)).toBe("0.75s");
    expect(chipLabel("--", 2)).toBe("2s");
    expect(chipLabel("--2", 0.75)).toBe("2s");
    expect(chipLabel("--0.5", 0.75)).toBe("0.5s");
    // A malformed token falls back rather than rendering "NaNs".
    expect(chipLabel("--x", 1.25)).toBe("1.25s");
  });

  it("normalizes pasted spacing without inventing caesuras", () => {
    // Fenced but sloppily spaced: collapses to the canonical form.
    expect(normalizePaste("a  --  b")).toBe("a -- b");
    expect(normalizePaste("a --  2  b")).toBe("a -- 2  b");
    expect(normalizePaste("a --2  b")).toBe("a --2 b");
    // Unfenced dashes are literal text and must stay untouched.
    expect(normalizePaste("x--2y")).toBe("x--2y");
    expect(normalizePaste("well-known")).toBe("well-known");
    // A line break on either side is preserved as a line break, not a space —
    // otherwise pasting a script silently joined its paragraphs.
    expect(normalizePaste("a\n--\nb")).toBe("a\n--\nb");
  });
});

describe("the speed model (FT-14)", () => {
  it("BPM and chars/sec round-trip", () => {
    for (const bpm of [BPM_MIN, 60, 120, 205, BPM_MAX]) {
      expect(bpmFromSpeed(speedFromBpm(bpm))).toBe(bpm);
    }
  });

  /**
   * The load-bearing property: every BPM the user can enter maps to a speed the
   * ENGINE will accept unchanged (it clamps to 1–60 chars/sec). If this fails,
   * typing a legal BPM would be silently altered by a clamp underneath, and the
   * number on screen would stop meaning anything.
   */
  it("the whole BPM range lands inside the engine's chars/sec clamp", () => {
    for (let bpm = BPM_MIN; bpm <= BPM_MAX; bpm++) {
      const speed = speedFromBpm(bpm);
      expect(speed, `bpm ${bpm}`).toBeGreaterThanOrEqual(1);
      expect(speed, `bpm ${bpm}`).toBeLessThanOrEqual(60);
    }
  });

  it("clamps out-of-range entry to the settable range", () => {
    expect(clampBpm(0)).toBe(BPM_MIN);
    expect(clampBpm(-40)).toBe(BPM_MIN);
    expect(clampBpm(9000)).toBe(BPM_MAX);
    expect(clampBpm(120)).toBe(120);
  });
});

describe("typefaces (FT-15)", () => {
  it("every id Rust validates has a CSS stack here", () => {
    // Mirror of Rust `teleprompter::FONT_FAMILIES`. If the two drift, a settings
    // file the backend happily accepts renders in the wrong font.
    expect(FONT_FAMILY_IDS).toEqual(["system", "sans", "serif", "mono", "rounded", "slab"]);
    for (const id of FONT_FAMILY_IDS) expect(FONT_STACKS[id]).toBeTruthy();
  });

  it("an unknown id falls back instead of blanking the text", () => {
    expect(fontStack("not-a-font")).toBe(FONT_STACKS.system);
    expect(fontStack("")).toBe(FONT_STACKS.system);
  });

  /**
   * The LAN mirror page carries its own copy of this table — it is served to a
   * browser that never loads this bundle, so it cannot import it. That copy is
   * unavoidable; going UNCHECKED is not. Without this, changing a stack here
   * would silently leave the mirror rendering a different typeface from the
   * preview and the projector, with no type error and no failing test — the
   * exact drift the shared `Look` in `teleprompter.rs` exists to prevent.
   */
  it("the LAN mirror page carries the same font stacks", () => {
    // Vitest runs with `ui/` as its root, so the app crate is one level up.
    const page = readFileSync(resolve(process.cwd(), "../src-tauri/assets/mirror.html"), "utf8");
    for (const [id, stack] of Object.entries(FONT_STACKS)) {
      // The page writes them as JS string literals with single quotes.
      expect(page.includes(stack), `${id} is missing or different in mirror.html`).toBe(true);
    }
  });
});

describe("read-aloud pace (FT-16)", () => {
  it("maps the scroll pace onto a speech rate, bounded to what engines accept", () => {
    // 14 chars/sec is the baseline "rate 1.0" voice pace.
    expect(paceToRate(14)).toBeCloseTo(1, 5);
    expect(paceToRate(28)).toBeCloseTo(2, 5);
    // Web Speech rejects rates outside 0.1–10; the clamp is what stops a very
    // fast or very slow scroll silently producing no speech at all.
    expect(paceToRate(9999)).toBe(10);
    expect(paceToRate(0)).toBeGreaterThanOrEqual(0.1);
    expect(paceToRate(-5)).toBeGreaterThanOrEqual(0.1);
  });
});

describe("read-time formatting", () => {
  it("formats as M:SS and never goes negative", () => {
    expect(fmtTime(0)).toBe("0:00");
    expect(fmtTime(9)).toBe("0:09");
    expect(fmtTime(75)).toBe("1:15");
    expect(fmtTime(600)).toBe("10:00");
    expect(fmtTime(-30)).toBe("0:00");
  });
});
