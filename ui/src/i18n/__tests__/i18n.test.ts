import { describe, expect, it } from "vitest";

import { bundleFor, catalogSource, loadedLocales } from "../bundle";
import {
  AUTO_LOCALE,
  detectLocale,
  isLocaleCode,
  LOCALES,
  localeDir,
  normalizeLocale,
  PICKER_LOCALES,
  resolveLocale,
  SOURCE_LOCALE,
} from "../locales";
import { t } from "../t";
import { FONT_FAMILY_IDS } from "../../lib/fonts";

/** `key = value` ids from a catalog, ignoring comments and blank lines. */
function keysOf(source: string): Set<string> {
  const keys = new Set<string>();
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#") || /^\s/.test(line)) continue;
    const eq = line.indexOf("=");
    if (eq > 0) keys.add(line.slice(0, eq).trim());
  }
  return keys;
}

/**
 * The typeface picker builds its ids at runtime — `t(\`settings-font-${id}\`)` —
 * so `i18n-lint`'s scanner, which only sees string literals, cannot check them.
 * This is that check: every id the picker can render must resolve to a real key,
 * or the Settings dropdown ships showing raw ids like `settings-font-slab`.
 */
describe("typeface picker keys (FT-15)", () => {
  it("every font id resolves to a string, not its own id", () => {
    const source = keysOf(catalogSource(SOURCE_LOCALE));
    for (const id of FONT_FAMILY_IDS) {
      const key = `settings-font-${id}`;
      expect(source.has(key), `${key} missing from ${SOURCE_LOCALE}.ftl`).toBe(true);
      expect(t(key)).not.toBe(key);
    }
  });
});

