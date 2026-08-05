import { expect, test, type Page } from "@playwright/test";

import { ipcCalls, lastCall, mockTauri, waitForShell } from "./mock-ipc";

/**
 * Anything in the room can drive the prompter — FT-M04 (foot pedals and HID
 * remotes), FT-M13 (global hotkeys) and FT-M16 (the rebindable shortcut map).
 *
 * The table itself is unit-tested without a DOM (`bindings.test.ts`), and the
 * accelerator format is proven against the real OS parser in Rust
 * (`shortcuts.rs`'s tests). What is checked HERE is the half neither can reach:
 * that a keystroke actually reaches the ENGINE, that the editor still gets its
 * own space bar, that a rebind is persisted through `settings_set` and lands on
 * the engine broadcast, and that a hotkey arriving from Rust runs the same
 * command a key does.
 *
 * ⚠️ Assertions are on the IPC the app made — "it asked the backend to toggle
 * playback" — never on a class or a label. A test that only proved a button
 * exists would pass against a table wired to nothing.
 */

const SHOTS = "e2e/screenshots";

/** Every `teleprompter_control` action the app has asked for, in order. */
async function controlActions(page: Page): Promise<string[]> {
  const calls = await ipcCalls(page);
  return calls
    .filter((call) => call.cmd === "teleprompter_control")
    .map((call) => String(call.args.action ?? ""));
}

/** Press a key on the document body — i.e. NOT in the editor. */
async function pressOnBody(page: Page, key: string) {
  await page.locator("body").click({ position: { x: 5, y: 200 } });
  await page.keyboard.press(key);
}

/**
 * Press a physical key by its `code`, optionally as an auto-repeat.
 *
 * ⚠️ Two things Playwright's own keyboard cannot do, and both are load-bearing
 * here:
 *
 * - **`F13`–`F24` are not in its key table** (`Unknown key: "F13"`). They are
 *   exactly what a programmable foot pedal or presenter remote sends, because
 *   nothing else on a machine uses them — so the keys FT-M04 exists for are the
 *   ones it cannot type.
 * - **It does not simulate auto-repeat.** Holding a key with `keyboard.down`
 *   fires once; the repeat stream is an OS behaviour. So `keyboard.down` +
 *   a wait would assert nothing about the `repeat` flag, and the first version
 *   of the repeat test passed for that reason rather than for a real one.
 *
 * Dispatched on the focused element so it travels the same capture-then-bubble
 * path a real keystroke takes, which is what the map's capture-phase listener
 * and the shell's window listener each depend on.
 */
async function pressCode(
  page: Page,
  code: string,
  options: { repeat?: boolean } = {},
): Promise<void> {
  await page.evaluate(
    ({ code, repeat }) => {
      const target = document.activeElement ?? document.body;
      target.dispatchEvent(
        new KeyboardEvent("keydown", { code, key: code, repeat, bubbles: true, cancelable: true }),
      );
    },
    { code, repeat: options.repeat ?? false },
  );
}

/** The binding table carried by the last `settings_set` the app made. */
async function savedBindings(
  page: Page,
): Promise<Record<string, { window: string | null; global: string | null }>> {
  const args = await lastCall(page, "settings_set");
  const next = (args?.next ?? {}) as Record<string, unknown>;
  return (next.bindings ?? {}) as Record<string, { window: string | null; global: string | null }>;
}

// ---------------------------------------------------------------------------
// The keyboard half — the table actually drives the engine
// ---------------------------------------------------------------------------

