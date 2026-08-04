import { expect, test, type Page } from "@playwright/test";

import { ipcCalls, lastCall, mockTauri, openSettingsPane } from "./mock-ipc";

/**
 * Phase A — rehearsal and timing depth — plus FT-M02's skipped labels.
 *
 * The arithmetic these features rest on is unit-tested in `tempo.test.ts`,
 * `rehearsal.test.ts` and `skips.test.ts`, including the two proofs the Phase A
 * DoD asks for by name (the metronome's ten-minute no-drift measurement, and
 * that rehearsal opens no audio path). What is checked HERE is the half a unit
 * test cannot reach: that the controls exist, that they are wired to the engine
 * and to the settings draft, and that the numbers reach the screen.
 *
 * The audible click itself is a human drill — a headless browser has no
 * speakers, and asserting that an oscillator node was constructed would test
 * the mock rather than the feature. It is written up in `Live-To-Do-List.md`.
 */

const SHOTS = "e2e/screenshots";

/** The app shell has booted and the engine's script has arrived. */
async function waitForShell(page: Page) {
  await expect(page.getByTestId("caesura-editor")).toBeVisible();
}

/** Open Settings on the Timing pane — every Settings case here wants that one. */
const openTiming = (page: Page) => openSettingsPane(page, "Timing");

// ---------------------------------------------------------------------------
// FT-N04 — bars and beats
// ---------------------------------------------------------------------------

