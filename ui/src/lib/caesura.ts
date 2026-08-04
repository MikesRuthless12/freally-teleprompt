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

/**
 * Does a caesura token start at scalar index `i`? If so, where it ends and what
 * numeric field it carries.
 *
 * **The single definition of the token's shape**, and it must stay that way.
 * Three separate scanners for it grew up here — this one, the chip tokenizer,
 * and read-aloud's dash detector — and they drifted: the other two dropped the
 * two bounds below, so `a --2.5.3 b` was chipped in the editor and skipped by
 * the scroll. The operator was shown a pause the prompter would not take.
 * `caesuraChips.ts` and `tts.ts` now call this instead.
 *
 * The bounds are load-bearing, not cosmetic. They keep this parser and its Rust
 * twin (`teleprompter.rs`) byte-identical in behaviour: without them the scanner
 * could hand each side a string they read DIFFERENTLY.
 *   `--2.5.3` — `parseFloat` prefix-parses it as 2.5;
 *               Rust's parser rejects it and falls back to the default.
 *   41 digits — f64 stays finite and clamps to 30;
 *               f32 saturates to inf and falls back to the default.
 * Either way the two surfaces dwell for different lengths and drift apart,
 * which is the exact failure the twin exists to prevent. Bounded here, neither
 * side ever sees such a string: it simply isn't a caesura.
 */
export function scanCaesuraAt(chars: string[], i: number): { end: number; num: string } | null {
  const n = chars.length;
  const isNl = (c: string) => c.charCodeAt(0) === NL;
  // A fence is a space, a newline, or the edge of the text. `chars[-1]` and
  // `chars[n]` are `undefined`, which is how the two edges are covered.
  const fence = (c: string | undefined) => c === undefined || c === " " || isNl(c);
  if (!fence(chars[i - 1])) return null;
  if (chars[i] !== "-" || chars[i + 1] !== "-") return null;
  let j = i;
  while (j < n && chars[j] === "-") j += 1;
  if (j - i !== 2) return null; // exactly two dashes, never three
  const numStart = j;
  let dots = 0;
  while (j < n && (/[0-9]/.test(chars[j]) || (chars[j] === "." && dots === 0))) {
    if (chars[j] === ".") dots += 1;
    j += 1;
  }
  if (!fence(chars[j])) return null;
  if (j - numStart > MAX_CAESURA_NUM_CHARS) return null;
  return { end: j, num: chars.slice(numStart, j).join("") };
}

