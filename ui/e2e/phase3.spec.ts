import { expect, test, type Page } from "@playwright/test";

import { ipcCalls, lastCall, mockTauri } from "./mock-ipc";

/**
 * Dictation (FT-33) — every behaviour Playwright can reach.
 *
 * The recogniser, the microphone and Vosk itself are hardware and native code:
 * they live in `freally-speech`'s unit tests, in the `--features vosk` compile
 * check, and in the drill in `freally-speech/tests/vosk_model.rs`. What the UI
 * owns is the CONTRACT around them:
 *
 *   - dictation is off by default and opens no microphone until asked;
 *   - the Settings toggle is refused where the model is absent;
 *   - the record button appears only when it can actually work;
 *   - pressing it starts, pressing again stops, and it looks different;
 *   - a recognised utterance (a `voice:dictation` event) reaches the script.
 *
 * So the assertions are on what reached the backend and on the events the
 * backend would emit — never on anything that needs a real microphone.
 *
 * ⚠️ This file used to cover FT-31 voice commands and FT-35 voice-following.
 * Both features were removed from the app: commands required the operator to
 * record every command in their own voice before anything worked at all, and
 * dictation does the same jobs with nothing to train.
 */

const SHOTS = "e2e/screenshots";

/** A capability that says the engine and its model are both present. */
const READY = { available: true, engine: "vosk", detail: "ready" };

/** Fire a backend event the way the recogniser would (see mock-ipc `__emitTauri`). */
async function emit(page: Page, event: string, payload: unknown) {
  await emitAll(page, [[event, payload]]);
}

/**
 * Fire several events WITHOUT yielding between them.
 *
 * This matters more than it looks. Each `page.evaluate` is a CDP round-trip, so
 * two separate `emit` calls give React time to flush and rebuild its handlers in
 * between — which is exactly the gap the code under test has to survive without.
 * Firing back-to-back utterances through two `emit`s tested nothing: it passed
 * against the naive implementation that loses the first utterance. Anything
 * asserting behaviour BETWEEN renders has to go through here.
 */
async function emitAll(page: Page, events: Array<[string, unknown]>) {
  await page.evaluate((batch) => {
    const w = window as unknown as { __emitTauri: (e: string, p: unknown) => void };
    for (const [event, payload] of batch) w.__emitTauri(event, payload);
  }, events);
}

async function openVoicePane(page: Page) {
  await page.getByTestId("titlebar-settings").click();
  await page.getByRole("tab", { name: "Voice" }).click();
  return page.getByTestId("settings-dialog");
}

/** The app shell (and so the engine script) is ready to drive. */
async function waitForShell(page: Page) {
  await expect(page.getByTestId("caesura-editor")).toContainText("scrolls");
}

test.describe("FT-33 dictation — the Settings pane", () => {
  test("dictation is off by default and opens no microphone", async ({ page }) => {
    await mockTauri(page, { speechCapability: READY });
    await page.goto("/");
    await waitForShell(page);

    // Nothing asked for the microphone on its own.
    expect((await ipcCalls(page)).some((c) => c.cmd === "dictation_start")).toBe(false);
    // And no record button is offered until it is switched on.
    await expect(page.getByTestId("dictate-toggle")).toHaveCount(0);

    const dialog = await openVoicePane(page);
    await expect(dialog.getByTestId("settings-dictation-enabled")).not.toBeChecked();
    await dialog.screenshot({ path: `${SHOTS}/settings-voice.png` });
  });

  test("the toggle is refused, with a reason, where the model is missing", async ({ page }) => {
    await mockTauri(page, {
      speechCapability: { available: false, engine: "vosk", detail: "no model" },
    });
    await page.goto("/");
    await waitForShell(page);

    const dialog = await openVoicePane(page);
    // Disabled rather than hidden: the operator should be able to see the
    // feature exists and read why it cannot run.
    await expect(dialog.getByTestId("settings-dictation-enabled")).toBeDisabled();
    await expect(dialog).toContainText("model");
  });

  test("enabling it rides the applied draft, not a live write", async ({ page }) => {
    await mockTauri(page, { speechCapability: READY });
    await page.goto("/");
    await waitForShell(page);

    const dialog = await openVoicePane(page);
    await dialog.getByTestId("settings-dictation-enabled").check();
    // Still nothing written — Settings defers to Apply.
    expect((await ipcCalls(page)).some((c) => c.cmd === "settings_set")).toBe(false);

    await dialog.getByTestId("settings-apply").click();
    await expect
      .poll(async () => {
        const sent = (await lastCall(page, "settings_set")) as
          { next?: { dictationEnabled?: boolean } } | undefined;
        return sent?.next?.dictationEnabled;
      })
      .toBe(true);
  });
});

