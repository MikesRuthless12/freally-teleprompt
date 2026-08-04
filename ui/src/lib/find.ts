/**
 * Find & replace (FT-M07), scoped to the open script.
 *
 * Pure functions over the script string: everything here takes text and gives
 * back matches or new text, so the dialog owns no matching logic and the
 * behaviour is testable without a DOM.
 *
 * Offsets are **string indices**, not the visible-char offsets the scroll
 * engine uses, because every consumer of these is an edit: the editor's
 * `replaceRange` and its highlight both work in the same units `serialize()`
 * produces. Mixing the two conventions would replace the wrong characters of
 * any script containing a newline, which is all of them.
 */

import { isWordish } from "./caesura";

/** The two switches a find offers. */
export type FindOptions = {
  caseSensitive: boolean;
  wholeWord: boolean;
};

/** One hit, as a half-open string range. */
export type Match = { start: number; end: number };

/**
 * Case-fold an array of characters **without changing its length.**
 *
 * ⚠️ This is the same trap FT-M02's twin paid for, reached from the other side.
 * `İ` (U+0130) lowercases to TWO code points, so a naive
 * `haystack.toLowerCase()` slides every index after it — and here an index is
 * where a replacement is about to be written. A search that reported a match
 * one character off would silently eat the wrong letter out of somebody's
 * script.
 *
 * So a character whose lowercase is not exactly one character is left **as it
 * is**. The cost is that `İstanbul` is not found by typing `istanbul`, which is
 * a missed match in one letter of one alphabet. The alternative is a wrong
 * offset, and a wrong offset corrupts text.
 */
function foldCase(chars: readonly string[]): string[] {
  return chars.map((ch) => {
    const lower = ch.toLowerCase();
    return Array.from(lower).length === 1 ? lower : ch;
  });
}

/**
 * Every non-overlapping match of `query` in `script`.
 *
 * Deliberately **not** a regular expression. The query comes straight from a
 * text field the operator types into, and this runs on every keystroke against
 * a script up to 200,000 characters: a regex built from user input is both a
 * syntax error waiting to happen and the exact shape that froze this app for
 * fourteen seconds once already (see `labelCore`). A plain scan cannot
 * backtrack.
 *
 * Matches never overlap — after a hit the scan resumes past it, which is what
 * makes replace-all's count equal the number of replacements it performs.
 */
export function findMatches(
  script: string,
  query: string,
  options: FindOptions = { caseSensitive: false, wholeWord: false },
): Match[] {
  if (query === "") return [];
  // Code points, not UTF-16 units, so an emoji or an astral character in the
  // script cannot split a match down the middle.
  const chars = Array.from(script);
  const needleChars = Array.from(query);
  const haystack = options.caseSensitive ? chars : foldCase(chars);
  const needle = options.caseSensitive ? needleChars : foldCase(needleChars);
  if (needle.length === 0 || needle.length > haystack.length) return [];

  // Code-point index -> string index, built once. `Array.from` splits surrogate
  // pairs into one entry while a string index counts two, so a match reported
  // in code points would land in the wrong place in any script with an emoji.
  const at: number[] = new Array(chars.length + 1);
  let cursor = 0;
  for (let i = 0; i < chars.length; i++) {
    at[i] = cursor;
    cursor += chars[i].length;
  }
  at[chars.length] = cursor;

  const out: Match[] = [];
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let hit = true;
    for (let k = 0; k < needle.length; k++) {
      if (haystack[i + k] !== needle[k]) {
        hit = false;
        break;
      }
    }
    if (!hit) continue;
    if (options.wholeWord) {
      const before = i > 0 ? chars[i - 1] : "";
      const after = i + needle.length < chars.length ? chars[i + needle.length] : "";
      if (isWordish(before) || isWordish(after)) continue;
    }
    out.push({ start: at[i], end: at[i + needle.length] });
    i += needle.length - 1;
  }
  return out;
}

/** Replace one match. The caller supplies the range, so a replacement always
 * lands on the hit the operator was looking at rather than on a fresh search
 * that may have moved under them. */
export function replaceMatch(script: string, match: Match, replacement: string): string {
  return script.slice(0, match.start) + replacement + script.slice(match.end);
}

/**
 * Replace every match, and say how many.
 *
 * Built in one pass over the ORIGINAL matches rather than by replacing and
 * re-searching: re-searching would find the replacement itself whenever it
 * contains the query (`cat` → `cats` never terminates), and every replacement
 * would shift the offsets of the ones after it.
 */
export function replaceAll(
  script: string,
  query: string,
  replacement: string,
  options: FindOptions = { caseSensitive: false, wholeWord: false },
): { text: string; count: number } {
  const matches = findMatches(script, query, options);
  if (matches.length === 0) return { text: script, count: 0 };
  let out = "";
  let cursor = 0;
  for (const match of matches) {
    out += script.slice(cursor, match.start) + replacement;
    cursor = match.end;
  }
  out += script.slice(cursor);
  return { text: out, count: matches.length };
}

/**
 * The index of the match to show after a move, wrapping at both ends.
 *
 * Wrapping rather than stopping, because a find that stops at the last match
 * makes the operator work out where they are in order to keep going — and there
 * is nothing destructive about coming round again.
 */
export function stepMatch(count: number, current: number, direction: 1 | -1): number {
  if (count <= 0) return 0;
  return (((current + direction) % count) + count) % count;
}

/** The match at or after `from`, for re-anchoring the selection when the query
 * or the script changes under an open dialog. Falls back to the first match, so
 * an edit above the current hit does not throw the operator back to the top. */
export function matchNearest(matches: readonly Match[], from: number): number {
  const at = matches.findIndex((match) => match.start >= from);
  return at === -1 ? 0 : at;
}

/** A short piece of the script around a match, with the hit's own bounds
 * relative to the snippet — what the dialog shows so the operator can tell two
 * hits apart without looking away from it. */
export function matchContext(
  script: string,
  match: Match,
  span = 32,
): { text: string; start: number; end: number } {
  const from = Math.max(0, match.start - span);
  const to = Math.min(script.length, match.end + span);
  // A newline inside the snippet would break the one-line preview into two, so
  // it is shown as the space it reads as.
  const text = script.slice(from, to).replace(/\n/g, " ");
  return { text, start: match.start - from, end: match.end - from };
}
