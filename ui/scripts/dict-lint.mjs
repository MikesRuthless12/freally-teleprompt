#!/usr/bin/env node
/**
 * FT-22 — autocomplete data lint. Fails the build when a language's table is
 * missing, unreadable, or present-but-useless.
 *
 * The shipped languages are whatever `src/i18n/locales/*.ftl` says they are, so
 * adding a nineteenth locale fails here until its table exists rather than
 * shipping one language that silently never suggests anything.
 *
 * "Fails to load" is checked by actually parsing the JSON, and the shape checks
 * mirror what `lib/suggest.ts` does with it. That last part matters more than it
 * looks: `buildIndex()` skips every entry shorter than two characters and keys
 * buckets off `slice(0, 2)` of an already-lowercased string, so a table of
 * single characters — or one that shipped in Title Case — parses cleanly, loads
 * cleanly, indexes to nothing, and suggests nothing. Presence is not the test;
 * a table that survives indexing is.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const UI = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES_DIR = join(UI, "src/i18n/locales");
const DICT_DIR = join(UI, "src/dict");

const fail = [];
const rows = [];

const locales = readdirSync(LOCALES_DIR)
  .filter((n) => n.endsWith(".ftl"))
  .map((n) => n.slice(0, -4))
  .sort();

if (!locales.length) {
  console.error("dict-lint: no catalogs in src/i18n/locales — nothing to check against.");
  process.exit(1);
}

/** Entries that survive suggest.ts's indexing, i.e. can ever be suggested. */
function indexable(list) {
  return list.filter((s) => typeof s === "string" && s.length >= 2);
}

for (const code of locales) {
  const file = join(DICT_DIR, `${code}.json`);
  const shown = relative(UI, file);

  let raw;
  try {
    if (!statSync(file).isFile()) throw new Error("not a file");
    raw = readFileSync(file, "utf8");
  } catch {
    fail.push(`${code}: no table at ${shown} — every shipped language needs one`);
    continue;
  }

  let dict;
  try {
    dict = JSON.parse(raw);
  } catch (err) {
    fail.push(`${shown}: does not parse (${err.message})`);
    continue;
  }

  for (const key of ["words", "phrases"]) {
    const list = dict?.[key];
    if (!Array.isArray(list)) {
      fail.push(`${shown}: "${key}" is missing or not an array`);
      continue;
    }
    if (!list.length) {
      fail.push(`${shown}: "${key}" is empty`);
      continue;
    }
    const usable = indexable(list);
    if (!usable.length) {
      fail.push(
        `${shown}: no entry in "${key}" is at least 2 characters — ` +
          `suggest.ts indexes none of them, so this table can never suggest anything`,
      );
      continue;
    }
    const cased = list.find((s) => typeof s === "string" && s !== s.toLowerCase());
    if (cased) {
      fail.push(
        `${shown}: "${key}" contains a non-lowercase entry (${JSON.stringify(cased)}) — ` +
          `lookups lowercase the typed text, so it could never match`,
      );
    }
    rows.push({ code, key, total: list.length, usable: usable.length });
  }
}

if (fail.length) {
  console.error("dict-lint FAILED\n");
  for (const line of fail) console.error("  " + line);
  console.error(`\n${fail.length} problem(s). Rebuild with \`node scripts/build-dicts.mjs\`.`);
  process.exit(1);
}

const words = rows.filter((r) => r.key === "words");
const phrases = rows.filter((r) => r.key === "phrases");
const sum = (rs) => rs.reduce((n, r) => n + r.usable, 0);
console.log(
  `dict-lint ok — ${locales.length} locales, ` +
    `${sum(words).toLocaleString("en-US")} words + ` +
    `${sum(phrases).toLocaleString("en-US")} phrases indexable.`,
);
