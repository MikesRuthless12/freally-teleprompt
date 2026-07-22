/**
 * The eighteen shipped locales, in the order the Havoc apps use them (English
 * first, then alphabetical by code). The sibling Freally apps ship the same
 * list — keep them in step.
 *
 * `native` is what the language picker shows: a speaker should recognise their
 * own language without reading English. `dir` drives `<html dir>`; Arabic is the
 * only right-to-left locale in the set.
 */
export type LocaleCode =
  | "en"
  | "ar"
  | "zh-CN"
  | "nl"
  | "fr"
  | "de"
  | "hi"
  | "id"
  | "it"
  | "ja"
  | "ko"
  | "pl"
  | "pt-BR"
  | "ru"
  | "es"
  | "tr"
  | "uk"
  | "vi";

export type Locale = {
  code: LocaleCode;
  /** The language's own name for itself. */
  native: string;
  dir: "ltr" | "rtl";
};

export const LOCALES: readonly Locale[] = [
  { code: "en", native: "English", dir: "ltr" },
  { code: "ar", native: "العربية", dir: "rtl" },
  { code: "zh-CN", native: "简体中文", dir: "ltr" },
  { code: "nl", native: "Nederlands", dir: "ltr" },
  { code: "fr", native: "Français", dir: "ltr" },
  { code: "de", native: "Deutsch", dir: "ltr" },
  { code: "hi", native: "हिन्दी", dir: "ltr" },
  { code: "id", native: "Bahasa Indonesia", dir: "ltr" },
  { code: "it", native: "Italiano", dir: "ltr" },
  { code: "ja", native: "日本語", dir: "ltr" },
  { code: "ko", native: "한국어", dir: "ltr" },
  { code: "pl", native: "Polski", dir: "ltr" },
  { code: "pt-BR", native: "Português (Brasil)", dir: "ltr" },
  { code: "ru", native: "Русский", dir: "ltr" },
  { code: "es", native: "Español", dir: "ltr" },
  { code: "tr", native: "Türkçe", dir: "ltr" },
  { code: "uk", native: "Українська", dir: "ltr" },
  { code: "vi", native: "Tiếng Việt", dir: "ltr" },
] as const;

/** The catalog every other locale falls back to, key by key. */
export const SOURCE_LOCALE: LocaleCode = "en";

/**
 * The order every language picker shows: English first, then the other
 * seventeen alphabetically BY THEIR OWN NATIVE NAME. This is a display order
 * only — `LOCALES` above stays in the shared Havoc order, which the sibling apps
 * also ship and which other code indexes.
 *
 * Collated with a FIXED locale, deliberately never the active one. Collation is
 * language-specific, so `localeCompare` under the running UI language quietly
 * reorders the list — Turkish alone moves entries, because it collates a
 * dotless i apart from i. A picker whose order depends on which language happens
 * to be selected is one the user must re-scan on every visit, and the entry they
 * want has moved. Pinning the collator makes the order identical in all 18.
 *
 * English is pinned to the top rather than sorted in because it is the source
 * catalog and the fallback every other locale resolves to, so it is the entry a
 * user reaches for when they cannot read the current one.
 */
const PICKER_COLLATOR = new Intl.Collator("en");
export const PICKER_LOCALES: readonly Locale[] = [
  ...LOCALES.filter((l) => l.code === "en"),
  ...LOCALES.filter((l) => l.code !== "en").sort((a, b) =>
    PICKER_COLLATOR.compare(a.native, b.native),
  ),
];

/**
 * Persisted in `Settings.language` to mean "follow the operating system".
 * A real BCP-47 tag there means the user chose it explicitly and we honour it.
 * The Rust `validate()` rejects an empty tag, so the sentinel is a word.
 */
export const AUTO_LOCALE = "auto";

const BY_CODE = new Map(LOCALES.map((l) => [l.code.toLowerCase(), l]));

export function isLocaleCode(value: string): value is LocaleCode {
  return BY_CODE.has(value.toLowerCase());
}

export function localeDir(code: LocaleCode): "ltr" | "rtl" {
  return BY_CODE.get(code.toLowerCase())?.dir ?? "ltr";
}

/**
 * Match one tag against the eighteen, or `null` if we ship nothing for it.
 *
 * Region matters for exactly two of them: `pt` collapses to `pt-BR` and any
 * Chinese to `zh-CN`, because those are the only variants we ship. Everything
 * else drops its region (`fr-CA` → `fr`).
 *
 * Both public resolvers below go through this, so those two collapse rules
 * exist in exactly one place. They used to be written twice — which meant an
 * explicitly-chosen `"pt-PT"` and the same tag arriving from the OS could have
 * resolved differently, with nothing to point at.
 */
function matchShipped(tag: string): LocaleCode | null {
  const lower = tag.trim().toLowerCase();
  if (!lower) return null;
  if (isLocaleCode(lower)) return BY_CODE.get(lower)!.code;

  const base = lower.split("-")[0];
  if (base === "pt") return "pt-BR";
  if (base === "zh") return "zh-CN";
  return isLocaleCode(base) ? BY_CODE.get(base)!.code : null;
}

/**
 * Map an OS/browser language tag onto one of the eighteen. Unknown tags fall
 * back to English rather than throwing — a user with an unshipped locale still
 * gets an app.
 */
export function normalizeLocale(tag: string): LocaleCode {
  return matchShipped(tag) ?? SOURCE_LOCALE;
}

/** The first of the user's preferred languages that we actually ship. */
export function detectLocale(preferred: readonly string[]): LocaleCode {
  for (const tag of preferred) {
    const hit = matchShipped(tag);
    if (hit) return hit;
  }
  return SOURCE_LOCALE;
}

/**
 * Resolve what `Settings.language` means. `"auto"` — or a tag we do not ship —
 * defers to the OS; an explicit, shipped tag wins.
 *
 * Falling back to the OS rather than straight to English matters for the
 * unshipped case: a hand-edited `settings.json` naming a locale we don't have
 * should still land on the user's own language, not on English. (Rust keeps any
 * non-blank tag, so that value really can reach here.)
 */
export function resolveLocale(setting: string, preferred: readonly string[]): LocaleCode {
  if (!setting || setting === AUTO_LOCALE) return detectLocale(preferred);
  return matchShipped(setting) ?? detectLocale(preferred);
}

/**
 * Resolve `Settings.autocompleteLanguage` (FT-20) to the table the editor
 * completes against. `"auto"` follows the UI language.
 *
 * An unshipped tag falls back to the UI language rather than to English: it is
 * the same reasoning as `resolveLocale`'s OS fallback — someone writing Ukrainian
 * in a Ukrainian app should not silently start being offered English words
 * because a hand-edited settings file named a locale we ship no table for.
 */
export function resolveAutocompleteLocale(setting: string, uiLocale: LocaleCode): LocaleCode {
  if (!setting || setting === AUTO_LOCALE) return uiLocale;
  return matchShipped(setting) ?? uiLocale;
}
