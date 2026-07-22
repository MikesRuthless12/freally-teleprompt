import { expect, test } from "@playwright/test";

import { mockTauri } from "./mock-ipc";

/**
 * Every language, in the fonts the app actually ships (standing DoD check).
 *
 * The app switches between 18 languages at runtime, and it bundles Noto so that
 * none of them depends on what the user's machine happens to have installed.
 * Nothing else in the suite would notice if that broke: `i18n:lint` proves the
 * STRINGS exist, and a screenshot proves *something* painted — but a missing
 * font renders as tofu boxes (□□□), which is still "text on screen" to every
 * other assertion. Arabic, Hindi, Japanese, Korean and Chinese would each fail
 * silently and only for users who read them.
 *
 * So this asserts the real thing: for each locale, take the app's own
 * translated chrome and prove every character in it is covered by one of the
 * BUNDLED families — not by a system font that happens to exist on this
 * machine, and not by a fallback that will not exist on someone else's.
 */

/** The bundled families, mirroring `ui/src/lib/fonts.ts` and `main.tsx`. */
const NOTO = [
  "Noto Sans Variable",
  "Noto Sans Arabic Variable",
  "Noto Sans Devanagari Variable",
  "Noto Sans JP Variable",
  "Noto Sans KR Variable",
  "Noto Sans SC Variable",
];

/** Every locale the app ships — mirror of `ui/src/i18n/locales.ts`. */
const LOCALES = [
  "en",
  "ar",
  "de",
  "es",
  "fr",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "nl",
  "pl",
  "pt-BR",
  "ru",
  "tr",
  "uk",
  "vi",
  "zh-CN",
];

/** Locales worth an eyeball in the gallery: one per non-Latin script. */
const SCREENSHOT = new Set(["ar", "hi", "ja", "ko", "ru", "zh-CN"]);

for (const locale of LOCALES) {
  test(`${locale}: every character of the UI is covered by a bundled Noto font`, async ({
    page,
  }) => {
    await mockTauri(page, { language: locale });
    await page.goto("/");

    // The toolbar is translated chrome that exists in every locale.
    await expect(page.getByTestId("transport")).toBeVisible();

    const result = await page.evaluate(async (families: string[]) => {
      const header = document.querySelector("header");
      const text = (header?.textContent ?? "").replace(/\s+/g, "");
      // Ask the browser to load only the subsets these characters need — with
      // `unicode-range` splitting, an unloaded subset reports as "cannot
      // render" and the check would fail for the wrong reason.
      await Promise.all(
        families.map((f) => document.fonts.load(`16px "${f}"`, text).catch(() => undefined)),
      );
      const uncovered = [...new Set(text)].filter(
        (ch) => !families.some((f) => document.fonts.check(`16px "${f}"`, ch)),
      );
      return { text, uncovered };
    }, NOTO);

    // A locale whose chrome came back empty would make the check vacuous.
    expect(result.text.length, "the toolbar rendered no text at all").toBeGreaterThan(10);
    expect(
      result.uncovered,
      `these characters have no bundled font and would render as tofu: ${result.uncovered.join(" ")}`,
    ).toEqual([]);

    if (SCREENSHOT.has(locale)) {
      await page.screenshot({ path: `e2e/screenshots/lang-${locale}.png` });
    }
  });
}

test("the app's own body font resolves to the bundled Noto, not a system font", async ({
  page,
}) => {
  await mockTauri(page);
  await page.goto("/");

  // Bundling Noto is pointless if the CSS never asks for it — this is the check
  // that the wiring survives, independently of whether any glyph is missing.
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toContain("Noto Sans Variable");

  const loaded = await page.evaluate(() =>
    [...document.fonts].map((f) => f.family).filter((f) => f.startsWith("Noto")),
  );
  expect(loaded.length, "no Noto face was registered at all").toBeGreaterThan(0);
});