/** The pause a token's numeric field asks for, or `defaultSecs` for a bare one. */
export function caesuraSeconds(num: string, defaultSecs: number): number {
  const parsed = Number.parseFloat(num);
  return num !== "" && Number.isFinite(parsed)
    ? Math.min(Math.max(parsed, 0), CAESURA_MAX_SECS)
    : defaultSecs;
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
    const token = scanCaesuraAt(chars, i);
    if (token) {
      out.push({ pos: vis, width: 2, dur: caesuraSeconds(token.num, defaultSecs) });
      vis += token.end - i; // consumed dashes + digits are all visible chars
      i = token.end;
      continue;
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

// ---------------------------------------------------------------------------
// Skipped words (FT-M02) — labels you read but do not perform.
// ---------------------------------------------------------------------------
//
// "Chorus", "Verse 2", "[Bridge]": landmarks a singer wants to SEE coming but
// which are not sung, and so must not be counted in the read's time. A rapper
// working to a DAW needs the lyrics to land on the bar they were written for,
// and four label lines' worth of scroll time is four bars of drift.
//
// The whole feature rests on one observation: **a region that costs zero time
// is a caesura with a duration of zero.** The scroll crosses it instantly, and
// the timing model already handles it — `liveOffset` steps `off` to the end of
// a zero-duration region without consuming any of `rem`, and `timeAtOffset`
// adds `dur * fraction` = 0. So skips need no new timing maths on either side
// of the IPC boundary, and cannot drift from the caesura model because they
// ARE the caesura model.

/** A run of visible characters the scroll passes over in no time at all. */
export type Skip = {
  /** Visible-char offset the run starts at. */
  pos: number;
  /** How many visible characters it covers. */
  width: number;
};

/**
 * Decoration stripped before a line is compared to a keyword, so `[Verse 1]`,
 * `## Bridge` and `Chorus:` all match the bare words a user typed in settings.
 *
 * Dashes are deliberately NOT in this set. ` -- ` is a caesura, and stripping
 * dashes off the ends would make `Chorus --` look like a bare label — skipping
 * a pause the writer asked for, silently.
 *
 * ⚠️ The last two are **parity, not decoration**. `U+FEFF` (byte-order mark)
 * and `U+0085` (next line) are the entire difference between JavaScript's
 * `String.trim` (WhiteSpace ∪ LineTerminator — has BOM, not NEL) and Rust's
 * `str::trim` (Unicode `White_Space` — has NEL, not BOM). Stripping both here,
 * before either side's `trim` runs, is what keeps the two matchers agreeing: a
 * differential fuzz over 6,000 cases found these two code points and nothing
 * else. Reachable in practice — Windows Notepad still writes "UTF-8 with BOM".
 */
const LABEL_DECORATION = new Set([..."[](){}<>#*:;.,_|/\\\"'!?“”‘’ \t\uFEFF\u0085"]);

/**
 * Letters and digits, for word boundaries. Unicode-aware on purpose: `\b` is
 * ASCII-only, and this app runs in 18 languages.
 *
 * `\p{Alphabetic}`, **not** `\p{L}` — this has to mean exactly what the Rust
 * twin's `char::is_alphanumeric()` means, which is `is_alphabetic() ||
 * is_numeric()`, i.e. the Unicode *Alphabetic property* plus category N.
 * Alphabetic is strictly wider than category L: it also covers the combining
 * vowel signs used across the Indic scripts this app ships. With `\p{L}` a
 * keyword sitting immediately before a Devanagari vowel sign counted as a word
 * boundary here and did not in Rust — the preview and the projector then
 * skipped different characters of the same script.
 */
const WORDISH = /[\p{Alphabetic}\p{N}]/u;

/**
 * Whether `ch` is a word character — the boundary test the skip matcher uses.
 *
 * Exported so find & replace's "whole word" option asks the same question
 * (FT-M07). Two features testing word boundaries two different ways is how you
 * get a search that finds a word the skip matcher does not, in the same script.
 * An empty string is not a word character, which is how the text edges answer.
 */
export const isWordish = (ch: string): boolean => ch !== "" && WORDISH.test(ch);

/**
 * Strip decoration from both ends, then a trailing number — `[Verse 1]` and
 * `Verse 12` both reduce to `Verse`.
 *
 * ⚠️ The trailing number is stripped by a **backwards scan, never a regex.**
 * The obvious `core.replace(/[ \t]*\d+$/u, "")` backtracks catastrophically:
 * on a line that ends in something other than a digit, the engine retries
 * `[ \t]*` from every position in a whitespace run and rewinds the whole run
 * each time. Measured on a 200,000-character line of spaces — which is exactly
 * `MAX_SCRIPT`, so a plain `.txt` a user could be handed — one call took
 * **14 seconds**, and this runs per line, per surface, per keystroke. The
 * trailing `.trim()` absorbs the space before the number, so the scan below
 * needs to know about digits only, which is also what the Rust twin's
 * `trim_end_matches(is_ascii_digit).trim()` does.
 */
function labelCore(line: string): string {
  const chars = Array.from(line);
  let from = 0;
  let to = chars.length;
  while (from < to && LABEL_DECORATION.has(chars[from])) from += 1;
  while (to > from && LABEL_DECORATION.has(chars[to - 1])) to -= 1;
  // ASCII digits only, matching Rust's `is_ascii_digit` — a keyword is compared
  // against this, and Unicode digits are not what "Verse 2" is written in.
  while (to > from && chars[to - 1] >= "0" && chars[to - 1] <= "9") to -= 1;
  return chars.slice(from, to).join("").trim();
}

/**
 * Is this line **nothing but** one of the keywords — allowing for brackets,
 * hashes, a colon and a trailing number?
 *
 * Exported because two features ask the same question and must not answer it
 * differently: FT-M02 skips such a line's characters, and FT-N01's rehearsal
 * report treats it as the start of a section. `keywords` must already be
 * lowercased and trimmed.
 */
export function isLabelLine(line: string, keywords: readonly string[]): boolean {
  if (keywords.length === 0) return false;
  const core = labelCore(line).toLowerCase();
  return core !== "" && keywords.includes(core);
}

/** Trim and lowercase a keyword list once, dropping blanks. The matchers take
 * their keywords already normalised — see the Rust twin's `normalise_keywords`
 * for why (it runs on every keystroke). */
export const normaliseKeywords = (words: readonly string[]): string[] =>
  words.map((word) => word.trim().toLowerCase()).filter((word) => word.length > 0);

/**
 * Sort runs by position and merge any that overlap or touch.
 *
 * The timing loop walks its regions in order and assumes they do not overlap;
 * two keywords matching the same text (say `Verse` and `Verse 1`) would
 * otherwise produce a pair that does.
 *
 * Exported because FT-M03's statistics ask the same question of the same kind
 * of list — a caesura written inside a skipped label produces two runs over the
 * same characters, and removing both would take a character of real script with
 * them. A second copy had grown up in `stats.ts` before this was shared.
 *
 * The first element is COPIED rather than carried through: this returns a fresh
 * list, so mutating a caller's object to widen it would be a surprise the
 * original (whose inputs were always freshly built) never had to answer for.
 */
export function mergeRuns(runs: readonly Skip[]): Skip[] {
  if (runs.length < 2) return [...runs];
  const sorted = [...runs].sort((a, b) => a.pos - b.pos);
  const out: Skip[] = [{ ...sorted[0] }];
  for (const run of sorted.slice(1)) {
    const last = out[out.length - 1];
    const lastEnd = last.pos + last.width;
    if (run.pos <= lastEnd) {
      last.width = Math.max(lastEnd, run.pos + run.width) - last.pos;
    } else {
      out.push({ ...run });
    }
  }
  return out;
}

/**
 * Find every run of visible characters a keyword marks as unperformed.
 *
 * The matching rule is deliberately automatic rather than a second setting:
 *
 * * A line that is **nothing but** the keyword — allowing for brackets, hashes,
 *   a colon and a trailing number — is skipped **whole**. That is `Chorus`,
 *   `[Verse 1]`, `## Bridge`.
 * * Otherwise the keyword is skipped **as a word, where it appears**. That is
 *   "and then back to the chorus" — a real lyric, which must keep its time.
 *
 * One keyword list covers both, and no configuration can be set the wrong way
 * round. Matching is case-insensitive; a keyword is compared as a whole word,
 * so `versed` never matches `verse`.
 */
export function parseSkips(script: string, words: readonly string[]): Skip[] {
  const keywords = normaliseKeywords(words);
  if (keywords.length === 0) return [];

  const out: Skip[] = [];
  let vis = 0;
  for (const line of script.split("\n")) {
    const chars = Array.from(line);
    const lineStart = vis;
    vis += chars.length; // newlines are not visible chars, so this is the run

    if (chars.length === 0) continue;
    if (isLabelLine(line, keywords)) {
      out.push({ pos: lineStart, width: chars.length });
      continue;
    }

    // Not a bare label: skip the keyword itself wherever it appears as a word.
    //
    // Lowercased character by character and then LENGTH-CHECKED, exactly as the
    // Rust twin does it. Lowercasing can widen a character — `İ` becomes two
    // code points — which would slide every index after it, so a line where
    // that happens is left alone rather than matched at the wrong offset. A
    // missed skip is a timing that is merely unhelpful; a wrong offset is a
    // script that scrolls wrong.
    //
    // ⚠️ The length check is the parity-critical half. Without it this side
    // would still match keywords elsewhere on such a line while Rust skipped
    // the line entirely — the preview and the projector then compute different
    // skip runs from the same script, which is the one failure the twin
    // architecture exists to prevent.
    const lower = chars.flatMap((c) => Array.from(c.toLowerCase()));
    if (lower.length !== chars.length) continue;
    // Which characters this line even contains. A keyword whose first character
    // is absent cannot match anywhere on it, and skipping the scan for those is
    // what keeps the cost off the common case: the full 64 keywords at their
    // 48-character cap, scanned naively against a 200,000-character line, took
    // 830 ms — per surface, per keystroke.
    const present = new Set(lower);
    const runs: Skip[] = [];
    for (const keyword of keywords) {
      const needle = Array.from(keyword);
      if (!present.has(needle[0])) continue;
      for (let i = 0; i + needle.length <= lower.length; i++) {
        if (!needle.every((c, k) => lower[i + k] === c)) continue;
        // Whole word only — `versed` is not `verse`.
        const before = i > 0 ? chars[i - 1] : "";
        const after = i + needle.length < chars.length ? chars[i + needle.length] : "";
        if (WORDISH.test(before) || WORDISH.test(after)) continue;
        runs.push({ pos: lineStart + i, width: needle.length });
      }
    }
    out.push(...mergeRuns(runs));
  }
  return out;
}

/**
 * Everything a surface needs to know about a script's timing, from one pass.
 *
 * Both halves come back together because both are wanted together and each is
 * an O(script) scan: `regions` times the scroll, `skips` says which characters
 * to dim and which not to speak. Returning only `regions` meant every caller
 * ran `parseSkips` a *second* time for the other half — four full scans per
 * keystroke across the two surfaces in the operator window.
 *
 * ⚠️ `skips` cannot be recovered from `regions` by looking for `dur === 0`. A
 * caesura written ` --0 ` is a real, deliberate zero-length hold, and treating
 * it as a label would dim it on screen and silence it in read-aloud.
 */
export type ScriptTiming = {
  /**
   * Every region that changes the scroll's timing, sorted by position and
   * non-overlapping: caesura holds (`dur > 0`), and skipped labels (`dur === 0`)
   * which the scroll crosses in no time at all.
   *
   * A caesura that falls inside a skipped run is **dropped** — the run costs no
   * time, so a pause written inside a label is a pause inside something nobody
   * performs, and an overlapping pair would break the timing loop, which walks
   * its regions in order assuming they do not overlap.
   */
  regions: Caesura[];
  /** The label runs themselves, for dimming and for read-aloud. */
  skips: Skip[];
};

/** Parse a script's timing. See {@link ScriptTiming}. */
export function timedRegions(
  script: string,
  defaultSecs: number,
  skipWords: readonly string[],
): ScriptTiming {
  const skips = parseSkips(script, skipWords);
  const caesuras = parseCaesuras(script, defaultSecs);
  if (skips.length === 0) return { regions: caesuras, skips };

  // Drop any caesura that falls inside a skipped run, by a two-pointer walk.
  //
  // Both lists come out of their parsers sorted by position, and `skips` is
  // non-overlapping (`mergeRuns` guarantees it), so a cursor that only ever
  // moves forward is enough. The obvious `caesuras.filter(c => skips.some(…))`
  // is O(caesuras × skips) and both grow with the script: on a 200,000-char
  // script alternating labels and holds — 22,000 of each — it measured 1.9
  // seconds, on every keystroke.
  const kept: Caesura[] = [];
  let cursor = 0;
  for (const c of caesuras) {
    while (cursor < skips.length && skips[cursor].pos + skips[cursor].width <= c.pos) cursor += 1;
    const s = skips[cursor];
    if (!s || !(c.pos < s.pos + s.width && s.pos < c.pos + c.width)) kept.push(c);
  }

  const regions = [...kept, ...skips.map((s) => ({ pos: s.pos, width: s.width, dur: 0 }))].sort(
    (a, b) => a.pos - b.pos,
  );
  return { regions, skips };
}

/** Seconds to reach visible-char offset `target` from the top at `speed`,
 * counting caesura pauses along the way — the seek bar's timestamp axis. */
export function timeAtOffset(target: number, speed: number, caesuras: readonly Caesura[]): number {
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
