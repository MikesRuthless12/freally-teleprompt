// Teleprompter scroll timing with caesuras (FT-02).
//
// The scroll position is a fractional VISIBLE-CHARACTER index (newlines not
// counted) and speed is characters/second — a real reading pace that stays sane
// when a long line wraps to many on-screen rows, and stays in sync across the
// preview / projector / LAN mirror (a char index is layout-independent).
//
// A caesura is an inline ` -- ` token (exactly two dashes fenced by a space, a
// newline, or the text edge; optional trailing seconds: ` -- ` uses the default,
// ` --2 ` sets its own). Where one sits, the scroll crawls slowly instead of
// pausing hard, so the pace-cue sweep lights the two dashes one at a time.
//
// This file is the TypeScript twin of `src-tauri/src/teleprompter.rs`: the same
// parser and the same offset(elapsed) function, so every surface animates in
// step with the Rust-authoritative state. CHANGING ONE MEANS CHANGING THE OTHER
// — and re-running both test suites.

/** Default ` -- ` pause in seconds (mirror of Rust `CAESURA_DEFAULT_SECS`). */
export const CAESURA_DEFAULT_SECS = 0.75;
const CAESURA_MAX_SECS = 30;
/** Longest numeric field a ` --N ` caesura may carry. Mirrored in
 * `teleprompter.rs` — see `parseCaesuras` for why the bound is load-bearing. */
const MAX_CAESURA_NUM_CHARS = 8;
/** Newline char code, referenced without a newline literal. */
const NL = 10;

export type Caesura = {
  /** Scroll offset (visible-char index) where the pause begins. */
  pos: number;
  /** Token width in characters (the two dashes we crawl across). */
  width: number;
  /** Pause length in seconds. */
  dur: number;
};

/** Total visible characters (newlines excluded) — the scroll's end position. */
export function visibleChars(script: string): number {
  let n = 0;
  for (const ch of script) if (ch.charCodeAt(0) !== NL) n += 1;
  return n;
}

/** Parse inline ` -- ` caesuras as GLOBAL visible-char positions (newlines not
 * counted, matching the UI's per-character `data-ch` spans). Mirrors Rust
 * `parse_caesuras` exactly. */
export function parseCaesuras(
  script: string,
  defaultSecs: number = CAESURA_DEFAULT_SECS,
): Caesura[] {
  const chars = Array.from(script);
  const n = chars.length;
  const isNl = (c: string) => c.charCodeAt(0) === NL;
  const out: Caesura[] = [];
  let vis = 0;
  let i = 0;
  while (i < n) {
    if (isNl(chars[i])) {
      i += 1;
      continue;
    }
    const fencedBefore = i === 0 || chars[i - 1] === " " || isNl(chars[i - 1]);
    if (fencedBefore && chars[i] === "-" && i + 1 < n && chars[i + 1] === "-") {
      let j = i;
      while (j < n && chars[j] === "-") j += 1;
      if (j - i === 2) {
        const numStart = j;
        // At most ONE dot, and at most MAX_CAESURA_NUM_CHARS of it. Both bounds
        // exist to keep this parser and its Rust twin byte-identical in
        // behaviour: without them the scanner could hand each side a string they
        // read DIFFERENTLY.
        //   `--2.5.3` — `parseFloat` prefix-parses it as 2.5;
        //               Rust's parser rejects it and falls back to 0.75.
        //   41 digits — f64 stays finite and clamps to 30;
        //               f32 saturates to inf and falls back to 0.75.
        // Either way the two surfaces dwell for different lengths and drift
        // apart, which is the exact failure the twin exists to prevent. Bounded
        // here, neither side ever sees such a string: it simply isn't a caesura.
        let dots = 0;
        while (j < n && (/[0-9]/.test(chars[j]) || (chars[j] === "." && dots === 0))) {
          if (chars[j] === ".") dots += 1;
          j += 1;
        }
        const fencedAfter = j >= n || chars[j] === " " || isNl(chars[j]);
        if (fencedAfter && j - numStart <= MAX_CAESURA_NUM_CHARS) {
          const num = chars.slice(numStart, j).join("");
          const parsed = Number.parseFloat(num);
          const dur =
            num !== "" && Number.isFinite(parsed)
              ? Math.min(Math.max(parsed, 0), CAESURA_MAX_SECS)
              : defaultSecs;
          out.push({ pos: vis, width: 2, dur });
          vis += j - i; // consumed dashes + digits are all visible chars
          i = j;
          continue;
        }
      }
    }
    vis += 1;
    i += 1;
  }
  return out;
}

/** The scroll offset (visible chars) `elapsedSec` after being at `base`,
 * accounting for caesura crawls. Mirror of Rust `Inner::offset` (the caller
 * clamps the result to the script's visible-char count). */
export function liveOffset(
  base: number,
  elapsedSec: number,
  speed: number,
  caesuras: Caesura[],
): number {
  if (elapsedSec <= 0) return base;
  const s = Math.max(speed, 1e-4);
  let off = base;
  let rem = elapsedSec;
  for (const c of caesuras) {
    const end = c.pos + c.width;
    if (end <= off) continue;
    if (c.pos > off) {
      const t = (c.pos - off) / s;
      if (rem < t) return off + rem * s;
      rem -= t;
      off = c.pos;
    }
    const w = Math.max(c.width, 1e-6);
    const crawlTime = c.dur * ((end - off) / w);
    if (rem < crawlTime) return off + (w / Math.max(c.dur, 1e-6)) * rem;
    rem -= crawlTime;
    off = end;
  }
  return off + rem * s;
}

/** Seconds to reach visible-char offset `target` from the top at `speed`,
 * counting caesura pauses along the way — the seek bar's timestamp axis. */
export function timeAtOffset(target: number, speed: number, caesuras: Caesura[]): number {
  const s = Math.max(speed, 1e-4);
  let off = 0;
  let time = 0;
  for (const c of caesuras) {
    if (c.pos >= target) break;
    time += (c.pos - off) / s;
    off = c.pos;
    const end = Math.min(c.pos + c.width, target);
    const w = Math.max(c.width, 1e-6);
    time += c.dur * ((end - off) / w);
    off = end;
    if (off >= target) return time;
  }
  return time + (target - off) / s;
}
