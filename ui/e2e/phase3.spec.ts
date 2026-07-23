import { expect, test, type Page } from "@playwright/test";

import { ipcCalls, lastCall, mockTauri } from "./mock-ipc";

/**
 * Phase 3 coverage (SR-2) — every FT-31 voice-command behaviour Playwright can
 * reach. The recogniser, the microphone and DTW are hardware and live in Rust
 * unit tests + a human drill; what the UI owns is the CONTRACT around them:
 *
 *   - voice is off by default and opens no microphone until asked;
 *   - the Settings pane trains/forgets commands through the right IPC calls;
 *   - always-listening starts on enable, push-to-talk only while held;
 *   - a recognised command (a `voice:command` event) drives the transport;
 *   - the mic indicator follows the `voice:listening` event.
 *
 * So the assertions are on what reached the backend and on the two events the
 * backend would emit — never on anything that needs a real microphone.
 */

const SHOTS = "e2e/screenshots";

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

/** The app shell (and so the engine script + caesuras) is ready to drive. */
async function waitForShell(page: Page) {
  await expect(page.getByTestId("caesura-editor")).toContainText("scrolls");
}

test.describe("FT-31 voice commands — the Settings pane", () => {
  test("voice is off by default and opens no microphone", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);

    const calls = await ipcCalls(page);
    expect(calls.some((c) => c.cmd === "voice_start_listening")).toBe(false);
    await expect(page.getByTestId("voice-mic-live")).toHaveCount(0);
    await expect(page.getByTestId("voice-hold-to-talk")).toHaveCount(0);

    const dialog = await openVoicePane(page);
    await expect(dialog.getByTestId("settings-voice-enabled")).not.toBeChecked();
    // The mode picker is inert until voice is on.
    await expect(dialog.getByTestId("settings-voice-mode")).toBeDisabled();
    await page.screenshot({ path: `${SHOTS}/voice-settings.png` });
  });

  test("enabling voice rides the applied draft, not a live write", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    const dialog = await openVoicePane(page);

    await dialog.getByTestId("settings-voice-enabled").check();
    // Editing the draft alone must not touch the backend (draft/apply contract).
    expect((await ipcCalls(page)).some((c) => c.cmd === "settings_set")).toBe(false);

    await dialog.getByTestId("settings-voice-mode").selectOption("always");
    await dialog.getByTestId("settings-apply").click();

    const sent = await lastCall(page, "settings_set");
    expect(sent?.next).toMatchObject({ voiceEnabled: true, voiceMode: "always" });
  });

  test("recording a command asks the backend to enrol exactly it", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    const dialog = await openVoicePane(page);

    await expect(dialog.getByTestId("voice-takes-play")).toHaveText(/not recorded/i);
    await dialog.getByTestId("voice-train-play").click();

    expect(await lastCall(page, "voice_enroll_capture")).toEqual({ commandId: "play" });
    // The take count reflects the new recording the backend reported back.
    await expect(dialog.getByTestId("voice-takes-play")).toHaveText(/1/);
  });

  test("forgetting a command asks the backend to drop exactly it", async ({ page }) => {
    await mockTauri(page, { voiceCommands: [{ id: "pause", takes: 3 }] });
    await page.goto("/");
    const dialog = await openVoicePane(page);

    await expect(dialog.getByTestId("voice-takes-pause")).toHaveText(/3/);
    await dialog.getByTestId("voice-forget-pause").click();
    expect(await lastCall(page, "voice_forget_command")).toEqual({ commandId: "pause" });
  });
});

test.describe("FT-31 voice commands — listening and the transport binding", () => {
  test("always-listening starts on launch when enabled", async ({ page }) => {
    await mockTauri(page, { voiceEnabled: true, voiceMode: "always" });
    await page.goto("/");
    await waitForShell(page);

    await expect
      .poll(async () => (await ipcCalls(page)).some((c) => c.cmd === "voice_start_listening"))
      .toBe(true);
    // Always-mode has no hold button — it listens continuously.
    await expect(page.getByTestId("voice-hold-to-talk")).toHaveCount(0);
  });

  test("push-to-talk holds the mic only while the button is pressed", async ({ page }) => {
    await mockTauri(page, { voiceEnabled: true, voiceMode: "push_to_talk" });
    await page.goto("/");
    await waitForShell(page);

    // It did NOT open the mic on its own.
    expect((await ipcCalls(page)).some((c) => c.cmd === "voice_start_listening")).toBe(false);
    const hold = page.getByTestId("voice-hold-to-talk");
    await expect(hold).toBeVisible();

    await hold.dispatchEvent("pointerdown");
    await expect
      .poll(async () => (await ipcCalls(page)).some((c) => c.cmd === "voice_start_listening"))
      .toBe(true);

    await hold.dispatchEvent("pointerup");
    await expect
      .poll(async () => (await ipcCalls(page)).some((c) => c.cmd === "voice_stop_listening"))
      .toBe(true);
  });

  test("a recognised command drives the shared transport", async ({ page }) => {
    await mockTauri(page, { voiceEnabled: true, voiceMode: "always" });
    await page.goto("/");
    await waitForShell(page);

    await emit(page, "voice:command", { commandId: "play", confidence: 0.9 });
    await expect
      .poll(async () => await lastCall(page, "teleprompter_control"))
      .toMatchObject({ action: "play" });
  });

  test('"next pause" seeks forward to the next caesura', async ({ page }) => {
    await mockTauri(page, { voiceEnabled: true, voiceMode: "always", offset: 0 });
    await page.goto("/");
    await waitForShell(page);

    await emit(page, "voice:command", { commandId: "nextMarker", confidence: 0.9 });
    await expect
      .poll(async () => await lastCall(page, "teleprompter_control"))
      .toMatchObject({ action: "seek" });
    const seek = await lastCall(page, "teleprompter_control");
    expect(Number(seek?.value)).toBeGreaterThan(0);
  });

  test("the mic indicator follows the listening event", async ({ page }) => {
    await mockTauri(page, { voiceEnabled: true, voiceMode: "always" });
    await page.goto("/");
    await waitForShell(page);

    await emit(page, "voice:listening", true);
    await expect(page.getByTestId("voice-mic-live")).toBeVisible();
    await emit(page, "voice:listening", false);
    await expect(page.getByTestId("voice-mic-live")).toHaveCount(0);
  });
});
