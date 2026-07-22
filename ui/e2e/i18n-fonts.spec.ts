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

    const result = await page.evaluate((families: string[]) => {
      const header = document.querySelector("header");
      const text = (header?.textContent ?? "").replace(/\s+/g, "");

      // Read the ranges the bundled faces THEMSELVES declare.
      //
      // Not `document.fonts.check()`, which is the obvious way to write this and
      // is worse than useless here: it answers "is the face covering this
      // character already loaded", so when NO face covers the character — or the
      // family does not exist at all — it returns `true`. Written that way, this
      // whole spec passed with all six font packages uninstalled.
      const faces = [...document.fonts].filter((f) => families.includes(f.family));
      const ranges = faces.flatMap((face) =>
        // A face with no `unicode-range` claims everything, per CSS.
        (face.unicodeRange || "U+0-10FFFF").split(",").map((part) => {
          const span = part.trim().slice(2); // drop "U+"
          // Wildcard form, e.g. `U+30??` — the ? digits span 0..F.
          if (span.includes("?")) {
            return [
              parseInt(span.replaceAll("?", "0"), 16),
              parseInt(span.replaceAll("?", "F"), 16),
            ];
          }
          const [lo, hi = lo] = span.split("-");
          return [parseInt(lo, 16), parseInt(hi, 16)];
        }),
      );
      const uncovered = [...new Set(text)].filter((ch) => {
        const cp = ch.codePointAt(0)!;
        return !ranges.some(([lo, hi]) => cp >= lo && cp <= hi);
      });
      return { text, uncovered, faceCount: faces.length };
    }, NOTO);

    // Both guards matter: with zero faces registered there are zero ranges, and
    // an empty toolbar has zero characters to check. Either would make the
    // assertion below pass by having nothing to say.
    expect(result.faceCount, "no bundled Noto face is registered at all").toBeGreaterThan(0);
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
