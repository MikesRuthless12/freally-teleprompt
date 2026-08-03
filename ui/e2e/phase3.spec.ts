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
