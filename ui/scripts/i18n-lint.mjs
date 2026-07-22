#!/usr/bin/env node
/**
 * i18n parity + coverage lint. Fails the build when a catalog drifts.
 *
 * Three checks, in the order a bug usually appears:
 *
 *   1. PARITY   — every locale defines exactly the keys `en` defines. A missing
 *                 key silently renders English; an extra key is dead weight that
 *                 nobody will ever delete.
 *   2. SYNTAX   — no duplicate keys inside one catalog. Fluent keeps the first
 *                 definition and drops the rest, so a duplicate is a string that
 *                 looks translated and isn't.
 *   3. COVERAGE — every literal `t("key")` in the source resolves to a key in
 *                 `en`. Catches a typo'd id that would ship as raw `some-key`.
 *
 * Cloned from Freally Capture's `ui/scripts/i18n-lint.mjs`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const UI = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES_DIR = join(UI, "src/i18n/locales");
const SRC = join(UI, "src");
const SOURCE = "en";

/**
 * Keys whose ids the lint cannot follow because they're built at runtime.
 * Empty for now — add a prefix here only with a note on who supplies the id.
 */
const DYNAMIC_PREFIXES = [];

const fail = [];

// --- parse -----------------------------------------------------------------

/** A deliberately small Fluent reader: `key = value`, `#` comments, blanks. */
function parse(text, file) {
  const keys = new Map();
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.trimStart().startsWith("#")) return;
    // Continuation lines are indented; we don't use them yet, so reject them
    // rather than silently mis-parse a multiline value.
    if (/^\s/.test(line)) {
      fail.push(`${file}:${i + 1}: indented continuation lines are not supported yet`);
      return;
    }
    const eq = line.indexOf("=");
    if (eq < 0) {
      fail.push(`${file}:${i + 1}: not a \`key = value\` line: ${line}`);
      return;
    }
    const key = line.slice(0, eq).trim();
    if (keys.has(key)) {
      fail.push(`${file}:${i + 1}: duplicate key "${key}" (Fluent keeps the first and drops this)`);
      return;
    }
    keys.set(key, line.slice(eq + 1).trim());
  });
  return keys;
}

const catalogs = new Map();
for (const name of readdirSync(LOCALES_DIR).sort()) {
  if (!name.endsWith(".ftl")) continue;
  const code = name.slice(0, -4);
  const file = relative(UI, join(LOCALES_DIR, name));
  catalogs.set(code, parse(readFileSync(join(LOCALES_DIR, name), "utf8"), file));
}

if (!catalogs.has(SOURCE)) {
  console.error(`i18n-lint: no ${SOURCE}.ftl — there is nothing to compare against.`);
  process.exit(1);
}

// --- 1. parity -------------------------------------------------------------

const source = catalogs.get(SOURCE);
for (const [code, keys] of catalogs) {
  if (code === SOURCE) continue;
  const missing = [...source.keys()].filter((k) => !keys.has(k));
  const extra = [...keys.keys()].filter((k) => !source.has(k));
  if (missing.length)
    fail.push(`${code}.ftl: missing ${missing.length} key(s): ${missing.join(", ")}`);
  if (extra.length)
    fail.push(`${code}.ftl: ${extra.length} key(s) not in ${SOURCE}: ${extra.join(", ")}`);
  // An untranslated value is not an error — English is layered underneath — but
  // an *empty* one renders as nothing at all, which no fallback can rescue.
  for (const [key, value] of keys) {
    if (!value)
      fail.push(
        `${code}.ftl: "${key}" is empty (renders as nothing; delete it to fall back to ${SOURCE})`,
      );
  }
}

// --- 2/3. coverage ---------------------------------------------------------

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === "i18n" || entry === "__tests__") continue;
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

const CALL = /\bt\(\s*"([^"]+)"/g;
let referenced = 0;
for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  for (const [, key] of text.matchAll(CALL)) {
    referenced++;
    if (source.has(key)) continue;
    if (DYNAMIC_PREFIXES.some((p) => key.startsWith(p))) continue;
    fail.push(`${relative(UI, file)}: t("${key}") has no key in ${SOURCE}.ftl`);
  }
}

// --- report ----------------------------------------------------------------

if (fail.length) {
  console.error("i18n-lint FAILED\n");
  for (const line of fail) console.error("  " + line);
  console.error(`\n${fail.length} problem(s).`);
  process.exit(1);
}

console.log(
  `i18n-lint ok — ${catalogs.size} locales x ${source.size} keys, ` +
    `${referenced} t() reference(s) resolved.`,
);
