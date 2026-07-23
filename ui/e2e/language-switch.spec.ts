import { expect, test, type Locator } from "@playwright/test";

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { mockTauri } from "./mock-ipc";

/**
 * Switching language from the Settings dialog — the real interaction, on every
 * OS the CI runs (standing DoD check).
 *
 * `i18n-fonts.spec.ts` boots the app already set to a locale; that proves the
 * catalogs and the fonts are sound, but it never exercises the thing a user
 * actually does. This drives the dialog: pick the language, press Apply, and
 * the dialog itself must repaint in that language WITHOUT closing — it is the
 * one surface guaranteed to be on screen at the moment the language changes.
 *
 * The assertion is per-locale, against that locale's own catalog. "The text
 * changed" is not enough: switching to Korean and rendering Japanese would pass
 * that, and so would falling back to English for a locale whose catalog failed
 * to load. Each string must be the one `<code>.ftl` defines.
 *
 * Screenshots are uploaded per-OS, because font rasterisation, RTL layout and
 * the native `<select>` are the three things that genuinely differ between
 * Windows, macOS and Linux — a Linux-only gallery would not show that.
 */

/** Every locale the app ships, minus the one it starts in. Mirror of `locales.ts`. */
const LOCALES = [
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

/**
 * Keys the dialog is guaranteed to be rendering, each paired with the element
 * that renders it. Between them they cover the header, the sidebar, the pane
 * and the footer — a partial repaint (a stale memo holding one region in the
 * old language) shows up as a failure rather than passing because the title
 * happened to update.
 *
 * Each is checked against ITS OWN element, never against the whole dialog. The
 * whole-dialog form passes for the wrong reason: Indonesian's `settings-language`
 * is "Bahasa", which is a substring of the `<option>` "Bahasa Indonesia" that is
 * present in every UI language — so that assertion held while the dialog was
 * still entirely in English.
 */
const VISIBLE_KEYS: { key: string; at: (dialog: Locator) => Locator }[] = [
  { key: "settings-title", at: (d) => d.locator("#settings-title") },
  { key: "settings-cat-general", at: (d) => d.getByRole("tab").nth(0) },
  // Index 1 is Editor (FT-20), which sits between General and Reading.
  { key: "settings-cat-editor", at: (d) => d.getByRole("tab").nth(1) },
  { key: "settings-cat-reading", at: (d) => d.getByRole("tab").nth(2) },
  // Index 6 is Voice (FT-31), the last category.
  { key: "settings-cat-voice", at: (d) => d.getByRole("tab").nth(6) },
  {
    key: "settings-language",
    at: (d) => d.locator('label:has(> [data-testid="settings-language"]) > span'),
  },
  { key: "settings-cancel", at: (d) => d.getByTestId("settings-cancel") },
];

/** RTL locales, per `locales.ts` — the switch must flip the document too. */
const RTL = new Set(["ar"]);

// Anchored to this file, not to the working directory: the suite is run both
// from the repo root (`npm run test:e2e`) and from `ui/`, and a cwd-relative
// path silently resolves to a different place depending on which.
const LOCALES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../src/i18n/locales");

/** A deliberately small Fluent reader — the same shape `i18n-lint.mjs` uses. */
function catalog(code: string): Map<string, string> {
  const text = readFileSync(resolve(LOCALES_DIR, `${code}.ftl`), "utf8");
  const keys = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq > 0) keys.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
  }
  return keys;
}

const english = catalog("en");

test.describe("switching language from Settings", () => {
  for (const code of LOCALES) {
    test(`${code}: the Settings dialog repaints in ${code} and stays open`, async ({ page }) => {
      await mockTauri(page);
      await page.goto("/");

      // English to start with, so every assertion below is a real change.
      await page.getByRole("button", { name: "Settings" }).click();
      const dialog = page.getByTestId("settings-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(english.get("settings-title")!);

      await dialog.getByTestId("settings-language").selectOption(code);
      await dialog.getByTestId("settings-apply").click();

      // Still open: the language changed under a live dialog, which is the case
      // that breaks if a surface reads its strings once instead of subscribing.
      await expect(dialog, "Apply closed the dialog").toBeVisible();

      const expected = catalog(code);
      for (const { key, at } of VISIBLE_KEYS) {
        const value = expected.get(key);
        expect(value, `${code}.ftl is missing ${key}`).toBeTruthy();
        await expect(at(dialog), `${key} did not switch to ${code}`).toHaveText(value!);
      }

      // The document follows too — `dir` is what mirrors the whole layout, and
      // Arabic chrome laid out left-to-right would still satisfy the text checks.
      await expect(page.locator("html")).toHaveAttribute("lang", code);
      await expect(page.locator("html")).toHaveAttribute("dir", RTL.has(code) ? "rtl" : "ltr");

      // No field label may wrap. Every one of them sits beside a full-width
      // control, so a label with no `shrink-0` gets squeezed — and CJK breaks
      // between ANY two characters, so Korean's 언어 stacked as 언/어 while
      // every Latin and Cyrillic locale looked perfect. A wrapped line box is
      // measurable, which beats hoping someone notices it in a screenshot.
      // Measured with a Range over the text, NOT `el.getClientRects()`: these
      // spans are flex items, so they are blockified and report exactly one
      // border box however many lines the text inside them occupies. A Range
      // returns one rect per line box, which is the thing actually being asked.
      const wrapped = await dialog.evaluate((root) =>
        [...root.querySelectorAll("label > span")]
          .filter((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            return range.getClientRects().length > 1;
          })
          .map((el) => el.textContent ?? ""),
      );
      expect(
        wrapped,
        `these labels wrapped onto more than one line: ${wrapped.join(", ")}`,
      ).toEqual([]);

      await page.screenshot({ path: `e2e/screenshots/settings-${code}.png` });
    });
  }

  test("the switch survives closing and reopening the dialog", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    // Applying re-localises what is on screen; the question this asks is whether
    // it was actually STORED, or only pushed into the live document. A dialog
    // that reverts to English on reopen means the setting never persisted.
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByTestId("settings-dialog");
    await dialog.getByTestId("settings-language").selectOption("ja");
    await dialog.getByTestId("settings-ok").click();
    await expect(dialog).toBeHidden();

    // `toolbar-settings`, not `settings-title` — the gear button's own key. They
    // happen to share the value 設定 in `ja.ftl`, so the wrong key worked; it
    // would break the moment a translator wrote the dialog title as 環境設定,
    // and the failure would point at nothing that was actually broken.
    const japanese = catalog("ja");
    await page.getByRole("button", { name: japanese.get("toolbar-settings")! }).click();
    await expect(dialog).toContainText(japanese.get("settings-cat-general")!);
    await expect(dialog.getByTestId("settings-language")).toHaveValue("ja");
  });
});
