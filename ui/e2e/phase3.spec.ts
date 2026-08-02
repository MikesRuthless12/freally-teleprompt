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
  await page.evaluate(
    ([e, p]) =>
      (window as unknown as { __emitTauri: (e: string, p: unknown) => void }).__emitTauri(
        e as string,
        p,
      ),
    [event, payload] as const,
  );
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

  /** Two utterances must not run together into one word. */
  test("consecutive utterances are separated", async ({ page }) => {
    await mockTauri(page, ON);
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("dictate-toggle").click();
    await emit(page, "voice:dictating", true);
    await emit(page, "voice:dictation", "first line");
    await emit(page, "voice:dictation", "second line");

    await expect(page.getByTestId("caesura-editor")).toContainText("first line second line");
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
