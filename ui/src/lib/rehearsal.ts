/**
 * Rehearsal mode and its timing report (FT-N01).
 *
 * Read the script through, and the app tells you where you ran long. It records
 * **timings and nothing else** — a list of `{ when, where }` numbers. There is
 * no microphone, no recorder, no audio path of any kind in this file or in
 * anything it calls, which is the charter's local-only rule taken at its word
 * and what `rehearsal.test.ts` asserts by construction.
 *
 * # What "actual" means, and why it is not the same as "estimated"
 *
 * The scroll runs at a fixed pace, so if you simply let it run, actual and
 * estimated agree exactly and the report says so. What makes the numbers differ
 * is everything a real rehearsal does: pausing because you fell behind,
 * scrubbing back to take a line again, nudging the speed mid-read. Those are
 * recorded as they happen, so a section you had to stop twice in reads as a
 * section that ran long — which is the thing you wanted to find out.
 *
 * # Sections
 *
 * A section starts at a **skip label** — `Chorus`, `[Verse 1]`, `## Bridge` —
 * or, where there are none, at a **blank line**.
 *
 * Both, because either alone gets a real script wrong. Blank lines alone are
 * the obvious rule and they fail on exactly the user this phase was built for:
 * a lyric sheet written `[Verse 1]` / lyrics / `[Chorus]` / lyrics with no
 * blank lines rehearses as ONE section and produces a one-row report. Labels
 * alone fail on prose, which has no labels at all. Taking the labels first and
 * falling back means a script gets the better answer it has the information
 * for.
 *
 * Note this reuses FT-M02's own matcher (`isLabelLine`) rather than inventing a
 * marker syntax. `FT-M05`'s named markers are not built; when they are, they
 * become a jump list over boundaries that already exist rather than a fourth
 * parser to reconcile.
 */

import { type Caesura, isLabelLine, normaliseKeywords, timeAtOffset } from "./caesura";
// The engine's own clamps, imported rather than re-declared, so a suggested
// speed is never one the engine would refuse.
import { SPEED_MAX, SPEED_MIN } from "./speed";

/** How far off the plan the read drifts before the pace warning appears (FT-N05).
 *
 * Three seconds is a judgement, and this is the reasoning: under about two the
 * indicator flickers on and off over the ordinary slop of a human reading, and
 * much above five it stops being a warning and becomes a post-mortem. It is
 * absolute rather than a percentage of the read on purpose — a presenter cares
 * that they are ten seconds long, not that they are 3% long. */
export const PACE_WARN_SEC = 3;

/** How much of a section's first line is kept as its label in the report. */
const LABEL_CHARS = 48;

/** One paragraph of the script, in visible-char offsets. */
export type Section = {
  /** 0-based position in the script — what the report numbers its rows by. */
  index: number;
  /** The opening of the section's text, for a person to recognise it by. */
  label: string;
  /** Visible-char offset the section starts at. */
  start: number;
  /** Visible-char offset one past its end. */
  end: number;
};

/** Where the read was, and when. Wall-clock seconds since the rehearsal began. */
export type Sample = { atSec: number; offset: number };

/** One row of the report. */
export type SectionTiming = {
  section: Section;
  /** What the script says this section takes at the planned pace. */
  estSec: number;
  /** What it actually took, or null where the read never finished it. */
  actualSec: number | null;
};

/**
 * Split a script into its paragraphs, as visible-char offsets.
 *
 * Offsets exclude newlines, matching the engine's scroll unit — so a section's
 * bounds can be handed straight to `timeAtOffset` without a second convention
 * to keep in step.
 */
