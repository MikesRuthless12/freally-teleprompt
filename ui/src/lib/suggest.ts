// FT-20 — the autocomplete seam.
//
// Ghost-text completion for the script editor: a LOOKUP against tables bundled
// in the installer. Not a model, not a network call — nothing is ever
// downloaded, and `complete()` runs in well under a millisecond.
//
// Each of the 18 app languages has its own table under ../dict/<locale>.json
// (frequency-ordered words + phrases, built by scripts/build-dicts.mjs), lazily
// fetched for the ACTIVE locale only so the base bundle stays lean. On load the
// entries are bucketed by their first two characters: a lookup then scans one
// small bucket in frequency order, so the first prefix hit is also the most
// common completion. Kept DOM-free so it unit-tests without a browser.

/** The on-disk table shape (what ../dict/<locale>.json contains). */
export type Dict = {
  /** Common words, most-frequent first (lowercase). */
  words: string[];
  /** Common phrases, most-frequent first (lowercase, space-separated). */
  phrases: string[];
};

/** An in-memory table with first-two-char buckets for fast prefix lookup. */
export type LoadedDict = {
  wordIdx: Map<string, string[]>;
  phraseIdx: Map<string, string[]>;
};

function buildIndex(list: string[]): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const s of list) {
    if (s.length < 2) continue;
    const key = s.slice(0, 2); // entries are already lowercase in the data files
    const bucket = idx.get(key);
    if (bucket) bucket.push(s);
    else idx.set(key, [s]);
  }
  return idx;
}

/** Build the in-memory index for a table (exposed for tests + reuse). */
export function indexDict(dict: Dict): LoadedDict {
  return { wordIdx: buildIndex(dict.words ?? []), phraseIdx: buildIndex(dict.phrases ?? []) };
}

// Vite bundles each table as its own async chunk; only the active locale's is
// ever fetched.
const loaders = import.meta.glob<{ default: Dict }>("../dict/*.json");
const cache = new Map<string, LoadedDict | null>();
const pending = new Map<string, Promise<LoadedDict | null>>();

/** Lazy-load + index a locale's table (cached). Resolves to null when the app
 * ships no table for that locale — the caller then shows no suggestions. */
export function loadDict(locale: string): Promise<LoadedDict | null> {
  const hit = cache.get(locale);
  if (hit !== undefined) return Promise.resolve(hit);
  const existing = pending.get(locale);
  if (existing) return existing;
  const loader = loaders[`../dict/${locale}.json`];
  if (!loader) {
    cache.set(locale, null);
    return Promise.resolve(null);
  }
  const p = loader()
    .then((m) => {
      const loaded = indexDict(m.default);
      cache.set(locale, loaded);
      pending.delete(locale);
      return loaded;
    })
    .catch(() => {
      cache.set(locale, null);
      pending.delete(locale);
      return null;
    });
  pending.set(locale, p);
  return p;
}

// A "word" is a run of Unicode letters/marks/apostrophes — deliberately NOT
// hyphens, so a caesura `--` token never looks like a partial word to complete.
// scripts/build-dicts.mjs tokenizes with the same character class; if these ever
// disagree the editor looks up a token shape the tables cannot contain.
const WORD_TAIL = /[\p{L}\p{M}']+$/u;
const PREV_WORD = /([\p{L}\p{M}']+)\s+$/u;

/** Prefix-scan one bucket, most-frequent first, returning what would be
 * APPENDED to `typed` (not the whole entry) for up to `limit` matches. */
function scan(bucket: string[] | undefined, typed: string, limit: number): string[] {
  if (!bucket) return [];
  const out: string[] = [];
  for (const entry of bucket) {
    if (entry.length > typed.length && entry.startsWith(typed)) {
      out.push(entry.slice(typed.length));
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** The completions for `before` against an already-loaded table, most likely
 * first. Each returned string is what would be APPENDED to what the user has
 * already typed, which is exactly what the editor draws as ghost text.
 *
 * Completes the current partial word; failing that, continues a common phrase
 * from the previous word. Pure and table-in-hand so it unit-tests without
 * touching the module cache or a real 30k-entry table. */
export function completeWith(dict: LoadedDict | null, before: string, limit = 1): string[] {
  if (!dict) return [];
  const tail = before.match(WORD_TAIL);
  if (tail) {
    const partial = tail[0];
    if (partial.length < 2) return []; // too little typed to guess usefully
    const lower = partial.toLowerCase();
    return scan(dict.wordIdx.get(lower.slice(0, 2)), lower, limit);
  }
  // Caret sits just after a space: offer to continue a common phrase.
  const prev = before.match(PREV_WORD);
  if (!prev) return [];
  const lead = prev[1].toLowerCase();
  return scan(dict.phraseIdx.get(lead.slice(0, 2)), `${lead} `, limit);
}

/** The seam (FT-20): completions for the text before the caret, in `locale`.
 *
 * Synchronous by design — FT-21 requires a suggestion within one keystroke, so
 * a locale whose table has not finished loading yields nothing this call rather
 * than awaiting. The load is kicked off on the way past and the next keystroke
 * picks it up. */
export function complete(before: string, locale: string, limit = 1): string[] {
  const dict = cache.get(locale);
  if (dict === undefined) {
    void loadDict(locale); // first call for this locale: warm it for the next one
    return [];
  }
  return completeWith(dict, before, limit);
}
