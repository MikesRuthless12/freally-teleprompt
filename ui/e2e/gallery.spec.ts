import { expect, test } from "@playwright/test";

import { mockTauri } from "./mock-ipc";

/**
 * The standing visual smoke (SR-2).
 *
 * Boots the BUILT UI with a mocked IPC bridge and screenshots every feature
 * panel. It runs as the `test:e2e` step of the `npm run ci:local` gate, before
 * every release. After v1.0.0 it grows into a full-workflow regression gate.
 *
 * Each case asserts something real BEFORE screenshotting: a screenshot alone
 * cannot fail, so a blank page would otherwise sail through as a pass. The
 * results populate `Live-To-Do-List.md` — what Playwright confirmed renders vs.
 * what still needs a human drill.
 */

const SHOTS = "e2e/screenshots";

test.describe("panel gallery", () => {
  test("app shell — toolbar, editor and prompter", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    // The shell really painted, in English, with the prompter surface mounted.
    // `exact` matters: the sample script also contains the product name, and a
    // substring match would resolve to two elements and fail on strict mode.
    await expect(page.getByText("Freally Teleprompt", { exact: true })).toBeVisible();
    await expect(page.getByTestId("teleprompter-scroller")).toBeVisible();
    await expect(page.getByLabel("Script")).toBeVisible();
    await expect(page.getByRole("button", { name: "Report a problem" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check for updates" })).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/app-shell.png`, fullPage: false });
  });

  test("prompter renders one span per character, matching the Rust offset unit", async ({
    page,
  }) => {
    const script = "abc -- def";
    await mockTauri(page, { script });
    await page.goto("/");

    const scroller = page.getByTestId("teleprompter-scroller");
    await expect(scroller).toBeVisible();
    // The char-based engine's contract: every visible character is its own
    // `data-ch` span, so span N is exactly visible-char offset N. Newlines are
    // not characters, so this script has exactly `script.length` spans.
    await expect(scroller.locator("[data-ch]")).toHaveCount(script.length);

    await page.screenshot({ path: `${SHOTS}/prompter-chars.png` });
  });

  test("first-run EULA gate blocks the app", async ({ page }) => {
    await mockTauri(page, { eulaAccepted: false });
    await page.goto("/");

    const gate = page.getByTestId("eula-gate");
    await expect(gate).toBeVisible();
    await expect(page.getByRole("button", { name: "I Agree" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Decline & Quit" })).toBeVisible();
    // The gate REPLACES the shell — the prompter must not be reachable behind it.
    await expect(page.getByTestId("teleprompter-scroller")).toHaveCount(0);

    await page.screenshot({ path: `${SHOTS}/eula-gate.png` });
  });

  test("Agree is disabled until the agreement is scrolled to the end", async ({ page }) => {
    await mockTauri(page, { eulaAccepted: false });
    await page.goto("/");

    // The sample agreement is short enough to fit, so the gate enables Agree
    // once it has measured that there is nothing to scroll.
    await expect(page.getByRole("button", { name: "I Agree" })).toBeEnabled();
  });

  test("settings dialog opens with the shared modal blur", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByTestId("settings-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("dialog")).toBeVisible();

    // SR-1: the backdrop actually carries the blur, not just a dim.
    //
    // This asserts the COMPUTED value, not the presence of a class, because the
    // bug it exists to catch was invisible in the source: the CSS pipeline was
    // collapsing the authored pair down to `-webkit-backdrop-filter` alone, and
    // Chromium — which is WebView2, the Windows webview — does not support that
    // spelling. The blur silently disappeared from the built app. Chromium here
    // stands in for WebView2, so a computed `none` means shipping a broken SR-1.
    const backdrop = page.locator(".modal-backdrop");
    await expect(backdrop).toHaveCount(1);
    const filter = await backdrop.evaluate((el) => getComputedStyle(el).backdropFilter);
    expect(filter).toContain("blur");

    await page.screenshot({ path: `${SHOTS}/settings-dialog.png` });
  });

  test("light theme paints a light surface", async ({ page }) => {
    await mockTauri(page, { theme: "light" });
    await page.goto("/");

    await expect(page.getByTestId("teleprompter-scroller")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.screenshot({ path: `${SHOTS}/app-shell-light.png` });
  });
});