test.describe("FT-33 dictation — the record button", () => {
  /** The app as the operator has it once dictation is switched on and usable. */
  const ON = { dictationEnabled: true, speechCapability: READY };

  test("the record button appears, and only where it can work", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);
    await expect(page.getByTestId("dictate-toggle")).toBeVisible();

    // Switched on, but the model is absent: the button must NOT be offered,
    // because pressing it could only ever fail.
    await mockTauri(page, {
      dictationEnabled: true,
      speechCapability: { available: false, engine: "vosk", detail: "no model" },
    });
    await page.goto("/");
    await waitForShell(page);
    await expect(page.getByTestId("dictate-toggle")).toHaveCount(0);
  });

  /**
   * The button's appearance is a specified feature, not decoration: a circle
   * with a glyph and NO text, the instruction beside it, and a colour that
   * follows the pointer as well as the state.
   *
   * The colour half is four cells (idle/recording × resting/hovered) and only
   * two of them are React's business, so it is asserted through the computed
   * style rather than through a class name — a class that stopped matching a
   * rule would still be on the element.
   */
  test("it is a glyph in a circle, with the instruction beside it", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    const record = page.getByTestId("dictate-toggle");
    const hint = page.getByTestId("dictate-hint");

    // Nothing inside the button but the glyph — the words moved out of it.
    await expect(record).toHaveText(/^\s*$/);
    await expect(record).toHaveAccessibleName("Dictate");
    await expect(hint).toHaveText("Press record to start dictation");

    // The dark palette's three states. Read as the colour the glyph is drawn
    // in (`bg-current`), which is also the border's.
    const DEFAULT = "rgb(245, 247, 250)";
    const GREEN = "rgb(52, 211, 153)";
    const RED = "rgb(248, 113, 113)";
    // Polled, not read once: the colour transitions over 150ms, so a single
    // read lands on some colour part-way between the two.
    const colour = () => record.evaluate((el) => getComputedStyle(el).color);

    expect(await colour()).toBe(DEFAULT);
    await record.hover();
    await expect.poll(colour).toBe(GREEN);

    await record.click();
    await emit(page, "voice:dictating", true);
    await expect(hint).toHaveText("Press stop to stop dictation");
    await expect(record).toHaveAccessibleName("Stop dictating");

    // The pointer has not moved, so this is the hovered STOP button: red.
    await expect.poll(colour).toBe(RED);
    // Move away and recording rests green — the state, without the warning.
    await page.getByTestId("caesura-editor").hover();
    await expect.poll(colour).toBe(GREEN);

    // The light theme re-tints both colours, and nothing else can catch it if
    // it stops: `theme:lint` only sees white-alpha UTILITIES, and this button
    // is a bespoke class on purpose. Left unre-tinted, the dark green lands at
    // ~2:1 on the near-white page — a recording indicator you cannot see.
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
    await expect.poll(colour).toBe("rgb(4, 120, 87)");
  });

  test("press to record, press again to stop", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    const record = page.getByTestId("dictate-toggle");
    await expect(record).toHaveAttribute("aria-pressed", "false");

    await record.click();
    await expect
      .poll(async () => (await ipcCalls(page)).some((c) => c.cmd === "dictation_start"))
      .toBe(true);

    // The backend confirms it is running; only then does the button change.
    await emit(page, "voice:dictating", true);
    await expect(record).toHaveAttribute("aria-pressed", "true");

    await record.click();
    await expect
      .poll(async () => (await ipcCalls(page)).some((c) => c.cmd === "dictation_stop"))
      .toBe(true);

    await emit(page, "voice:dictating", false);
    await expect(record).toHaveAttribute("aria-pressed", "false");
  });

  /** The load-bearing one: what is said has to end up in the script. */
  test("a recognised utterance is written into the script", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("dictate-toggle").click();
    await emit(page, "voice:dictating", true);
    await emit(page, "voice:dictation", "hello from the microphone");

    // It reached the ENGINE, not merely the textarea — that is what drives the
    // preview, the projector and the LAN mirror.
    await expect
      .poll(async () => {
        const sent = (await lastCall(page, "teleprompter_set_script")) as
          { text?: string } | undefined;
        return sent?.text ?? "";
      })
      .toContain("hello from the microphone");
    await expect(page.getByTestId("caesura-editor")).toContainText("hello from the microphone");
  });

  /**
   * Two utterances arriving BACK TO BACK must both survive, and be separated.
   *
   * The regression this guards: the script round-trips through the engine, so a
   * second utterance arriving before that returns would append to the same base
   * as the first — and the first would vanish. Both events therefore go through
   * `emitAll`, in ONE evaluate, with no chance for React to flush between them.
   * Fired as two separate `emit`s this test passes even when the bug is present.
   */
  test("consecutive utterances are separated, and neither is lost", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("dictate-toggle").click();
    await emit(page, "voice:dictating", true);
    await emitAll(page, [
      ["voice:dictation", "first line"],
      ["voice:dictation", "second line"],
    ]);

    await expect(page.getByTestId("caesura-editor")).toContainText("first line second line");
  });

  /**
   * Ctrl+Z after dictating must take back ONE utterance.
   *
   * It used to take back the whole session. Dictation wrote to the script
   * through `onScriptChange`, going around the editor entirely, so nothing it
   * ever wrote entered the editor's own undo stack — and the first Ctrl+Z
   * jumped to the last thing that HAD been snapshotted, the last keystroke,
   * discarding every dictated word in one step with no way back.
   *
   * The fix is the seam this asserts: dictation goes in through the editor's
   * `insertText` handle, which snapshots exactly as its paste path does.
   */
  test("undo takes back one utterance, not the whole session", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    const editor = page.getByTestId("caesura-editor");
    await page.getByTestId("dictate-toggle").click();
    await emit(page, "voice:dictating", true);
    await emit(page, "voice:dictation", "first line");
    await emit(page, "voice:dictation", "second line");
    await expect(editor).toContainText("first line second line");

    // The editor has to hold focus for its own Ctrl+Z to fire — the operator
    // pressed a button, so the click is what they would do next anyway.
    await editor.click();
    await page.keyboard.press("Control+z");

    await expect(editor).not.toContainText("second line");
    await expect(editor).toContainText("first line");
  });

  /**
   * Typing by hand while recording must not be thrown away by the next
   * utterance.
   *
   * The same root cause as the undo case above: dictation chained from its own
   * last write rather than from the editor, so anything typed in between was
   * overwritten by the next thing said — and autosave then persisted the loss.
   * Reading the live editor is what makes both go away.
   */
  test("text typed by hand mid-recording survives the next utterance", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    const editor = page.getByTestId("caesura-editor");
    await page.getByTestId("dictate-toggle").click();
    await emit(page, "voice:dictating", true);
    await emit(page, "voice:dictation", "spoken one");
    await expect(editor).toContainText("spoken one");

    await editor.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type(" typed by hand");
    await emit(page, "voice:dictation", "spoken two");

    // ONE assertion covering both halves, deliberately. Asserting them
    // separately passes against the broken code: `toContainText` retries until
    // it matches, so "typed by hand" is satisfied by the frame BEFORE the
    // overwrite lands and the test goes green on a bug it is meant to catch.
    await expect(editor).toContainText("typed by hand spoken two");
  });

  /**
   * Words land at the caret now, not always at the end — so they can land in
   * FRONT of existing text, and the spacing on that side is ours to get right
   * too. Speaking with the caret before a word used to give "spokenWelcome".
   *
   * `toContainText` collapses whitespace, which is exactly why this assertion
   * works: a missing space cannot be collapsed into an existing one.
   */
  test("speaking in front of existing text does not run the words together", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    const editor = page.getByTestId("caesura-editor");
    await page.getByTestId("dictate-toggle").click();
    await emit(page, "voice:dictating", true);

    // The caret at the very start of the script, in front of "Welcome…".
    await editor.click();
    await page.keyboard.press("Control+Home");
    await emit(page, "voice:dictation", "spoken at the top");

    await expect(editor).toContainText("spoken at the top Welcome");
  });

  /**
   * An utterance arriving mid-IME-composition must WAIT, not land.
   *
   * Every other write path in the editor bails on `composing.current`; this one
   * fires with no user action, so without the same guard it serializes the
   * uncommitted preedit as if it were script text and tears down the very node
   * the IME is composing into. Half the app's 18 locales are typed through an
   * IME, so "rare" is not the same as "someone else's problem".
   */
  test("an utterance during IME composition waits for the composition", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    const editor = page.getByTestId("caesura-editor");
    await page.getByTestId("dictate-toggle").click();
    await emit(page, "voice:dictating", true);

    await editor.click();
    await editor.dispatchEvent("compositionstart");
    await emit(page, "voice:dictation", "held for the composition");

    // Proving an absence, so it needs a moment in which the write WOULD have
    // happened — every other path here is synchronous, so this is generous.
    await page.waitForTimeout(300);
    await expect(editor).not.toContainText("held for the composition");

    await editor.dispatchEvent("compositionend");
    await expect(editor).toContainText("held for the composition");
  });

  /**
   * Dictating into an editor nobody is in must not put a caret there.
   *
   * `apply` ends in `setCaret`, which calls `removeAllRanges`/`addRange`. The
   * operator is somewhere else by definition — they just pressed record — so
   * that would move the document selection into the script on every utterance.
   * Where the engine also moves FOCUS on a selection change (Blink does; this
   * headless Chromium does not, which is why the assertion below is on the
   * selection and not on `activeElement`) the cost is worse than cosmetic: the
   * rest of what the operator types lands in the script instead of in the
   * Scripts dialog's filename field, and Space/Enter stop reaching the record
   * button.
   */
  test("dictating puts no caret in an editor nobody is in", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    /** Where the document selection is: inside the editor, or anywhere else. */
    const selectionHome = () =>
      page.evaluate(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return "nowhere";
        const editor = document.querySelector('[data-testid="caesura-editor"]');
        return editor?.contains(sel.getRangeAt(0).startContainer) ? "in-the-editor" : "elsewhere";
      });

    const record = page.getByTestId("dictate-toggle");
    await record.click();
    await emit(page, "voice:dictating", true);
    await emit(page, "voice:dictation", "the caret stays put");

    await expect(page.getByTestId("caesura-editor")).toContainText("the caret stays put");
    expect(await selectionHome()).not.toBe("in-the-editor");
    // And the button the operator is actually on still has focus.
    expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe(
      "dictate-toggle",
    );
  });

  /**
   * Opening another script mid-recording must not carry the previous script's
   * text across. It used to: the next utterance wrote the OLD script over the
   * newly-opened one, and autosave then persisted it — destroying the file.
   */
  test("switching scripts mid-recording does not overwrite the new one", async ({ page }) => {
    await mockTauri(page, {
      ...ON,
      scripts: [{ name: "Act Two", bytes: 10, modifiedMs: 1_760_000_000_000 }],
    });
    await page.goto("/");
    await waitForShell(page);

    const editor = page.getByTestId("caesura-editor");
    await page.getByTestId("dictate-toggle").click();
    await emit(page, "voice:dictating", true);
    await emit(page, "voice:dictation", "belongs to the first script");
    await expect(editor).toContainText("belongs to the first script");

    // Open a different script WITHOUT stopping — the mock replaces the engine
    // text, exactly as `scripts_open` does in Rust.
    await page.getByRole("button", { name: "Scripts" }).click();
    await page.getByRole("button", { name: "Open", exact: true }).first().click();
    await expect(editor).toContainText("[Act Two]");
    await expect(editor).not.toContainText("belongs to the first script");

    // The next utterance must land on Act Two and carry none of the old script
    // with it. Before the fix it re-wrote the previous text over this one, and
    // autosave then persisted that to Act Two's file.
    await emit(page, "voice:dictation", "belongs to act two");
    await expect(editor).toContainText("belongs to act two");
    await expect(editor).not.toContainText("belongs to the first script");
  });

  /** Switching dictation off mid-recording must release the microphone. */
  test("turning dictation off while recording stops it", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("dictate-toggle").click();
    await emit(page, "voice:dictating", true);
    await expect(page.getByTestId("dictate-toggle")).toHaveAttribute("aria-pressed", "true");

    const dialog = await openVoicePane(page);
    await dialog.getByTestId("settings-dictation-enabled").uncheck();
    await dialog.getByTestId("settings-apply").click();

    // The button is gone — and, crucially, the microphone was told to close.
    await expect(page.getByTestId("dictate-toggle")).toHaveCount(0);
    await expect
      .poll(async () => (await ipcCalls(page)).filter((c) => c.cmd === "dictation_stop").length)
      .toBeGreaterThan(0);
  });

  /** A failed session must not leave the button looking live. */
  test("a backend error is surfaced", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    await emit(page, "voice:error", "the microphone could not be opened");
    await expect(page.getByTestId("voice-error")).toContainText("microphone could not be opened");
  });
});