test.describe("FT-N04 bar and beat counter", () => {
  test("stays out of the way until the operator is working to a tempo", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);

    // A bar number over a script being read at 12 characters a second is a
    // number with nothing attached to it.
    await expect(page.getByTestId("tempo-readout")).toHaveCount(0);
    await expect(page.getByTestId("seek-bar-line")).toHaveCount(0);

    await page.getByRole("checkbox", { name: /BPM mode/ }).check();
    await expect(page.getByTestId("tempo-readout")).toBeVisible();
  });

  test("counts bars and beats from one, and rules the seek bar", async ({ page }) => {
    await mockTauri(page, { beatsPerBar: 4 });
    await page.goto("/");
    await waitForShell(page);
    await page.getByRole("checkbox", { name: /BPM mode/ }).check();

    // Parked at the top: bar 1, beat 1 — the way a musician counts, never zero.
    await expect(page.getByTestId("tempo-readout")).toContainText("1");
    // The track is ruled at real bar lines. The script is short, so the count
    // is small and bounded — what matters is that they exist and are drawn
    // inside the track.
    const lines = page.getByTestId("seek-bar-line");
    await expect(lines.first()).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/tempo-bars.png` });
  });

  /**
   * The readout has to describe the tempo the scroll is ACTUALLY running at.
   *
   * `bpmRange` narrows what may be *typed* into the BPM box, and that clamp
   * was being applied to the readout as well — so at the shipped calibration
   * every speed above 14.58 chars/sec pinned the counter, the bar lines and
   * the click at a flat 250 while the scroll went on accelerating to four
   * times that. One press of Faster from the default was enough.
   */
  test("the tempo follows the scroll past the top of the settable range", async ({ page }) => {
    await mockTauri(page, { metronome: true, script: "a script long enough to rule" });
    await page.goto("/");
    await waitForShell(page);
    await page.getByRole("checkbox", { name: /BPM mode/ }).check();

    const field = page.getByRole("spinbutton", { name: /Speed \(BPM\)/ });
    // The shipped 12 chars/sec at 3.5 chars a beat is 206 BPM.
    await expect(field).toHaveValue("206");

    // Faster multiplies the speed by 1.25, to 15 chars/sec — a true 257 BPM,
    // which is past `BPM_MAX`. The field's max still says 250, because that is
    // what may be TYPED; the value says what the scroll is doing.
    await page.getByTestId("transport").getByRole("button", { name: "Faster" }).click();
    await expect(field).toHaveValue("257");
    expect(Number(await field.getAttribute("max"))).toBe(250);
  });

  test("the click and the counter appear together with the metronome on", async ({ page }) => {
    // The metronome alone is enough to mean "working to a tempo" — BPM mode is
    // a display toggle, not the thing that makes bars meaningful.
    await mockTauri(page, { metronome: true });
    await page.goto("/");
    await waitForShell(page);
    await expect(page.getByTestId("tempo-readout")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// FT-N02 — tap tempo and calibration
// ---------------------------------------------------------------------------

test.describe("FT-N02 tap-tempo calibration", () => {
  test("says nothing until there are enough taps, then reports a tempo", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    const dialog = await openTiming(page);

    const tap = dialog.getByTestId("settings-tap");
    const readout = dialog.getByTestId("settings-tap-bpm");
    await expect(readout).toContainText("Tap three times");
    // Applying is refused until there is a tempo to apply.
    await expect(dialog.getByTestId("settings-tap-apply")).toBeDisabled();

    // Three taps at a steady interval. Playwright's clicks are not metronomic,
    // so the BPM is not asserted — what is asserted is that a tempo appeared
    // and that it is a usable number.
    await tap.click();
    await page.waitForTimeout(120);
    await tap.click();
    await page.waitForTimeout(120);
    await tap.click();

    await expect(readout).toContainText("BPM");
    await expect(dialog.getByTestId("settings-tap-apply")).toBeEnabled();

    await dialog.screenshot({ path: `${SHOTS}/settings-timing.png` });
  });

  test("applying a tapped tempo writes a calibration, and reset takes it back", async ({
    page,
  }) => {
    await mockTauri(page, { charsPerBeat: 7 });
    await page.goto("/");
    await waitForShell(page);
    const dialog = await openTiming(page);

    // The pane shows the calibration that is actually in force.
    await expect(dialog.getByTestId("settings-chars-per-beat")).toContainText("7.00");

    // Reset is offered because this install is calibrated away from the default.
    await dialog.getByTestId("settings-tap-reset").click();
    await expect(dialog.getByTestId("settings-chars-per-beat")).toContainText("3.50");
    // ...and is then refused, because there is nothing left to reset.
    await expect(dialog.getByTestId("settings-tap-reset")).toBeDisabled();

    await dialog.getByRole("button", { name: "Apply" }).click();
    expect((await lastCall(page, "settings_set"))?.next).toMatchObject({ charsPerBeat: 3.5 });
  });

  test("a calibration narrows the BPM range rather than lying about it", async ({ page }) => {
    // At 20 characters a beat the top of the musical range would need a speed
    // the engine refuses, so the entry field must not offer it.
    await mockTauri(page, { charsPerBeat: 20 });
    await page.goto("/");
    await waitForShell(page);
    await page.getByRole("checkbox", { name: /BPM mode/ }).check();

    const field = page.getByRole("spinbutton", { name: /Speed \(BPM\)/ });
    const max = await field.getAttribute("max");
    expect(Number(max)).toBeLessThan(250);
    expect(Number(max)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// FT-N03 — the metronome
// ---------------------------------------------------------------------------

test.describe("FT-N03 metronome", () => {
  test("is off as the app ships, and round-trips through Apply", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    const dialog = await openTiming(page);

    const box = dialog.getByTestId("settings-metronome");
    await expect(box).not.toBeChecked();
    await box.check();
    await dialog.getByRole("button", { name: "Apply" }).click();

    expect((await lastCall(page, "settings_set"))?.next).toMatchObject({ metronome: true });
  });

  test("the bar length is settable and applied", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    const dialog = await openTiming(page);

    await dialog.getByTestId("settings-beats-per-bar").selectOption("3");
    await dialog.getByRole("button", { name: "Apply" }).click();
    expect((await lastCall(page, "settings_set"))?.next).toMatchObject({ beatsPerBar: 3 });
  });

  test("playing with the click on does not disturb the scroll", async ({ page }) => {
    // A headless browser has no speakers, so what is checked is that switching
    // it on and playing leaves the app working — the scheduler owns an
    // AudioContext, and one that throws on construction used to be a real way
    // to take the whole shell down.
    await mockTauri(page, { metronome: true, script: "one two three four five" });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("transport").getByRole("button", { name: "Play" }).click();
    await page.waitForTimeout(300);
    await expect(page.getByTestId("teleprompter-scroller")).toBeVisible();
    await expect(page.getByTestId("tempo-readout")).toBeVisible();
    // And no error line was raised anywhere in the shell.
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// FT-N01 / FT-N05 — rehearsal and the pace warning
// ---------------------------------------------------------------------------

test.describe("FT-N01 rehearsal", () => {
  /** Three short sections, so a read crosses them in about a second. */
  const SCRIPT = ["first bit", "", "second bit", "", "third bit"].join("\n");

  test("records nothing until it is switched on", async ({ page }) => {
    await mockTauri(page, { script: SCRIPT });
    await page.goto("/");
    await waitForShell(page);

    await expect(page.getByTestId("rehearse-toggle")).not.toBeChecked();
    await expect(page.getByTestId("rehearsal-report")).toHaveCount(0);
    // The whole promise of the feature: no microphone is ever asked for.
    expect((await ipcCalls(page)).some((c) => c.cmd === "dictation_start")).toBe(false);
  });

  test("times a read through and reports it section by section", async ({ page }) => {
    await mockTauri(page, { script: SCRIPT });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("rehearse-toggle").check();
    await page.getByTestId("transport").getByRole("button", { name: "Play" }).click();
    // Long enough at 12 chars/sec to cross all three sections (28 chars).
    await page.waitForTimeout(2800);
    await page.getByTestId("rehearse-toggle").uncheck();

    const report = page.getByTestId("rehearsal-report");
    await expect(report).toBeVisible();
    // One row per paragraph, each with a planned and an actual time.
    await expect(report.getByTestId("rehearsal-row")).toHaveCount(3);
    await expect(report).toContainText("first bit");
    await expect(report).toContainText("third bit");

    await report.screenshot({ path: `${SHOTS}/rehearsal-report.png` });
    await page.getByTestId("rehearsal-close").click();
    await expect(report).toHaveCount(0);
  });

  test("a read that was never started reports that, rather than inventing rows", async ({
    page,
  }) => {
    await mockTauri(page, { script: SCRIPT });
    await page.goto("/");
    await waitForShell(page);

    // Switched on and straight off again without ever pressing play.
    await page.getByTestId("rehearse-toggle").check();
    await page.waitForTimeout(150);
    await page.getByTestId("rehearse-toggle").uncheck();

    const report = page.getByTestId("rehearsal-report");
    await expect(report).toBeVisible();
    await expect(report.getByTestId("rehearsal-row")).toHaveCount(0);
    await expect(report).toContainText("Nothing has been timed yet");
  });

  test("read-aloud and rehearsal are mutually exclusive, in BOTH orders", async ({ page }) => {
    // A rehearsal of the machine reading to itself measures nothing about the
    // performer, so the two modes lock each other out.
    await mockTauri(page, { script: SCRIPT });
    await page.goto("/");
    await waitForShell(page);
    const readAloud = page.getByRole("checkbox", { name: /Read aloud/ });
    const rehearse = page.getByTestId("rehearse-toggle");

    await readAloud.check();
    await expect(rehearse).toBeDisabled();
    await readAloud.uncheck();
    await expect(rehearse).toBeEnabled();

    // The other order, which is the one that used to get through: the lock was
    // written on the rehearse box only, so this left BOTH on — and the rehearse
    // box, now disabled while checked, could not be unticked again.
    await rehearse.check();
    await expect(readAloud).toBeDisabled();
    await expect(rehearse).toBeEnabled();
    await rehearse.uncheck();
    await expect(readAloud).toBeEnabled();
  });

  /**
   * The recording has to survive the things a rehearsal exists to measure.
   *
   * The recorder is re-anchored on every engine broadcast — and a pause, a
   * seek and a speed change each produce one. When the reset lived in that
   * same effect, every one of them emptied the buffer: the report then showed
   * `0:00` actual for every section read before the pause, and offered to
   * "correct" the pace to the engine's maximum on the strength of it.
   */
  test("a pause mid-read does not throw the recording away", async ({ page }) => {
    await mockTauri(page, { script: SCRIPT });
    await page.goto("/");
    await waitForShell(page);
    const transport = page.getByTestId("transport");

    await page.getByTestId("rehearse-toggle").check();
    await transport.getByRole("button", { name: "Play" }).click();
    await page.waitForTimeout(1400);
    // Pause — a broadcast that changes BOTH `playing` and `offset`.
    await transport.getByRole("button", { name: "Pause" }).click();
    await page.waitForTimeout(400);
    await transport.getByRole("button", { name: "Play" }).click();
    await page.waitForTimeout(1600);
    await page.getByTestId("rehearse-toggle").uncheck();

    const report = page.getByTestId("rehearsal-report");
    await expect(report).toBeVisible();
    // The first section was read BEFORE the pause. Had the buffer been emptied
    // there, every sample would start past this section, `crossedAt` would
    // return the first sample's time for both its ends, and the actual would
    // come out as a flat 0:00 for a section that really took a second.
    const first = report.getByTestId("rehearsal-row").first();
    await expect(first).toContainText("first bit");
    await expect(first.locator("td").nth(2), "actual for a section really read").not.toHaveText(
      "0:00",
    );
  });

  test("the pace warning appears once the read has slipped from its plan", async ({ page }) => {
    await mockTauri(page, { script: SCRIPT });
    await page.goto("/");
    await waitForShell(page);

    await page.getByTestId("rehearse-toggle").check();
    // Rehearsing but NOT playing: the rehearsal clock runs, the script does
    // not, so the gap opens at one second per second. Nothing is shown until
    // it passes the threshold, which is the point of a threshold.
    await expect(page.getByTestId("pace-warning")).toHaveCount(0);
    await page.waitForTimeout(3600);
    await expect(page.getByTestId("pace-warning")).toBeVisible();
    await expect(page.getByTestId("pace-warning")).toContainText("Running long");
  });
});

// ---------------------------------------------------------------------------
// FT-M02 — words you read but do not perform
// ---------------------------------------------------------------------------

test.describe("FT-M02 skipped labels", () => {
  // "ab" + "Chorus" + "cd" — the label is visible characters 2 through 7.
  const SCRIPT = "ab\nChorus\ncd";

  test("a label costs no read time, so the total drops", async ({ page }) => {
    // A script whose labels are a real share of it, so the change is visible in
    // whole seconds rather than lost to rounding.
    const body = "the opening line of a verse that runs on for a while and then some more";
    const withLabels = [body, "Chorus", body, "Chorus", body, "Chorus"].join("\n");

    await mockTauri(page, { script: withLabels });
    await page.goto("/");
    await waitForShell(page);
    const plain = await page.getByTestId("teleprompter-seek").textContent();

    await mockTauri(page, { script: withLabels, skipWords: ["Chorus"] });
    await page.goto("/");
    await waitForShell(page);
    const skipped = await page.getByTestId("teleprompter-seek").textContent();

    expect(skipped).not.toEqual(plain);
  });

  test("a label stays on screen, dimmed, rather than disappearing", async ({ page }) => {
    await mockTauri(page, { script: SCRIPT, skipWords: ["Chorus"] });
    await page.goto("/");
    await waitForShell(page);

    const chars = page.getByTestId("teleprompter-scroller").locator("[data-ch]");
    await expect(chars).toHaveCount(10);
    // There is one span per visible character, so a span's index IS its
    // visible-char offset — index 2 is the "C" of the label.
    await expect(chars.nth(2)).toHaveCSS("opacity", "0.45");
    await expect(chars.nth(7)).toHaveCSS("opacity", "0.45");
    // The lyric either side of it is untouched.
    await expect(chars.nth(0)).toHaveCSS("opacity", "1");
    await expect(chars.nth(8)).toHaveCSS("opacity", "1");

    await page.screenshot({ path: `${SHOTS}/skip-words.png` });
  });

  test("the keyword list round-trips through Apply", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await waitForShell(page);
    const dialog = await openTiming(page);

    await dialog.getByTestId("settings-skip-words").fill("Chorus\nVerse\n\n  Bridge  ");
    await dialog.getByRole("button", { name: "Apply" }).click();

    // Trimmed, and the blank line dropped — a blank is not a keyword, and one
    // stored as an empty string would look configured in the settings file
    // while matching nothing.
    expect((await lastCall(page, "settings_set"))?.next).toMatchObject({
      skipWords: ["Chorus", "Verse", "Bridge"],
    });
  });

  test("no keywords means nothing is dimmed and nothing is skipped", async ({ page }) => {
    await mockTauri(page, { script: SCRIPT });
    await page.goto("/");
    await waitForShell(page);

    const chars = page.getByTestId("teleprompter-scroller").locator("[data-ch]");
    await expect(chars.nth(2)).toHaveCSS("opacity", "1");
  });
});
