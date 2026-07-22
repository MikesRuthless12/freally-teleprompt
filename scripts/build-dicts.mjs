#!/usr/bin/env node
/**
 * FT-22 — the autocomplete dictionary pipeline.
 *
 * Rebuilds `ui/src/dict/<locale>.json` (frequency-ordered words + phrases) for
 * all 18 app languages from the Tatoeba sentence corpus. Run by hand when the
 * data needs refreshing; the generated tables are committed, so a normal build
 * and `npm run ci:local` never touch the network. `dict:lint` guards the output.
 *
 * ONE source, ONE licence, deliberately. Tatoeba is CC BY 2.0 FR — attribution
 * only, commercial redistribution explicitly permitted — and it covers every one
 * of our 18 languages. These tables ship INSIDE the installer, so every extra
 * source is another redistribution obligation to honour and re-audit forever.
 * Mixing several is exactly how the sibling app came to ship a Polish table
 * built from a CC BY-NC corpus recorded as "CC BY 4.0"; non-commercial data in
 * a paid installer is a licence breach that a rebuild cannot undo after release.
 * If you add a source here, add it to NOTICE in the same commit and re-read its
 * licence at the source — not a summary of it, including this one.
 *
 * Segmentation uses Node's own ICU via `Intl.Segmenter` for Japanese and
 * Chinese, which are written without spaces. That keeps a third-party tokenizer
 * — and its licence — out of the shipped data entirely. Spaced languages take
 * the regex path because Segmenter is far slower and buys nothing there.
 *
 * Requires `bzip2` and `curl` on PATH (the Tatoeba exports are .tsv.bz2).
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, ".dict-cache");
const OUT = join(ROOT, "ui/src/dict");

/** App locale -> Tatoeba ISO 639-3 export code. */
const LOCALES = {
  ar: "ara",
  de: "deu",
  en: "eng",
  es: "spa",
  fr: "fra",
  hi: "hin",
  id: "ind",
  it: "ita",
  ja: "jpn",
  ko: "kor",
  nl: "nld",
  pl: "pol",
  "pt-BR": "por",
  ru: "rus",
  tr: "tur",
  uk: "ukr",
  vi: "vie",
  "zh-CN": "cmn",
};

/** Written without spaces between words, so they need ICU segmentation. */
const UNSPACED = new Set(["ja", "zh-CN"]);

// FT-22 asks for 20-30k words and 10-20k phrases per language; we take the top
// of both ranges and keep whatever the corpus actually supports. A language that
// falls short is reported at the end rather than padded with junk — a table full
// of hapax typos and proper nouns suggests worse than a smaller honest one.
const WORD_TARGET = 30_000;
const PHRASE_TARGET = 20_000;
// Tatoeba is human-written and peer-reviewed, so a word seen ONCE is a real word
// rather than a crawl artifact — there is no hapax junk here to filter out. A
// frequency floor above 1 therefore buys no quality and costs a lot of
// vocabulary in the low-resource languages, which are precisely the ones that
// need every entry they can get (it roughly halved Korean and Vietnamese). The
// target cap plus the frequency sort is what keeps quality: where the corpus is
// large the cap binds long before the floor ever would. Phrases keep a floor of
// 2 because a bigram seen once is not a "common phrase" by any reading.
const MIN_WORD_FREQ = 1;
const MIN_PHRASE_FREQ = 2;
const PHRASE_SIZES = [2, 3];

// Bounds on the counting pass. The n-gram map is what grows without limit (the
// English corpus alone is ~1.5M sentences), so we cap the sentences read and
// prune singleton n-grams whenever the map gets large. Pruning only ever drops
// count-1 entries, which cannot be in the top PHRASE_TARGET of any language.
const MAX_SENTENCES = 600_000;
const PRUNE_AT = 2_000_000;