test.describe("FT-M16 the default bindings drive the transport", () => {
  test("space toggles playback and the arrows step and re-pace", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);

    await pressOnBody(page, "Space");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Home");

    expect(await controlActions(page)).toEqual([
      "toggle",
      "stepForward",
      "faster",
      "slower",
      "top",
    ]);
  });

  /**
   * ⚠️ The property the whole text-entry guard exists for.
   *
   * `Space`, `ArrowUp` and `Home` are all bound, and all three are also how a
   * person writes a script. Without the guard the editor would be unusable —
   * and the failure is silent, because the keystroke still *looks* handled.
   */
  test("the editor keeps its own space bar, arrows and Home", async ({ page }) => {
    await mockTauri(page, { script: "one" });
    await page.goto("/");
    await waitForShell(page);

    const editor = page.getByTestId("caesura-editor");
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" two");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Home");

    // Not one transport command, and the space really was typed.
    expect(await controlActions(page)).toEqual([]);
    const calls = await ipcCalls(page);
    const writes = calls.filter((call) => call.cmd === "teleprompter_set_script");
    expect(String(writes[writes.length - 1].args.text)).toBe("one two");
  });

  /**
   * ⚠️ A dialog owns the keyboard while it is up.
   *
   * Settings' category list moves on the arrow keys and calls `preventDefault`
   * but not `stopPropagation`, so every press still reached the window
   * listener and re-paced the talent's scroll mid-shoot. The target is a
   * `<button role="tab">`, so the text-entry guard cannot see it.
   */
  test("keys inside an open dialog never reach the transport", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("titlebar-settings").click();
    await expect(page.getByTestId("settings-dialog")).toBeVisible();

    await page.getByRole("tab").first().press("ArrowDown");
    await page.getByRole("tab").first().press("ArrowUp");
    await page.keyboard.press("Home");
    await page.keyboard.press("PageDown");

    expect(await controlActions(page)).toEqual([]);
  });

  /** And a bare Space must still activate whatever button has focus, rather
   * than being swallowed by `preventDefault` and toggling playback. */
  test("space still activates a focused button while a dialog is open", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await page.getByTestId("bind-top-window").focus();
    await page.keyboard.press("Space");

    // The button did its job — the cell armed — and playback was not touched.
    await expect(page.getByTestId("bind-top-window")).toContainText("Press a key");
    expect(await controlActions(page)).toEqual([]);
  });

  /** But a modifier combination still reaches the app from inside the editor —
   * which is exactly where an operator reaches for find. */
  test("Ctrl+F opens find from inside the editor", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("caesura-editor").click();
    await page.keyboard.press("Control+f");
    await expect(page.getByTestId("find-replace")).toBeVisible();
  });

  /**
   * A held pedal must not machine-gun play/pause, but holding "faster" to wind
   * the speed up is how the on-screen transport already behaves.
   */
  test("a held key repeats only the commands that should repeat", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.locator("body").click({ position: { x: 5, y: 200 } });

    // Holding "faster": the first press and every repeat after it count.
    await pressCode(page, "ArrowUp");
    await pressCode(page, "ArrowUp", { repeat: true });
    await pressCode(page, "ArrowUp", { repeat: true });
    expect((await controlActions(page)).filter((a) => a === "faster")).toHaveLength(3);

    // Holding play/pause: the repeats are dropped, or a pedal left down would
    // toggle playback dozens of times a second.
    await pressCode(page, "Space");
    await pressCode(page, "Space", { repeat: true });
    await pressCode(page, "Space", { repeat: true });
    expect((await controlActions(page)).filter((a) => a === "toggle")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// FT-M16 — the map, and FT-M04's learn-a-button
// ---------------------------------------------------------------------------

test.describe("FT-M16 the shortcut map", () => {
  test("lists every command with what it is bound to", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await expect(page.getByTestId("shortcuts")).toBeVisible();
    await expect(page.getByTestId("bind-playPause-window")).toHaveText("Space");
    await expect(page.getByTestId("bind-faster-window")).toHaveText("↑");
    // Nothing is claimed system-wide until the operator asks for it.
    await expect(page.getByTestId("bind-playPause-global")).toHaveText("—");
    await page.getByTestId("shortcuts").screenshot({ path: `${SHOTS}/shortcuts-map.png` });
  });

  test("searches by command name and by the key itself", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await page.getByTestId("shortcuts-search").fill("section");
    await expect(page.getByTestId("shortcut-row-nextMarker")).toBeVisible();
    await expect(page.getByTestId("shortcut-row-playPause")).toBeHidden();

    // "What is Page Down?" is answerable from the same box.
    await page.getByTestId("shortcuts-search").fill("Page Down");
    await expect(page.getByTestId("shortcut-row-nextMarker")).toBeVisible();
    await expect(page.getByTestId("shortcut-row-find")).toBeHidden();

    await page.getByTestId("shortcuts-search").fill("nothing matches this");
    await expect(page.getByTestId("shortcuts")).toContainText("No commands match");
  });

  /**
   * FT-M04's learn-a-button. A pedal is a keyboard that sends one key forever —
   * usually `F13`–`F24`, because nothing else uses them — so binding one is the
   * same act as binding any other key, and needs no driver.
   */
  test("learns a pedal's button and saves it", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await page.getByTestId("bind-playPause-global").click();
    await expect(page.getByTestId("bind-playPause-global")).toContainText("Press a key");
    // What a programmable foot pedal actually sends.
    await pressCode(page, "F13");
    await expect(page.getByTestId("bind-playPause-global")).toHaveText("F13");

    await page.getByTestId("shortcuts-apply").click();
    const bindings = await savedBindings(page);
    expect(bindings.playPause.global).toBe("F13");
    // The window binding it already had is not collateral damage.
    expect(bindings.playPause.window).toBe("Space");
  });

  /** ⚠️ Escape cancels the capture rather than closing the dialog — the whole
   * reason the listener is registered in the capture phase. */
  test("escape leaves a capture without closing the map", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await page.getByTestId("bind-top-window").click();
    await page.keyboard.press("Escape");

    await expect(page.getByTestId("shortcuts")).toBeVisible();
    await expect(page.getByTestId("bind-top-window")).toHaveText("Home");
  });

  /**
   * ⚠️ And a key being BOUND must not also run. Without the capture-phase
   * listener, pressing Space to bind it would toggle playback at the same time.
   */
  test("a key being bound does not also fire its command", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await page.getByTestId("bind-stop-window").click();
    await page.keyboard.press("Space");

    await expect(page.getByTestId("bind-stop-window")).toHaveText("Space");
    expect(await controlActions(page)).toEqual([]);
  });

  /**
   * ⚠️ Clicking away from an armed cell used to leave the capture live, so the
   * next keystroke anywhere in the dialog was swallowed and written into a cell
   * the operator had stopped looking at — typing "play" into the search box
   * rebound "Back to the top" to P and put "lay" in the field.
   */
  test("clicking away disarms a cell instead of eating the next keystroke", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await page.getByTestId("bind-top-window").click();
    await expect(page.getByTestId("bind-top-window")).toContainText("Press a key");

    // "top" keeps the row on screen (it matches "Back to the top"), so the
    // assertion is about the binding rather than about the filter.
    await page.getByTestId("shortcuts-search").click();
    await page.getByTestId("shortcuts-search").fill("top");

    await expect(page.getByTestId("bind-top-window")).toHaveText("Home");
    await expect(page.getByTestId("shortcuts-search")).toHaveValue("top");
  });

  /**
   * ⚠️ A failed write must not look like a stored one. `settings_set` rejecting
   * used to be swallowed, so the map closed exactly as success did and the
   * operator believed the pedal was bound.
   */
  test("a failed save keeps the map open and says so", async ({ page }) => {
    await mockTauri(page, { settingsSaveFails: true });
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await page.getByTestId("bind-playPause-global").click();
    await pressCode(page, "F13");
    await page.getByTestId("shortcuts-apply").click();

    await expect(page.getByTestId("shortcuts-save-failed")).toBeVisible();
    await expect(page.getByTestId("shortcuts")).toBeVisible();
  });

  test("reports a conflict on both of the rows that share a key", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    // Give "stop" the key "play/pause" already has.
    await page.getByTestId("bind-stop-window").click();
    await page.keyboard.press("Space");

    await expect(page.getByTestId("clash-stop-window")).toBeVisible();
    await expect(page.getByTestId("clash-playPause-window")).toBeVisible();
  });

  test("clears a binding, and the key then does nothing", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await page.getByTestId("clear-playPause-window").click();
    await expect(page.getByTestId("bind-playPause-window")).toHaveText("—");
    await page.getByTestId("shortcuts-apply").click();

    // ⚠️ Cleared, not reset to the default: `null` is a real stored value.
    expect((await savedBindings(page)).playPause.window).toBeNull();

    await pressOnBody(page, "Space");
    expect(await controlActions(page)).toEqual([]);
  });

  test("cancelling discards the edit", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-shortcuts").click();
    await page.getByTestId("bind-top-window").click();
    await pressCode(page, "F14");
    await expect(page.getByTestId("bind-top-window")).toHaveText("F14");
    await page.getByRole("button", { name: "Cancel" }).click();

    // Nothing was written, and reopening shows what is actually stored.
    const calls = await ipcCalls(page);
    expect(calls.filter((call) => call.cmd === "settings_set")).toHaveLength(0);
    await page.getByTestId("toolbar-shortcuts").click();
    await expect(page.getByTestId("bind-top-window")).toHaveText("Home");
  });

  test("restores the shipped defaults", async ({ page }) => {
    await mockTauri(page, { bindings: { playPause: { window: "F13", global: null } } });
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await expect(page.getByTestId("bind-playPause-window")).toHaveText("F13");
    await page.getByTestId("shortcuts-reset").click();
    await expect(page.getByTestId("bind-playPause-window")).toHaveText("Space");
  });

  /** A rebind has to actually take effect, not merely be stored. */
  test("a saved rebind is the key that then works", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("toolbar-shortcuts").click();
    await page.getByTestId("bind-playPause-window").click();
    await pressCode(page, "F13");
    await page.getByTestId("shortcuts-apply").click();
    await expect(page.getByTestId("shortcuts")).toBeHidden();

    await page.locator("body").click({ position: { x: 5, y: 200 } });
    await pressCode(page, "F13");
    expect(await controlActions(page)).toEqual(["toggle"]);
    // And the key it replaced is no longer bound to anything.
    await page.keyboard.press("Space");
    expect(await controlActions(page)).toEqual(["toggle"]);
  });
});

