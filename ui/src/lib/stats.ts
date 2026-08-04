/**
 * Script statistics (FT-M03) — what you want to know before you record.
 *
 * The live duration estimate has shipped since FT-11; this is the rest of the
 * entry: word count, character count, and a warning about the longest line.
 * All of it updates as you type, because a statistic you have to ask for is one
 * nobody looks at.
 *
 * # ⚠️ The counts are of what is PERFORMED, not of what is on screen
 *
 * A script's characters and its *spoken* characters stopped being the same
 * thing in FT-M02. Two kinds of text are visible and not performed:
 *
 * * a **skipped label** — `Chorus`, `[Verse 1]` — which the scroll crosses in
 *   no time at all and read-aloud never says; and
 * * a **caesura token** — ` -- `, ` --2 ` — which is an instruction to pause,
 *   not a word.
 *
 * Counting either would make the two numbers on the editor footer disagree with
 * each other: a duration that correctly ignores a label, beside a word count
 * that solemnly includes it. The duration is the honest one, so the counts
 * follow it.
 *
 * The longest LINE is measured on the raw script instead, and that is not an
 * inconsistency — it is a question about layout, not about performance. A line
 * is long because of how much of it wraps across the glass, and a label wraps
 * exactly like anything else.
 */

import { mergeRuns, parseCaesuras, parseSkips, type Skip, visibleChars } from "./caesura";

/**
 * Visible characters on one line past which it is worth telling the operator.
 *
 * 200 is a judgement and this is the reasoning: a paste out of a word processor
 * puts an entire paragraph on a single line, and at a normal prompter font that
 * is four or more rows on the stage. Past about that, the reading guide stops
 * doing its job — the eye has to travel back across the width several times
 * before the line advances at all, which is the thing a prompter exists to stop
 * you doing. Below it, a line that wraps once or twice reads fine.
 *
 * It is a warning, never a limit: nothing is refused, reformatted, or blocked.
 */
export const LONG_LINE_CHARS = 200;

/** What the editor footer shows about the open script. */
export type ScriptStats = {
  /** Words in the performed text — see the note above. */
  words: number;
  /** Visible characters in the performed text (newlines never counted). */
  chars: number;
  /** Visible characters in the longest line of the raw script. */
  longestLine: number;
  /** 1-based number of that line, so the warning can name it. */
  longestLineNumber: number;
  /** Whether `longestLine` is past {@link LONG_LINE_CHARS}. */
  longLine: boolean;
};

/**
 * The script with the runs a `Skip` list marks taken out — **newlines kept**.
 *
 * ⚠️ Run positions are in VISIBLE characters, which exclude newlines, so this
 * cannot simply index the script: the two count different things and every
 * offset after the first line break would be wrong. It walks the script
 * instead, carrying a visible counter, and passes newlines straight through
 * without advancing it.
 *
 * Keeping the newlines is not tidiness. They are word separators, and a version
 * of this that dropped them counted `one\n\ntwo` as ONE word — every line of a
 * lyric sheet fused to the next.
 *
 * The runs come out of their parsers sorted and are merged before they get
 * here, so a single forward-only cursor is enough; the obvious
 * `runs.some(...)` per character is O(script × runs) and both grow together.
 */
function performed(script: string, runs: readonly Skip[]): string {
  let out = "";
  let vis = 0;
  let cursor = 0;
  for (const ch of script) {
    if (ch === "\n") {
      out += "\n";
      continue;
    }
    while (cursor < runs.length && runs[cursor].pos + runs[cursor].width <= vis) cursor += 1;
    const run = runs[cursor];
    if (!run || vis < run.pos) out += ch;
    vis += 1;
  }
  return out;
}

/**
 * Count a script.
 *
 * One pass per question and no memoisation of its own — the caller memoises,
 * because this runs on every keystroke and the shell already knows when the
 * script changed.
 */
export function scriptStats(script: string, skipWords: readonly string[] = []): ScriptStats {
  // Longest line first: it is the one question asked of the script as written.
  let longestLine = 0;
  let longestLineNumber = 0;
  const lines = script.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const width = Array.from(lines[i]).length;
    if (width > longestLine) {
      longestLine = width;
      longestLineNumber = i + 1;
    }
  }

  // The performed text: the script, minus the labels nobody says and minus the
  // pause tokens, which are punctuation for the scroll rather than words for
  // the reader.
  //
  // Merged: a caesura written inside a skipped label produces two runs over the
  // same characters, and removing both would take a character of real script
  // with them.
  const runs = mergeRuns([...parseSkips(script, skipWords), ...caesuraRuns(script)]);
  const text = performed(script, runs);
  return {
    words: countWords(text),
    chars: visibleChars(text),
    longestLine,
    longestLineNumber,
    longLine: longestLine > LONG_LINE_CHARS,
  };
}

/**
 * Every caesura token as a run of visible characters to leave out.
 *
 * A `Caesura`'s `width` is its two dashes and nothing else, but a ` --2.5 `
 * carries its digits as visible characters too, and they are no more a word
 * than the dashes are.
 *
 * ⚠️ The digits are counted in the **source**, not in a newline-free copy of
 * it. The first version scanned the visible characters, where the line break in
 * `a --\n5 b` does not exist — so the `5` that begins the next line looked like
 * part of the token and was counted out of the script. Walking the source with
 * a visible counter is what keeps the two conventions apart: a caesura's digits
 * are always immediately adjacent to its dashes, so a line break ends the token
 * for free.
 */
function caesuraRuns(script: string): Skip[] {
  const caesuras = parseCaesuras(script);
  if (caesuras.length === 0) return [];
  const chars = Array.from(script);
  const out: Skip[] = [];
  let vis = 0;
  let next = 0;
  for (let i = 0; i < chars.length && next < caesuras.length; i++) {
    if (chars[i] === "\n") continue;
    if (vis === caesuras[next].pos) {
      let width = 2;
      while (/[0-9.]/.test(chars[i + width] ?? "")) width += 1;
      out.push({ pos: vis, width });
      next += 1;
    }
    vis += 1;
  }
  return out;
}

/**
 * Words in a string.
 *
 * Split on whitespace, not on a word-character class: this app runs in 18
 * languages, and a "word" in most of them is what is between two spaces. The
 * scripts where that is not true — Chinese, Japanese, Thai, which do not space
 * their words — have no answer a teleprompter could give without a segmenter
 * per language, and reporting a wrong number confidently is worse than
 * reporting the number of runs the writer actually typed.
 */
function countWords(text: string): number {
  let count = 0;
  let inWord = false;
  for (const ch of text) {
    const space = /\s/.test(ch);
    if (!space && !inWord) count += 1;
    inWord = !space;
  }
  return count;
}
