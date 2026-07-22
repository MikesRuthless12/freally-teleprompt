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
 * Values that may legitimately read the same in a locale as they do in English:
 * proper nouns, borrowed words, and typographic terms that genuinely are not
 * translated. Everything NOT listed here must differ from `en`.
 *
 * This is a ratchet, not a style rule. Every bulk-translation pass falls back to
 * English for anything it has no translation for, and the result parses, passes
 * key-parity, and ships — an English string sitting in `ja.ftl` looks exactly
 * like a translated one to every other check. This list was generated from the
 * catalogs as they stood when all 18 were fully translated, so any NEW match is
 * a phase that left a fallback behind.
 *
 * To add an entry, justify it in the comment. "I could not find a translation"
 * is not a justification; it is the thing this check exists to catch.
 */
const SAME_AS_ENGLISH_OK = {
  "app-name": "*", // a product name, identical everywhere on purpose
  "projector-window-title": ["nl"], // the product name plus a Dutch cognate
  "about-copyright": ["ja", "ko"], // the legal phrase is left in English
  "about-version": ["de", "fr"], // "Version" is the word in both
  "eula-version": ["de", "fr"],
  "about-website": ["de", "nl"], // "Website" is the word in both
  "editor-label": ["fr", "nl"], // "Script" is the word in both
  "library-title": ["fr", "nl"],
  "toolbar-library": ["fr", "nl"],
  "library-delete-no": ["es", "it"], // "No" really is the Spanish/Italian for no
  "settings-cat-general": ["es"], // "General" is the Spanish word
  // "Editor" is the ordinary word for a text editor in all six, not a fallback.
  // (The autocomplete strings under it ARE translated in every locale.)
  "settings-cat-editor": ["de", "es", "id", "it", "nl", "pt-BR"],
  "settings-cat-projector": ["nl"], // "Projector" is the Dutch word
  "settings-section-projector": ["nl"],
  "settings-lan-port": ["de", "fr", "id", "pl"], // "Port" is borrowed as-is
  "settings-ok": ["de", "fr", "id", "it", "ja", "nl", "pl", "pt-BR", "vi"], // "OK" is borrowed
  "transport-pause": ["de", "fr"], // "Pause" is the word in both
  // Typographic terms, borrowed rather than translated in these languages.
  "settings-font-system": ["de"],
  "settings-font-sans": ["es"],
  "settings-font-serif": ["de", "es"],
  "settings-font-mono": ["de"],
  "settings-font-slab": ["de", "es", "id", "it", "nl", "pt-BR", "tr"],
};

/**
 * Keys whose ids the lint cannot follow because they're built at runtime.
 * Empty for now — add a prefix here only with a note on who supplies the id.
 *
 * Note the Settings typeface picker (`t(\`settings-font-${id}\`)`) is NOT listed:
 * a template literal is not matched by the scanner at all, so listing its prefix
 * would buy nothing and would silently exempt `settings-font-size` too. Its keys
 * are covered by a unit test instead — see `i18n.test.ts`.
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
  // An *empty* value renders as nothing at all, which no fallback can rescue.
  for (const [key, value] of keys) {
    if (!value)
      fail.push(
        `${code}.ftl: "${key}" is empty (renders as nothing; delete it to fall back to ${SOURCE})`,
      );
  }

  // 1b. UNTRANSLATED — a value byte-identical to English that has no business
  // being. Key parity cannot see this: an English string in `ja.ftl` is a
  // perfectly valid entry. See `SAME_AS_ENGLISH_OK` for why this is a ratchet.
  for (const [key, value] of keys) {
    if (!value || source.get(key) !== value) continue;
    const allowed = SAME_AS_ENGLISH_OK[key];
    if (allowed === "*" || (Array.isArray(allowed) && allowed.includes(code))) continue;
    fail.push(
      `${code}.ftl: "${key}" is still the English text (${JSON.stringify(value)}) — ` +
        `translate it, or add it to SAME_AS_ENGLISH_OK with a reason if that IS the translation`,
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
