/**
 * Section markers with jump-to (FT-M05).
 *
 * A marker is a **named landmark** in the script: `# Verse 2`, `# Q&A`,
 * `[Chorus]`. They appear in a jump list, they rule the seek bar, and
 * next/previous walks them — because the moment a script is longer than one
 * screen, "go back to the top of the chorus" stops being a scrub and starts
 * being a guess.
 *
 * # There is no fourth parser here, and that is the point
 *
 * This app already knows where a script's landmarks are. `FT-M02` shipped
 * `isLabelLine`, which recognises a line that is nothing but one of the
 * operator's own keywords — `Chorus`, `[Verse 1]`, `## Bridge` — and `FT-N01`'s
 * rehearsal report already splits the script on exactly those. A marker list
 * that invented its own syntax would be a second answer to a question the app
 * had already answered, and the two would drift.
 *
 * So a marker is:
 *
 * * **any line beginning `#`** — the shape the roadmap names (`# Verse 2`,
 *   `# Q&A`), and the shape an imported Markdown script already has, so
 *   FT-M01 and this compose with nothing in between; **or**
 * * **any skip-label line**, which is what a lyric sheet already contains and
 *   needs no configuration to be one.
 *
 * `sections()` in `rehearsal.ts` takes its boundaries from the same predicate,
 * so the rehearsal report's rows and this jump list can never disagree about
 * where Verse 2 starts.
 *
 * # ⚠️ A marker carries no timing, deliberately
 *
 * Nothing here crosses the IPC boundary and nothing here changes the scroll, so
 * unlike the caesura and skip parsers this has **no Rust twin to keep in step**.
 * A `#` line that the operator does not want read aloud is FT-M02's job — add
 * the word to the skip list — and keeping the two concerns apart is what lets
 * this stay a UI-only feature. If a marker ever gains a duration, it needs a
 * twin, and that is a much larger change than it looks.
 */

import { isLabelLine, normaliseKeywords } from "./caesura";

/** How much of a marker's line is kept as its name in the list. */
const NAME_CHARS = 48;

/** Brackets a label is commonly written inside, stripped from a marker's name so
 * `[Chorus]` and `Chorus` read as the same landmark in the list. */
const NAME_BRACKETS: ReadonlyArray<readonly [string, string]> = [
  ["[", "]"],
  ["(", ")"],
  ["{", "}"],
  ["<", ">"],
];

/** One named landmark in the script. */
export type Marker = {
  /** 0-based position in the list — what next/previous counts in. */
  index: number;
  /** What to show, already trimmed of its `#`s and brackets. */
  name: string;
  /**
   * Visible-char offset the marker's own line starts at — the scroll unit, so
   * this can be handed straight to `seek` and to `timeAtOffset` without a
   * second convention to keep in step.
   */
  offset: number;
};

/**
 * Is this line a heading — the `# Verse 2` shape?
 *
 * Leading whitespace is allowed (an imported document may indent), but the `#`
 * must be the first thing on the line: a `#` in the middle of a lyric is a
 * hashtag, not a landmark.
 */
function isHeadingLine(line: string): boolean {
  return line.trimStart().startsWith("#");
}

/**
 * Whether this line names a landmark. `keywords` must already be normalised.
 *
 * Exported because `rehearsal.ts` splits its sections on the same question —
 * see the module note above.
 */
export function isMarkerLine(line: string, keywords: readonly string[]): boolean {
  return isHeadingLine(line) || isLabelLine(line, keywords);
}

/** The readable name of a marker line: `## Verse 2` and `[Verse 2]` both give
 * `Verse 2`. Falls back to the trimmed line when stripping leaves nothing, so a
 * marker always has something to click. */
export function markerName(line: string): string {
  let name = line.trim();
  // Only leading hashes — a trailing `#` is how some writers close a heading,
  // but stripping both ends first would eat a lyric that ends in one.
  name = name.replace(/^#+/, "").trim();
  for (const [open, close] of NAME_BRACKETS) {
    if (name.length > 1 && name.startsWith(open) && name.endsWith(close)) {
      name = name.slice(1, -1).trim();
      break;
    }
  }
  const trimmed = name.replace(/[:.]+$/, "").trim();
  const chosen = trimmed || line.trim();
  return chosen.slice(0, NAME_CHARS);
}

/**
 * Every marker in the script, in reading order.
 *
 * The offset is the start of the marker's **own line**, not of the text after
 * it, so jumping to `Chorus` puts the word Chorus on the reading guide — which
 * is what an operator means by "take it from the chorus". Where the line is
 * also a skipped label it costs no read time, so the scroll steps straight
 * through it onto the first line that is performed.
 */
export function markers(script: string, skipWords: readonly string[] = []): Marker[] {
  const keywords = normaliseKeywords(skipWords);
  const out: Marker[] = [];
  let vis = 0;
  for (const line of script.split("\n")) {
    if (isMarkerLine(line, keywords)) {
      out.push({ index: out.length, name: markerName(line), offset: vis });
    }
    // Newlines are not visible characters, so a line's width is its own length.
    vis += Array.from(line).length;
  }
  return out;
}

/**
 * The marker to jump to from `offset`, going forwards or backwards.
 *
 * "Previous" means the marker before the one the read is **currently inside**,
 * not the one just behind the caret: pressing it a third of the way through the
 * chorus should take you to the top of the chorus, and pressing it again to the
 * verse before. That is how every media player's previous-track button behaves
 * and it is what an operator's hand expects.
 *
 * Null when there is nowhere to go — the caller leaves the scroll alone rather
 * than jumping to the top, which would be a silent, destructive answer to
 * "previous" at the start of a script.
 */
export function adjacentMarker(
  list: readonly Marker[],
  offset: number,
  direction: 1 | -1,
): Marker | null {
  // A small tolerance, because an offset is fractional while a marker is not:
  // a scroll parked exactly on a marker is AT it, not past it, and floating
  // point makes "exactly" unreliable.
  const epsilon = 0.5;
  if (direction === 1) {
    return list.find((marker) => marker.offset > offset + epsilon) ?? null;
  }
  const behind = list.filter((marker) => marker.offset < offset - epsilon);
  return behind.length > 0 ? behind[behind.length - 1] : null;
}

/** Which marker the read is currently inside, or null when it is above the
 * first one. Drives the "you are here" mark in the jump list. */
export function currentMarker(list: readonly Marker[], offset: number): Marker | null {
  let found: Marker | null = null;
  for (const marker of list) {
    if (marker.offset > offset + 0.5) break;
    found = marker;
  }
  return found;
}