describe("locale registry", () => {
  it("ships exactly eighteen locales", () => {
    expect(LOCALES).toHaveLength(18);
    expect(loadedLocales()).toHaveLength(18);
  });

  it("has no duplicate codes", () => {
    const codes = LOCALES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("marks Arabic — and only Arabic — as right-to-left", () => {
    const rtl = LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code);
    expect(rtl).toEqual(["ar"]);
    expect(localeDir("ar")).toBe("rtl");
    expect(localeDir("en")).toBe("ltr");
  });

  it("gives every locale a native name that is not just its code", () => {
    for (const locale of LOCALES) {
      expect(locale.native.trim()).not.toBe("");
      expect(locale.native.toLowerCase()).not.toBe(locale.code.toLowerCase());
    }
  });
});

/**
 * The picker order is a product requirement, not a nicety: English first, then
 * the rest alphabetically by their own native name, and IDENTICAL in all 18
 * languages. The last part is the one that silently breaks — sorting with the
 * active locale's collator looks right in English and quietly reorders the list
 * everywhere else, so the assertion below compares against the *pinned* order.
 */
describe("language picker order", () => {
  it("lists English first", () => {
    expect(PICKER_LOCALES[0].code).toBe("en");
  });

  it("holds every locale exactly once", () => {
    expect(PICKER_LOCALES).toHaveLength(LOCALES.length);
    expect(new Set(PICKER_LOCALES.map((l) => l.code)).size).toBe(LOCALES.length);
  });

  it("sorts the other seventeen by native name", () => {
    expect(PICKER_LOCALES.map((l) => l.code)).toEqual([
      "en",
      "id", // Bahasa Indonesia
      "de", // Deutsch
      "es", // Español
      "fr", // Français
      "it", // Italiano
      "nl", // Nederlands
      "pl", // Polski
      "pt-BR", // Português (Brasil)
      "vi", // Tiếng Việt  — before Türkçe: "i" collates before "ü"
      "tr", // Türkçe
      "ru", // Русский      — Cyrillic follows Latin
      "uk", // Українська
      "ar", // العربية
      "hi", // हिन्दी
      "ko", // 한국어
      "ja", // 日本語
      "zh-CN", // 简体中文
    ]);
  });

  // Proves the pinned collator is load-bearing rather than decoration. If this
  // ever stops failing to match, collation has become locale-independent and the
  // pinning could go — but until then, sorting with the ACTIVE locale is a real
  // bug: under Arabic it lifts العربية to second place, and under Japanese it
  // lifts 日本語 and 简体中文 above Cyrillic. The user's entry moves when they
  // switch language, which is exactly what the pinning exists to prevent.
  it("would reorder if the active locale did the collating", () => {
    const pinned = PICKER_LOCALES.map((l) => l.code);
    const orderUnder = (code: string) => {
      const collator = new Intl.Collator(code);
      return [
        "en",
        ...LOCALES.filter((l) => l.code !== "en")
          .slice()
          .sort((a, b) => collator.compare(a.native, b.native))
          .map((l) => l.code),
      ];
    };
    expect(orderUnder("ar")).not.toEqual(pinned);
    expect(orderUnder("ja")).not.toEqual(pinned);
  });
});

describe("catalog parity", () => {
  // The lint script enforces this at build time too; asserting it here means a
  // dropped key fails `npm test` as well, not only the separate lint step.
  it("defines exactly the English key set in every locale", () => {
    const expected = keysOf(catalogSource(SOURCE_LOCALE));
    expect(expected.size).toBeGreaterThan(20);
    for (const code of loadedLocales()) {
      const actual = keysOf(catalogSource(code));
      const missing = [...expected].filter((k) => !actual.has(k));
      const extra = [...actual].filter((k) => !expected.has(k));
      expect({ code, missing, extra }).toEqual({ code, missing: [], extra: [] });
    }
  });

  it("resolves every English key to a non-empty string in every locale", () => {
    for (const code of loadedLocales()) {
      const bundle = bundleFor(code);
      for (const key of keysOf(catalogSource(SOURCE_LOCALE))) {
        const message = bundle.getMessage(key);
        expect(message?.value, `${code} is missing a value for "${key}"`).toBeTruthy();
      }
    }
  });

  it("keeps the product name untranslated in every locale", () => {
    for (const code of loadedLocales()) {
      const bundle = bundleFor(code);
      const message = bundle.getMessage("app-name");
      expect(bundle.formatPattern(message!.value!, undefined, [])).toBe("Freally Teleprompt");
    }
  });

  it("keeps the literal ' -- ' caesura token intact where it is app syntax", () => {
    // The user types these characters exactly; a locale that "helpfully" turns
    // them into an em dash documents syntax that does not work.
    for (const code of loadedLocales()) {
      const source = catalogSource(code);
      const line = source.split(/\r?\n/).find((l) => l.startsWith("editor-placeholder"));
      expect(line, `${code} has no editor-placeholder`).toBeTruthy();
      expect(line, `${code} mangled the -- token`).toContain("--");
      expect(line, `${code} used an em/en dash for the token`).not.toMatch(/[—–]/);
    }
  });
});

describe("locale resolution", () => {
  it("recognises the shipped codes", () => {
    expect(isLocaleCode("en")).toBe(true);
    expect(isLocaleCode("pt-BR")).toBe(true);
    expect(isLocaleCode("PT-br")).toBe(true);
    expect(isLocaleCode("kl")).toBe(false);
  });

  it("collapses the two regional variants we actually ship", () => {
    expect(normalizeLocale("pt")).toBe("pt-BR");
    expect(normalizeLocale("pt-PT")).toBe("pt-BR");
    expect(normalizeLocale("zh")).toBe("zh-CN");
    expect(normalizeLocale("zh-TW")).toBe("zh-CN");
  });

  it("drops the region for everything else", () => {
    expect(normalizeLocale("fr-CA")).toBe("fr");
    expect(normalizeLocale("de-AT")).toBe("de");
  });

  it("falls back to English rather than throwing on an unshipped tag", () => {
    expect(normalizeLocale("kl-GL")).toBe("en");
    expect(normalizeLocale("")).toBe("en");
  });

  it("picks the first shipped language the user actually prefers", () => {
    expect(detectLocale(["kl", "sw", "ja", "fr"])).toBe("ja");
    expect(detectLocale(["kl", "sw"])).toBe("en");
    expect(detectLocale([])).toBe("en");
  });

  /**
   * The two collapse rules must behave identically whether a tag was chosen
   * explicitly or came from the OS list. They were previously implemented twice,
   * and the tests only ever exercised the `normalizeLocale` copy — so a
   * regression in the `detectLocale` copy would have passed green.
   */
  it("applies the same pt/zh collapse rules when detecting from the OS list", () => {
    expect(detectLocale(["pt"])).toBe("pt-BR");
    expect(detectLocale(["pt-PT"])).toBe("pt-BR");
    expect(detectLocale(["zh"])).toBe("zh-CN");
    expect(detectLocale(["zh-TW"])).toBe("zh-CN");
    expect(detectLocale(["fr-CA"])).toBe("fr");
    // And an unshipped tag is skipped rather than ending the search.
    expect(detectLocale(["kl-GL", "zh-TW"])).toBe("zh-CN");
  });

  it("resolves an explicit tag and the same tag from the OS identically", () => {
    // The invariant, stated directly: however a tag reaches us, it lands on the
    // same locale. This is what having one `matchShipped` buys.
    for (const tag of ["pt", "pt-PT", "zh", "zh-TW", "fr-CA", "ja", "en-GB", "kl-GL"]) {
      expect(normalizeLocale(tag), `mismatch for "${tag}"`).toBe(detectLocale([tag]));
    }
  });

  it("lets an explicit setting beat the OS, and 'auto' defer to it", () => {
    expect(resolveLocale("ja", ["fr"])).toBe("ja");
    expect(resolveLocale(AUTO_LOCALE, ["fr"])).toBe("fr");
    expect(resolveLocale("", ["fr"])).toBe("fr");
  });

  it("defers to the OS when the saved tag is one we do not ship", () => {
    // A hand-edited settings.json can hold anything; Rust keeps any non-blank
    // tag. Landing on the user's own language beats landing on English.
    expect(resolveLocale("kl-GL", ["ja"])).toBe("ja");
    expect(resolveLocale("kl-GL", [])).toBe("en");
  });
});

describe("t()", () => {
  it("formats a placeable", () => {
    expect(t("eula-version", { version: "2026-07-21" })).toContain("2026-07-21");
  });

  it("shows the raw id for a missing key, rather than silently blank text", () => {
    expect(t("no-such-key-exists")).toBe("no-such-key-exists");
  });
});
