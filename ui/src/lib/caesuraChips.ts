// Pure helpers for the caesura CHIP editor (FT-11, `components/CaesuraEditor.tsx`):
// splitting a script string into text runs and ` -- ` / ` --N ` caesura tokens,
// labelling a chip, and normalizing pasted text.
//
// Kept DOM-free and separate from the component so it is unit-testable on its
// own — the component is a contenteditable, which is exactly the kind of thing
// whose logic you want tested somewhere a jsdom selection API cannot reach.
//
// The fence rules mirror the Rust `parse_caesuras` and the TypeScript
// `parseCaesuras` (in ./caesura) exactly, so the chips a user sees are precisely
// what the scroll treats as pauses. Ported from Freally Capture.

const NL = 10;
const isNl = (c: string) => c.charCodeAt(0) === NL;

/** A chip token as it appears in the script string: dashes plus optional digits
 * (`--`, `--2`, `--0.5`) — the surrounding fence spaces are NOT part of it. */
export type Token = { text: string } | { chip: string };
export const isChip = (t: Token): t is { chip: string } => "chip" in t;

/** Split a script into ordered text runs and caesura chips. Chip tokens are the
 * dashes(+digits) core only, so re-joining the tokens reproduces the input
 * byte-for-byte. */
export function tokenize(script: string): Token[] {
  const chars = Array.from(script);
  const n = chars.length;
  const out: Token[] = [];
  let textStart = 0;
  const flush = (end: number) => {
    if (end > textStart) out.push({ text: chars.slice(textStart, end).join("") });
  };
  let i = 0;
  while (i < n) {
    const fencedBefore = i === 0 || chars[i - 1] === " " || isNl(chars[i - 1]);
    if (fencedBefore && chars[i] === "-" && i + 1 < n && chars[i + 1] === "-") {
      let j = i;
      while (j < n && chars[j] === "-") j += 1;
      if (j - i === 2) {
        while (j < n && (/[0-9]/.test(chars[j]) || chars[j] === ".")) j += 1;
        const fencedAfter = j >= n || chars[j] === " " || isNl(chars[j]);
        if (fencedAfter) {
          flush(i);
          out.push({ chip: chars.slice(i, j).join("") });
          textStart = j;
          i = j;
          continue;
        }
      }
    }
    i += 1;
  }
  flush(n);
  return out;
}

/** The human label for a chip: its own seconds, or the operator default for a
 * bare ` -- `. Rounded so 0.75 shows as `0.75s`, 2 as `2s`. */
export function chipLabel(token: string, defaultSecs: number): string {
  const num = token.slice(2);
  const secs = num === "" ? defaultSecs : Number.parseFloat(num);
  const v = Number.isFinite(secs) ? secs : defaultSecs;
  return `${Number(v.toFixed(2))}s`;
}

/** Normalize pasted text so imperfectly-spaced caesuras (`x--2y` stays literal,
 * but `x --  2  y` / `x  --  y` collapse) render as proper ` -- ` / ` --N ` chips.
 * Only touches `--`(+digits) that are already fenced by whitespace/edges. */
export function normalizePaste(text: string): string {
  return text.replace(
    /(^|\s+)--(\d+(?:\.\d+)?)?(\s+|$)/g,
    (_m, pre: string, num: string, post: string) => {
      const lead = pre.includes("\n") ? "\n" : pre === "" ? "" : " ";
      const tail = post.includes("\n") ? "\n" : post === "" ? "" : " ";
      return `${lead}--${num ?? ""}${tail}`;
    },
  );
}
