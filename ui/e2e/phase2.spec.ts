import { expect, test } from "@playwright/test";

import { lastCall, mockTauri } from "./mock-ipc";

/**
 * Phase 2 coverage (SR-2) — **every FT-2x feature Playwright can reach**.
 *
 * The centre of gravity here is one bug that the obvious tests all miss: ghost
 * text lives in the editor's DOM, so anything that reads the DOM back — the
 * serializer, the caret arithmetic, copy/cut — can pick up a word the operator
 * never typed. "The suggestion appears" is easy and proves almost nothing; what
 * matters is that an UNACCEPTED suggestion never becomes script. So most of
 * these assert on what reached the engine (`teleprompter_set_script`), not on
 * what is on screen.
 *
 * The tables are real, so the specs type real stems and let the shipped English
 * data answer — an assertion against a stubbed table would pass with the
 * pipeline broken.
 */

const SHOTS = "e2e/screenshots";
const GHOST = "[data-ghost]";

/** Type into the editor and wait for a suggestion to be drawn (or not). */
async function typeInEditor(page: import("@playwright/test").Page, text: string) {
  const editor = page.getByTestId("caesura-editor");
  await editor.click();
  await page.keyboard.type(text);
  return editor;
}

// ---------------------------------------------------------------------------
// FT-21 — ghost text in the editor
// ---------------------------------------------------------------------------

test.describe("FT-21 ghost-text suggestions", () => {
  test("a suggestion appears within one keystroke", async ({ page }) => {
    await mockTauri(page, { script: "" });
    await page.goto("/");

    const editor = await typeInEditor(page, "thr");
    await expect(editor.locator(GHOST)).toHaveCount(1);
    // Dimmed, inert, and invisible to assistive tech — it is not text yet.
    const ghost = editor.locator(GHOST);
    await expect(ghost).toHaveAttribute("contenteditable", "false");
    await expect(ghost).toHaveAttribute("aria-hidden", "true");

    await page.screenshot({ path: `${SHOTS}/ghost-text.png` });
  });

  test("an UNACCEPTED suggestion never reaches the script", async ({ page }) => {
    // The trap this whole file exists for. The ghost is a real DOM node sitting
    // inside the contenteditable, so a serializer that walks children without
    // skipping it saves a word the operator never typed — silently, into their
    // script, every time they pause mid-word.
    await mockTauri(page, { script: "" });
    await page.goto("/");

    const editor = await typeInEditor(page, "thr");
    await expect(editor.locator(GHOST)).toHaveCount(1);
    // Visibly longer than what was typed — so if it leaked, it would show.
    expect((await editor.locator(GHOST).textContent())?.length).toBeGreaterThan(0);
    expect(await lastCall(page, "teleprompter_set_script")).toEqual({ text: "thr" });
  });

  test("Tab commits the suggestion as real text", async ({ page }) => {
    await mockTauri(page, { script: "" });
    await page.goto("/");

    const editor = await typeInEditor(page, "thr");
    const suffix = (await editor.locator(GHOST).textContent()) ?? "";
    expect(suffix).not.toBe("");

    await page.keyboard.press("Tab");
    await expect(editor.locator(GHOST)).toHaveCount(0);
    expect(await lastCall(page, "teleprompter_set_script")).toEqual({ text: `thr${suffix}` });
  });

  test("Esc dismisses the suggestion and leaves the typed text alone", async ({ page }) => {
    await mockTauri(page, { script: "" });
    await page.goto("/");

    const editor = await typeInEditor(page, "thr");
    await expect(editor.locator(GHOST)).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(editor.locator(GHOST)).toHaveCount(0);
    expect(await lastCall(page, "teleprompter_set_script")).toEqual({ text: "thr" });
  });

  test("typing on past a suggestion keeps the script correct", async ({ page }) => {
    // Every keystroke redraws the ghost; each redraw is another chance for the
    // caret arithmetic to be off by the suggestion's length.
    await mockTauri(page, { script: "" });
    await page.goto("/");

    await typeInEditor(page, "thr");
    await page.keyboard.type("ee");
    expect(await lastCall(page, "teleprompter_set_script")).toEqual({ text: "three" });
  });

  test("a suggestion does not survive moving the caret away", async ({ page }) => {
    await mockTauri(page, { script: "" });
    await page.goto("/");

    const editor = await typeInEditor(page, "thr");
    await expect(editor.locator(GHOST)).toHaveCount(1);
    await page.keyboard.press("ArrowLeft");
    await expect(editor.locator(GHOST)).toHaveCount(0);
  });

  test("backspacing through a word leaves no suggestion behind in the script", async ({ page }) => {
    await mockTauri(page, { script: "" });
    await page.goto("/");

    await typeInEditor(page, "thr");
    for (let i = 0; i < 3; i++) await page.keyboard.press("Backspace");

    // Asserted as "no word characters survived" rather than as exactly "",
    // because clearing a contenteditable leaves the browser's own <br> behind
    // and `serialize()` reports it as a newline. That is pre-existing FT-11
    // behaviour — verified identical with autocomplete off — and is NOT what
    // this test is about: what matters is that deleting the typed stem did not
    // leave the suggestion that was drawn over it behind in the script.
    const { text } = (await lastCall(page, "teleprompter_set_script")) as { text: string };
    expect(text).toMatch(/^\s*$/);
  });

  test("the caesura chip grammar still holds with suggestions on", async ({ page }) => {
    // FT-11's tokenizer and FT-21's word class have to agree that `--` is not a
    // word: if it were, the editor would offer to complete a pause into a word.
    await mockTauri(page, { script: "" });
    await page.goto("/");

    const editor = await typeInEditor(page, "hold--");
    await expect(editor.locator("[data-caesura]")).toHaveCount(1);
    await expect(editor.locator(GHOST)).toHaveCount(0);
    expect(await lastCall(page, "teleprompter_set_script")).toEqual({ text: "hold -- " });
  });

  test("no suggestions at all when the setting is off", async ({ page }) => {
    await mockTauri(page, { script: "", autocomplete: false });
    await page.goto("/");

    const editor = await typeInEditor(page, "thr");
    await expect(editor.locator(GHOST)).toHaveCount(0);
    expect(await lastCall(page, "teleprompter_set_script")).toEqual({ text: "thr" });
  });
});

