import { expect, test, type Page } from "@playwright/test";

import { mockTauri } from "./mock-ipc";

/**
 * Pin `prefers-reduced-transparency`, which decides whether SR-1 blurs or falls
 * back to a flat dim. Playwright's `emulateMedia()` does not cover this feature,
 * so it goes through CDP — Chromium-only, which is the only browser this suite
 * runs. Without pinning it, the assertion depends on the accessibility settings
 * of whichever machine happens to run the test.
 */
async function emulateReducedTransparency(page: Page, value: "reduce" | "no-preference") {
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value }],
  });
}

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
    // The chip editor, by its role and its visible label — `getByLabel("Script")`
    // is a substring match and also caught the seek bar's "Seek through the
    // script", which is a genuinely different control.
    await expect(page.getByRole("textbox", { name: "Script", exact: true })).toBeVisible();
    await expect(page.getByTestId("transport")).toBeVisible();
    await expect(page.getByRole("button", { name: "Report a problem" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Check for updates" })).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/app-shell.png`, fullPage: false });
  });

  test("prompter renders one span per character, matching the Rust offset unit", async ({
    page,
  }) => {
    // Deliberately contains a newline AND an astral character: the previous
    // version used a plain one-line ASCII script, so neither rule this test
    // claims to check was actually exercised.
    const script = "ab -- cd\nef 😀";
    await mockTauri(page, { script });
    await page.goto("/");

    const scroller = page.getByTestId("teleprompter-scroller");
    await expect(scroller).toBeVisible();
    // The char-based engine's contract: every VISIBLE character is its own
    // `data-ch` span, so span N is exactly visible-char offset N. Newlines are
    // not visible characters, and the count is by code point (what Rust's
    // `chars()` counts) — not by UTF-16 unit, which would double-count 😀.
    const expected = Array.from(script.replace(/\n/g, "")).length;
    await expect(scroller.locator("[data-ch]")).toHaveCount(expected);

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

  test("a short agreement enables Agree once measured as unscrollable", async ({ page }) => {
    await mockTauri(page, { eulaAccepted: false });
    await page.goto("/");

    // The sample agreement fits, so the gate enables Agree once it has measured
    // that there is nothing to scroll.
    await expect(page.getByRole("button", { name: "I Agree" })).toBeEnabled();
  });

  test("Agree stays disabled until a LONG agreement is scrolled to the end", async ({ page }) => {
    await mockTauri(page, { eulaAccepted: false, longEula: true });
    await page.goto("/");

    const agree = page.getByRole("button", { name: "I Agree" });
    // The requirement, actually exercised: an agreement that overflows its box
    // must be read to the end first. With the short sample this assertion was
    // vacuous, so removing the `disabled` prop kept every test passing.
    await expect(agree).toBeDisabled();

    // Scroll the agreement pane itself to the bottom.
    const pane = page.locator("[data-testid='eula-gate'] .overflow-auto").first();
    await pane.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));

    await expect(agree).toBeEnabled();
    await page.screenshot({ path: `${SHOTS}/eula-gate-scrolled.png` });
  });

  test("settings dialog opens with the shared modal blur", async ({ page }) => {
    await mockTauri(page);
    // Pinned, because the machine's own accessibility preference otherwise
    // decides the result: macOS CI runners report `reduce`, where global.css
    // deliberately drops the blur — so this asserted the app was broken when it
    // was behaving correctly. The reduce branch has its own test below.
    await emulateReducedTransparency(page, "no-preference");
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

  test("a reader who asked for less transparency gets the flat dim, not the blur", async ({
    page,
  }) => {
    // The other half of SR-1, and not a hypothetical branch: macOS CI runners
    // report `reduce`, which is how this surfaced at all. Untested until now,
    // so the fallback could have been dropped without anything noticing — on
    // exactly the machines whose users asked for it.
    await mockTauri(page);
    await emulateReducedTransparency(page, "reduce");
    await page.goto("/");

    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByTestId("settings-dialog")).toBeVisible();

    const backdrop = page.locator(".modal-backdrop");
    const style = await backdrop.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { filter: cs.backdropFilter, background: cs.backgroundColor };
    });
    expect(style.filter, "the blur must be off when reduced transparency is asked for").toBe(
      "none",
    );
    // Dimming is now the ONLY thing separating the dialog from the page behind
    // it, so it has to be the heavier flat value rather than the blur-companion.
    // `--modal-dim-flat` for the dark theme, which is what the mock boots into.
    expect(style.background, "the flat fallback dim must take over").toBe("rgba(0, 0, 0, 0.72)");
  });

  test("light theme paints a light surface", async ({ page }) => {
    await mockTauri(page, { theme: "light" });
    await page.goto("/");

    await expect(page.getByTestId("teleprompter-scroller")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.screenshot({ path: `${SHOTS}/app-shell-light.png` });
  });
});