export function sections(script: string, skipWords: readonly string[] = []): Section[] {
  const keywords = normaliseKeywords(skipWords);
  const lines = script.split("\n");
  // Labels win where the script has any; blank lines are the fallback for a
  // script that does not use them (prose, or a user with no keywords set).
  const byLabel = keywords.length > 0 && lines.some((line) => isLabelLine(line, keywords));

  const out: Section[] = [];
  let vis = 0;
  let start: number | null = null;
  let label = "";

  const close = (end: number) => {
    if (start === null) return;
    // A section that is only its own label has nothing to perform and no
    // duration to compare — it would be a row of zeroes in the report.
    if (end > start) {
      out.push({ index: out.length, label: label.slice(0, LABEL_CHARS), start, end });
    }
    start = null;
    label = "";
  };

  for (const line of lines) {
    const width = Array.from(line).length;
    if (byLabel && isLabelLine(line, keywords)) {
      // The label ENDS the section before it and NAMES the one after, and its
      // own characters belong to neither: they cost no time (FT-M02), so
      // counting them into a section would credit it with a span the scroll
      // crosses in an instant.
      close(vis);
      label = line.trim();
      vis += width;
      start = vis;
      continue;
    }
    if (!byLabel && line.trim() === "") {
      // A line of only whitespace separates paragraphs — and is still made of
      // visible characters as far as the scroll is concerned, so it is counted
      // either way, just not included in the section it follows.
      close(vis);
    } else if (line.trim() !== "") {
      if (start === null) start = vis;
      if (label === "") label = line.trim();
    }
    vis += width;
  }
  close(vis);
  // Re-index: `close` can decline a section, so the running count is the only
  // honest source of a row's number.
  return out.map((section, index) => ({ ...section, index }));
}

/**
 * When the read first reached `offset`, in rehearsal seconds — or null if it
 * never did.
 *
 * The FIRST crossing, deliberately. A reader who scrubs back to take a line
 * again passes the same point twice, and "when did you get here" is the honest
 * reading of the first time. The time between two samples is interpolated, so
 * the answer does not step in sampling-interval lumps.
 */
export function crossedAt(samples: readonly Sample[], offset: number): number | null {
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.offset < offset) continue;
    const previous = samples[i - 1];
    if (!previous || previous.offset >= offset) return s.atSec;
    const span = s.offset - previous.offset;
    // Guarded: two samples at the same offset would divide by zero, and the
    // sampler can produce them whenever the scroll is paused.
    if (span <= 0) return s.atSec;
    const frac = (offset - previous.offset) / span;
    return previous.atSec + frac * (s.atSec - previous.atSec);
  }
  return null;
}

/** Build the report: what each section should have taken, against what it did. */
export function timings(
  parts: readonly Section[],
  samples: readonly Sample[],
  speed: number,
  caesuras: readonly Caesura[],
): SectionTiming[] {
  const s = speed > 0 ? speed : 1;
  return parts.map((section) => {
    const from = crossedAt(samples, section.start);
    const to = crossedAt(samples, section.end);
    return {
      section,
      estSec: timeAtOffset(section.end, s, caesuras) - timeAtOffset(section.start, s, caesuras),
      // Both ends needed: a section the read stopped inside has no duration,
      // and reporting the part of it that was covered would read as a section
      // that came in miraculously short.
      actualSec: from === null || to === null ? null : Math.max(0, to - from),
    };
  });
}

/**
 * The pace this read was actually delivered at, as a speed to try next.
 *
 * If the sections took longer than the script said they would, the scroll was
 * running ahead of the performer and should be slowed in the same proportion.
 * Only completed sections count — a half-read one has no duration to compare.
 *
 * Null when nothing was completed, or when the read matched the plan closely
 * enough that there is nothing to suggest. Returning the current speed instead
 * would put a "try this" in front of someone who has nothing to change.
 */
export function suggestedSpeed(rows: readonly SectionTiming[], speed: number): number | null {
  let est = 0;
  let actual = 0;
  for (const row of rows) {
    if (row.actualSec === null) continue;
    est += row.estSec;
    actual += row.actualSec;
  }
  if (est <= 0 || actual <= 0) return null;
  const next = Math.min(SPEED_MAX, Math.max(SPEED_MIN, (speed * est) / actual));
  // Under a tenth of a character a second is not a change anyone can hear, and
  // the speed control moves in whole characters anyway.
  return Math.abs(next - speed) < 0.1 ? null : next;
}

/**
 * How far the read has drifted from its plan, in seconds — positive when it is
 * running long (FT-N05).
 *
 * `elapsedSec` is wall time since the read began; `readSec` is where the script
 * says it should be by now. While the scroll simply runs, the two advance
 * together and the drift stays at zero; every pause, every scrub back, and
 * every second spent catching up opens the gap.
 */
export const paceDrift = (elapsedSec: number, readSec: number): number => elapsedSec - readSec;
