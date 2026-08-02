import { expect, test, type Page } from "@playwright/test";

import { ipcCalls, lastCall, mockTauri } from "./mock-ipc";

/**
 * Phase 5 / FT-50 — the onboarding tour, the system theme, and the keyboard
 * accessibility floor.
 *
 * Everything here asserts BEHAVIOUR against the recorded IPC calls or the
 * computed style, never mere presence: "the tour was dismissed" means "the UI
 * told the backend to stop showing it", and "the theme followed the system"
 * means "`data-theme` actually changed when the OS preference did".
 *
 * What is NOT reachable this way — that the OS's own dark-mode switch reaches
 * a packaged WebView2/WebKitGTK build, and that a real screen reader announces
 * the dialog — is a drill in `Live-To-Do-List.md`.
 */

const SHOTS = "e2e/screenshots";

/** The tour's four steps, in the order `TOUR_STEPS` declares them. */
const STEP_TITLES = [
  "Welcome to Freally Teleprompt",
  "Write your script",
  "Set your pace",
  "Show it to the talent",
];

/** `rgb(r, g, b)` / `rgba(...)` → WCAG relative luminance. */
function luminance(css: string): number {
  const [r, g, b] = (css.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.2 contrast ratio between two computed colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Boot the app as a genuine first run — past the agreement, tour unseen. */
async function firstRun(page: Page) {
  await mockTauri(page, { onboardingSeen: false });
  await page.goto("/");
}

test.describe("FT-50 onboarding tour", () => {
  test("introduces itself once, on the first run only", async ({ page }) => {
    await firstRun(page);

    const tour = page.getByTestId("tour-dialog");
    await expect(tour).toBeVisible();
    await expect(page.getByRole("heading", { name: STEP_TITLES[0] })).toBeVisible();
    await expect(page.getByTestId("tour-progress")).toHaveText("1 of 4");
    await page.screenshot({ path: `${SHOTS}/tour-step-1.png` });

    // A returning user — the mock's default — never sees it. Asserted in the
    // same test as the first-run case, because "shows the tour" and "does not
    // show the tour" are one behaviour with one input, and splitting them is
    // how a default flips and only half the pair notices.
    await mockTauri(page, {});
    await page.goto("/");
    await expect(page.getByTestId("tour-dialog")).toHaveCount(0);
  });

  test("steps forward and back through all four, and cannot go back off the start", async ({
    page,
  }) => {
    await firstRun(page);

    await expect(page.getByTestId("tour-back")).toBeDisabled();
    for (let i = 1; i < STEP_TITLES.length; i++) {
      await page.getByTestId("tour-next").click();
      await expect(page.getByRole("heading", { name: STEP_TITLES[i] })).toBeVisible();
      await expect(page.getByTestId("tour-progress")).toHaveText(`${i + 1} of 4`);
      await expect(page.getByTestId("tour-back")).toBeEnabled();
    }

    // The last step offers to finish rather than to continue.
    await expect(page.getByTestId("tour-next")).toHaveText("Start writing");
    await page.screenshot({ path: `${SHOTS}/tour-step-4.png` });

    await page.getByTestId("tour-back").click();
    await expect(page.getByRole("heading", { name: STEP_TITLES[2] })).toBeVisible();
    await expect(page.getByTestId("tour-next")).toHaveText("Next");
  });

  /**
   * The load-bearing assertion of the whole feature: whichever way you leave,
   * the tour records itself as seen. Miss one exit and it greets the user again
   * on every launch — which is the single most irritating way onboarding fails,
   * and it is invisible to a test that only checks the dialog closed.
   */
  for (const exit of ["done", "skip", "escape", "backdrop"] as const) {
    test(`leaving by ${exit} records the tour as seen`, async ({ page }) => {
      await firstRun(page);
      await expect(page.getByTestId("tour-dialog")).toBeVisible();

      if (exit === "done") {
        for (let i = 1; i < STEP_TITLES.length; i++) await page.getByTestId("tour-next").click();
        await page.getByTestId("tour-next").click();
      } else if (exit === "skip") {
        await page.getByTestId("tour-skip").click();
      } else if (exit === "escape") {
        await page.keyboard.press("Escape");
      } else {
        // Well inside the backdrop and to the LEFT of the centred panel.
        // Not the corner: `ResizeEdges` puts invisible window-resize grips over
        // the outermost few pixels, and they deliberately stay on top of a
        // dialog — an undecorated window must remain resizable while one is
        // open — so a click there lands on the grip, not the backdrop.
        await page.locator(".modal-backdrop").click({ position: { x: 30, y: 200 } });
      }

      await expect(page.getByTestId("tour-dialog")).toHaveCount(0);
      expect(await lastCall(page, "onboarding_set_seen")).toEqual({ seen: true });
    });
  }

  /**
   * `onboardingSeen` is one of the three fields Rust preserves across
   * `settings_set`, so the tour must never be dismissed by a settings write —
   * it goes through its own command, or the "records what happened" rule that
   * protects the EULA acceptance is quietly broken for this field too.
   */
  test("is dismissed by its own command, never by a settings write", async ({ page }) => {
    await firstRun(page);
    await page.getByTestId("tour-skip").click();

    const calls = await ipcCalls(page);
    expect(calls.filter((c) => c.cmd === "onboarding_set_seen")).toHaveLength(1);
    expect(calls.filter((c) => c.cmd === "settings_set")).toHaveLength(0);
  });

  test("can be replayed from Settings, which closes to get out of its own way", async ({
    page,
  }) => {
    // A returning user: no tour on screen until they ask for one.
    await mockTauri(page, {});
    await page.goto("/");
    await expect(page.getByTestId("tour-dialog")).toHaveCount(0);

    await page.getByTestId("titlebar-settings").click();
    await expect(page.getByTestId("settings-dialog")).toBeVisible();
    await page.getByTestId("settings-tour-replay").click();

    await expect(page.getByTestId("settings-dialog")).toHaveCount(0);
    await expect(page.getByTestId("tour-dialog")).toBeVisible();
    // Replayed from the beginning, not from wherever it was last left.
    await expect(page.getByTestId("tour-progress")).toHaveText("1 of 4");
  });

  /**
   * A crash report from the last run is the more urgent thing to show, and two
   * dialogs at once is nobody's idea of a welcome. `crashAtLaunch` is latched
   * for the session, so unlike the update check — which simply queues behind
   * the tour — a crash report keeps the slot for good.
   */
  test("does not fight the crash reporter for the dialog slot", async ({ page }) => {
    // Through the mock's own seam rather than a second `invoke` wrapper on top
    // of it: a wrapper would bypass the call recorder, so `ipcCalls`/`lastCall`
    // could never see the command it intercepted.
    await mockTauri(page, { onboardingSeen: false, pendingCrash: "panicked at 'boom'" });
    await page.goto("/");

    await expect(page.getByTestId("bug-report-dialog")).toBeVisible();
    await expect(page.getByTestId("tour-dialog")).toHaveCount(0);
  });
});

test.describe("FT-50 themes", () => {
  test("offers following the system, and stamps what that resolves to", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await mockTauri(page, { theme: "system" });
    await page.goto("/");

    // The document never carries the word "system" — the CSS knows two
    // palettes, and resolving it here keeps that decision in one place.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("repaints live when the system preference changes", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await mockTauri(page, { theme: "system" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.screenshot({ path: `${SHOTS}/theme-system-light.png` });
  });

  /**
   * The half that is easy to leave broken: pinning a theme has to UNSUBSCRIBE
   * from the OS. Otherwise a user who deliberately chose Light is flipped to
   * dark the moment their machine switches at sunset.
   */
  test("stops following the system once a theme is pinned", async ({ page }) => {
    // Start on a DARK system, then pin to LIGHT — deliberately the opposite of
    // what the OS says. Pinning to the value the OS already reports would make
    // the last assertion below unfalsifiable: it would read "light" whether or
    // not the listener was still attached.
    await page.emulateMedia({ colorScheme: "dark" });
    await mockTauri(page, { theme: "system" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.getByTestId("titlebar-settings").click();
    await page.getByTestId("settings-theme").selectOption("light");
    await page.getByTestId("settings-apply").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await lastCall(page, "settings_set")).toMatchObject({
      next: expect.objectContaining({ theme: "light" }),
    });

    // Now move the OS twice, so a still-attached listener genuinely fires — and
    // lands on the value the user did NOT pick. A pinned theme must not care.
    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

test.describe("FT-50 keyboard accessibility", () => {
  /**
   * `aria-modal` tells a screen reader the rest of the page is inert. It does
   * nothing whatever to the tab order — so without a real trap, three Tabs
   * walked out of the dialog and onto the toolbar behind it, which is still
   * visible through the SR-1 blur.
   */
  test("Tab stays inside an open dialog", async ({ page }) => {
    await mockTauri(page, {});
    await page.goto("/");
    await page.getByTestId("titlebar-settings").click();
    await expect(page.getByTestId("settings-dialog")).toBeVisible();

    // Comfortably more presses than the dialog has stops, so it has to wrap.
    for (let i = 0; i < 40; i++) await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("[role='dialog']")),
      "focus escaped the dialog",
    ).toBe(true);

    // And backwards, which is the direction a naive trap forgets.
    for (let i = 0; i < 40; i++) await page.keyboard.press("Shift+Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role='dialog']"))).toBe(
      true,
    );
  });

  test("closing a dialog hands focus back to whatever opened it", async ({ page }) => {
    await mockTauri(page, {});
    await page.goto("/");

    const gear = page.getByTestId("titlebar-settings");
    await gear.click();
    await expect(page.getByTestId("settings-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("settings-dialog")).toHaveCount(0);

    // Not `<body>` — a dialog that drops the caret makes the next Tab restart
    // from the top of the window rather than from the control just used.
    expect(
      await page.evaluate(
        () =>
          document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.tagName,
      ),
    ).toBe("titlebar-settings");
  });

  /**
   * The way a panel-bound trap is defeated, and it takes one keystroke.
   *
   * The trap only fires while focus is INSIDE the panel. A control that
   * disables itself while focused is blurred by the browser to `<body>` —
   * outside — and from there the handler can never fire again: Tab walks onto
   * the toolbar behind the open modal and Enter activates it. The tour's Back
   * button disables itself on step one, which is exactly one Enter away.
   */
  test("survives the focused control disabling itself", async ({ page }) => {
    await firstRun(page);
    await expect(page.getByTestId("tour-dialog")).toBeVisible();

    // Step 2, then use Back — which disables itself on arrival at step 1.
    await page.getByTestId("tour-next").click();
    await page.getByTestId("tour-back").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("tour-back")).toBeDisabled();

    // Focus must have been re-homed inside the dialog, not dropped on <body>.
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("[role='dialog']")),
      "focus was dropped outside the dialog when the button disabled itself",
    ).toBe(true);

    // And the trap still works from there.
    for (let i = 0; i < 20; i++) await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role='dialog']"))).toBe(
      true,
    );
  });

  /**
   * A dialog that opens with NO tab stops at all. `UpdatesDialog`'s manual
   * check renders a heading and a line of text while it is checking — nothing
   * focusable — so "focus the first tab stop" was a no-op, focus stayed on the
   * toolbar button behind the backdrop, and the panel-bound trap therefore
   * never saw a keystroke for the dialog's whole lifetime.
   */
  test("moves focus into a dialog that has no tab stops yet", async ({ page }) => {
    await mockTauri(page, {});
    await page.goto("/");

    await page.getByRole("button", { name: "Check for updates" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("[role='dialog']")),
      "focus never entered the update dialog",
    ).toBe(true);
  });

  test("opening a dialog moves focus into it", async ({ page }) => {
    await mockTauri(page, {});
    await page.goto("/");
    await page.getByTestId("titlebar-settings").click();
    await expect(page.getByTestId("settings-dialog")).toBeVisible();
    expect(await page.evaluate(() => !!document.activeElement?.closest("[role='dialog']"))).toBe(
      true,
    );
  });

  /**
   * The floor, asserted on the COMPUTED outline rather than on a class name —
   * the whole point is that controls which opt into nothing still get a ring,
   * so there is no class to look for. A checkbox is the right probe: it is one
   * of the controls that had no focus style of its own at all.
   */
  test("every focusable control paints a focus ring when tabbed to", async ({ page }) => {
    await mockTauri(page, {});
    await page.goto("/");

    const bpm = page.getByRole("checkbox", { name: "BPM mode (for singing)" });
    await bpm.focus();
    const outline = await bpm.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { width: cs.outlineWidth, style: cs.outlineStyle };
    });
    expect(outline.style).toBe("solid");
    expect(parseFloat(outline.width)).toBeGreaterThan(0);
  });

  /**
   * The tablist bug the aria fix closes: a search that hides the selected
   * category left `aria-selected` on a tab that is no longer rendered, so
   * nothing reported itself selected while the pane went on showing the first
   * visible category.
   */
  /**
   * A focus ring you cannot see is not a focus indicator.
   *
   * The first version of the floor drew `--color-havoc-accent`, which is tuned
   * for the near-black palette: 8.1:1 on the dark panel and **2.4:1** on the
   * white one, under the 3:1 WCAG 2.2 SC 1.4.11 asks of a focus indicator. The
   * "does it have an outline?" test above passed the whole time, because the
   * outline was there — it just could not be seen in one of the two themes the
   * app ships. So this measures it, in both.
   */
  for (const theme of ["dark", "light"] as const) {
    test(`the focus ring meets 3:1 contrast in the ${theme} theme`, async ({ page }) => {
      await mockTauri(page, { theme });
      await page.goto("/");

      const bpm = page.getByRole("checkbox", { name: "BPM mode (for singing)" });
      await bpm.focus();
      const seen = await bpm.evaluate((el) => {
        // The nearest ancestor that actually paints — the ring sits on that.
        let node: HTMLElement | null = el as HTMLElement;
        let behind = "rgb(255, 255, 255)";
        while (node) {
          const bg = getComputedStyle(node).backgroundColor;
          if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) {
            behind = bg;
            break;
          }
          node = node.parentElement;
        }
        return { ring: getComputedStyle(el).outlineColor, behind };
      });

      expect(
        contrast(seen.ring, seen.behind),
        `${seen.ring} on ${seen.behind} is not visible enough to be a focus indicator`,
      ).toBeGreaterThanOrEqual(3);
    });
  }

  test("the Settings tablist marks the tab whose pane is actually shown", async ({ page }) => {
    await mockTauri(page, {});
    await page.goto("/");
    await page.getByTestId("titlebar-settings").click();

    await page.getByRole("searchbox").fill("guide");
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await expect(tabs.first()).toHaveAttribute("id", "settings-tab-appearance");
  });
});