// Matches suggest.ts's WORD_TAIL exactly: letters, marks and apostrophes. If the
// two ever disagree, the editor looks up a token shape the tables never contain.
const WORD_RE = /[\p{L}\p{M}']+/gu;
const WORD_ONLY = /^[\p{L}\p{M}']+$/u;

const segmenters = new Map();
function segmenterFor(locale) {
  let s = segmenters.get(locale);
  if (!s) {
    s = new Intl.Segmenter(locale, { granularity: "word" });
    segmenters.set(locale, s);
  }
  return s;
}

function tokenize(text, locale) {
  // Curly apostrophes are common in corpora and would otherwise split a word.
  const norm = text.replace(/[‘’]/g, "'").toLowerCase();
  if (!UNSPACED.has(locale)) return norm.match(WORD_RE) ?? [];
  const out = [];
  for (const part of segmenterFor(locale).segment(norm)) {
    if (part.isWordLike && WORD_ONLY.test(part.segment)) out.push(part.segment);
  }
  return out;
}

function bump(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** Drop count-1 entries to bound memory; they can never reach the top slice. */
function prune(map) {
  for (const [key, n] of map) if (n < 2) map.delete(key);
}

/** Most frequent first, filtered by a floor, capped at `limit`. */
function top(map, floor, limit) {
  const kept = [];
  for (const [key, n] of map) if (n >= floor) kept.push([key, n]);
  kept.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return kept.slice(0, limit).map(([key]) => key);
}

async function download(code) {
  const file = join(CACHE, `${code}_sentences.tsv.bz2`);
  if (existsSync(file) && statSync(file).size > 0) return file;
  const url = `https://downloads.tatoeba.org/exports/per_language/${code}/${code}_sentences.tsv.bz2`;
  process.stdout.write(`  fetching ${url}\n`);
  await run("curl", ["-sSfL", "--max-time", "900", "-o", file, url]);
  return file;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

/** Stream a .bz2 export through `bzip2 -dc`, one sentence per callback. */
function readSentences(file, onSentence) {
  return new Promise((resolve, reject) => {
    const child = spawn("bzip2", ["-dc", file], { stdio: ["ignore", "pipe", "inherit"] });
    child.on("error", (err) =>
      reject(
        err.code === "ENOENT"
          ? new Error("bzip2 not found on PATH — needed to read the Tatoeba exports")
          : err,
      ),
    );
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    let seen = 0;
    let capped = false;
    rl.on("line", (line) => {
      if (seen >= MAX_SENTENCES) {
        capped = true;
        return;
      }
      // Tatoeba TSV: id \t lang \t text
      const text = line.slice(line.indexOf("\t", line.indexOf("\t") + 1) + 1);
      if (text) {
        seen++;
        onSentence(text);
      }
    });
    rl.on("close", () => resolve({ seen, capped }));
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`bzip2 exited ${code}`));
    });
  });
}

async function build(locale, code) {
  const file = await download(code);
  const words = new Map();
  const phrases = new Map();
  const unspaced = UNSPACED.has(locale);
  const glue = unspaced ? "" : " ";

  const { seen, capped } = await readSentences(file, (text) => {
    const toks = tokenize(text, locale);
    for (const tok of toks) if (tok.length >= 2) bump(words, tok);
    for (const n of PHRASE_SIZES) {
      for (let i = 0; i + n <= toks.length; i++) {
        bump(phrases, toks.slice(i, i + n).join(glue));
      }
    }
    if (phrases.size > PRUNE_AT) prune(phrases);
  });

  const wordList = top(words, MIN_WORD_FREQ, WORD_TARGET);
  const phraseList = top(phrases, MIN_PHRASE_FREQ, PHRASE_TARGET);

  // Japanese and Chinese never reach suggest.ts's phrase path: it only fires
  // when the caret sits after whitespace, and these languages are typed without
  // any. Their multi-word runs are therefore seeded into `words` too, where the
  // partial-word path CAN complete them, and are the reason `words` is allowed
  // to hold entries containing more than one segmented token.
  const wordsOut = unspaced
    ? [...new Set([...wordList, ...phraseList])].slice(0, WORD_TARGET)
    : wordList;

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    join(OUT, `${locale}.json`),
    JSON.stringify({ words: wordsOut, phrases: phraseList }),
  );
  return { locale, sentences: seen, capped, words: wordsOut.length, phrases: phraseList.length };
}

const only = process.argv.slice(2);
const targets = Object.entries(LOCALES).filter(([loc]) => !only.length || only.includes(loc));
if (!targets.length) {
  console.error(`build-dicts: no such locale(s): ${only.join(", ")}`);
  process.exit(1);
}

mkdirSync(CACHE, { recursive: true });
console.log(`build-dicts: ${targets.length} locale(s) from Tatoeba (CC BY 2.0 FR)\n`);

const rows = [];
for (const [locale, code] of targets) {
  process.stdout.write(`${locale.padEnd(6)} `);
  const row = await build(locale, code);
  rows.push(row);
  console.log(
    `${String(row.sentences).padStart(9)} sentences -> ` +
      `${String(row.words).padStart(6)} words, ${String(row.phrases).padStart(6)} phrases` +
      (row.capped ? `  (capped at ${MAX_SENTENCES})` : ""),
  );
}

// Report shortfalls rather than hiding them. FT-22's floor is "present and
// loadable" (that is what dict:lint enforces); 20k/10k is the target to aim at,
// and a low-resource language simply may not have the corpus behind it.
const thin = rows.filter((r) => r.words < 20_000 || r.phrases < 10_000);
if (thin.length) {
  console.log(`\n${thin.length} locale(s) below the 20k word / 10k phrase target:`);
  for (const r of thin) console.log(`  ${r.locale.padEnd(6)} ${r.words} words, ${r.phrases} phrases`);
  console.log("  (corpus-limited — see NOTICE; not a failure)");
}
console.log(`\nwrote ${rows.length} table(s) to ui/src/dict/`);