// ---------------------------------------------------------------------------
// FT-20 — the settings seam
// ---------------------------------------------------------------------------

test.describe("FT-20 autocomplete settings", () => {
  test("the Editor pane drives both controls through settings_set", async ({ page }) => {
    await mockTauri(page, {});
    await page.goto("/");

    await page.getByTestId("titlebar-settings").click();
    await page.getByRole("tab", { name: "Editor" }).click();

    const toggle = page.getByTestId("settings-autocomplete");
    await expect(toggle).toBeChecked(); // on by default, as the app ships
    const picker = page.getByTestId("settings-autocomplete-language");
    await picker.selectOption("pl");
    await page.getByRole("button", { name: "Apply" }).click();

    const sent = (await lastCall(page, "settings_set")) as {
      next: { autocomplete: boolean; autocompleteLanguage: string };
    };
    expect(sent.next.autocomplete).toBe(true);
    expect(sent.next.autocompleteLanguage).toBe("pl");
  });

  test("turning autocomplete off disables the language picker", async ({ page }) => {
    await mockTauri(page, {});
    await page.goto("/");

    await page.getByTestId("titlebar-settings").click();
    await page.getByRole("tab", { name: "Editor" }).click();
    await page.getByTestId("settings-autocomplete").uncheck();
    await expect(page.getByTestId("settings-autocomplete-language")).toBeDisabled();
  });

  test("the picker lists English first, then native names alphabetically", async ({ page }) => {
    // The order must not depend on which language the app is currently in, so
    // it is asserted here in a NON-English locale.
    await mockTauri(page, { language: "ja" });
    await page.goto("/");

    await page.getByTestId("titlebar-settings").click();
    await page.getByRole("tab", { name: "エディター" }).click();

    const options = page.getByTestId("settings-autocomplete-language").locator("option");
    const labels = await options.allTextContents();
    // [0] is the "same as the app language" sentinel; the languages follow.
    expect(labels.slice(1, 5)).toEqual(["English", "Bahasa Indonesia", "Deutsch", "Español"]);
    expect(labels.at(-1)).toBe("简体中文");
  });

  test("the editor completes in the chosen language, not the app language", async ({ page }) => {
    // The whole reason the two settings are separate: an operator running the
    // app in English writing a script in Polish.
    await mockTauri(page, { script: "", language: "en", autocompleteLanguage: "pl" });
    await page.goto("/");

    const editor = await typeInEditor(page, "dzie");
    await expect(editor.locator(GHOST)).toHaveCount(1);
    const suffix = (await editor.locator(GHOST).textContent()) ?? "";
    await page.keyboard.press("Tab");
    expect(await lastCall(page, "teleprompter_set_script")).toEqual({ text: `dzie${suffix}` });
  });
});