// ---------------------------------------------------------------------------
// FT-M13 — global hotkeys
// ---------------------------------------------------------------------------

test.describe("FT-M13 global hotkeys", () => {
  /** Rust owns the OS registration and emits the command id; from the UI's side
   * a hotkey is indistinguishable from a keystroke. */
  test("a hotkey from the backend runs the same command a key does", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);

    await page.evaluate(() => {
      (window as unknown as { __emitTauri: (e: string, p: unknown) => void }).__emitTauri(
        "hotkey",
        "faster",
      );
    });
    await expect.poll(() => controlActions(page)).toEqual(["faster"]);
  });

  /** The payload crosses a process boundary, so it is checked rather than
   * trusted — a registration left over from an older build must not walk into
   * the dispatcher. */
  test("an unknown command from the backend is ignored", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);

    await page.evaluate(() => {
      (window as unknown as { __emitTauri: (e: string, p: unknown) => void }).__emitTauri(
        "hotkey",
        "selfDestruct",
      );
    });
    await page.waitForTimeout(100);
    expect(await controlActions(page)).toEqual([]);
  });

  /**
   * ⚠️ A registration the OS refused must be visible against the row that
   * caused it. A hotkey that silently did not register is one the operator
   * finds out about on a shoot.
   */
  test("shows which hotkey the OS refused, and why", async ({ page }) => {
    await mockTauri(page, {
      bindings: { playPause: { window: "Space", global: "F13" } },
      hotkeyStatus: {
        failed: { playPause: "HotKey already registered" },
        wayland: false,
      },
    });
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await expect(page.getByTestId("hotkey-failed-playPause")).toContainText(
      "Another program is using this key",
    );
  });

  /** The honest per-OS note. Shown only where it is true — a warning that is
   * always on screen is one nobody reads by the time it matters. */
  test("says so on Wayland, where the compositor refuses by design", async ({ page }) => {
    await mockTauri(page, {
      hotkeyStatus: { failed: {}, wayland: true },
    });
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await expect(page.getByTestId("shortcuts-wayland")).toBeVisible();
  });

  test("says nothing about Wayland on a platform where it does not apply", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await expect(page.getByTestId("shortcuts-wayland")).toBeHidden();
  });

  /** `find` opens a dialog, so a global binding could only ever be a keystroke
   * that appears to do nothing. */
  test("offers no global binding for a command that cannot have one", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    await page.getByTestId("toolbar-shortcuts").click();

    await expect(page.getByTestId("bind-find-global")).toHaveCount(0);
    await expect(page.getByTestId("shortcut-row-find")).toContainText("In the app only");
  });
});

// ---------------------------------------------------------------------------
// The projector reads the same table
// ---------------------------------------------------------------------------

test.describe("the projector answers the same bindings", () => {
  test("drives the transport from its own window", async ({ page }) => {
    await mockTauri(page, { windowLabel: "projector" });
    await page.goto("/");
    await expect(page.getByTestId("projector")).toBeVisible();

    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    expect(await controlActions(page)).toEqual(["toggle", "stepForward"]);
  });

  /**
   * ⚠️ The projector never queries settings — it reads the engine snapshot —
   * so a rebind reaches it only because `bindings` rides on the DTO. Left off,
   * the operator's preview would follow a rebind and the talent's window would
   * still be answering the old key.
   */
  test("follows a rebind that arrived on the engine broadcast", async ({ page }) => {
    await mockTauri(page, {
      windowLabel: "projector",
      bindings: { playPause: { window: "F13", global: null } },
    });
    await page.goto("/");
    await expect(page.getByTestId("projector")).toBeVisible();

    await page.keyboard.press("Space");
    expect(await controlActions(page)).toEqual([]);
    await pressCode(page, "F13");
    expect(await controlActions(page)).toEqual(["toggle"]);
  });
});
