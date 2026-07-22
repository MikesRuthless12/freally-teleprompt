import { expect, test } from "@playwright/test";

import { ipcCalls, lastCall, mockTauri } from "./mock-ipc";

/**
 * Phase 1 coverage (SR-2) — **every FT-1x feature Playwright can reach**.
 *
 * The standing rule this file implements: each phase extends the smoke to cover
 * everything it possibly can, and whatever is genuinely out of reach (hardware,
 * audio, a second OS process, a real network) gets a step-by-step human drill in
 * `Live-To-Do-List.md` instead. Nothing is simply left untested.
 *
 * Each case asserts behaviour, not just presence: the mocked bridge records IPC
 * calls, so "the button works" means "the button asked the backend for the right
 * thing with the right arguments". The Rust half of each contract is covered by
 * the `src-tauri` unit tests.
 */

const SHOTS = "e2e/screenshots";

const LIBRARY = [
  { name: "Opening monologue", bytes: 1840, modifiedMs: 1_760_000_000_000 },
  { name: "Sponsor read", bytes: 420, modifiedMs: 1_750_000_000_000 },
];

const DISPLAYS = [
  { index: 0, name: "Built-in", width: 2560, height: 1440, primary: true },
  { index: 1, name: "Prompter glass", width: 1920, height: 1080, primary: false },
];

// ---------------------------------------------------------------------------
// FT-10 — the script library
// ---------------------------------------------------------------------------

test.describe("FT-10 script library", () => {
  test("lists scripts, marks the open one, and screenshots", async ({ page }) => {
    await mockTauri(page, { scripts: LIBRARY, currentScript: "Sponsor read" });
    await page.goto("/");

    await page.getByRole("button", { name: "Scripts" }).click();
    const dialog = page.getByTestId("script-library");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Opening monologue")).toBeVisible();
    await expect(dialog.getByText("Sponsor read")).toBeVisible();
    // The currently-open script is marked, so "which one am I editing?" is
    // answerable from the list rather than only from the toolbar.
    await expect(dialog.getByText("open", { exact: true })).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/script-library.png` });
  });

  test("an empty library says so instead of showing a blank box", async ({ page }) => {
    await mockTauri(page, { scripts: [] });
    await page.goto("/");
    await page.getByRole("button", { name: "Scripts" }).click();
    await expect(page.getByText("No scripts yet. Name one above to begin.")).toBeVisible();
  });

  test("New creates the script AND opens it", async ({ page }) => {
    await mockTauri(page, { scripts: [] });
    await page.goto("/");
    await page.getByRole("button", { name: "Scripts" }).click();

    await page.getByLabel("Name a new script").fill("Take 3");
    await page.getByRole("button", { name: "New", exact: true }).click();

    // Creating without opening would leave the operator to hunt for the script
    // they just made — so both calls must happen, with the same name.
    await expect
      .poll(async () => (await ipcCalls(page)).map((c) => c.cmd))
      .toContain("scripts_create");
    expect(await lastCall(page, "scripts_create")).toEqual({ name: "Take 3" });
    expect(await lastCall(page, "scripts_open")).toEqual({ name: "Take 3" });
  });

  test("Open loads the chosen script and closes the dialog", async ({ page }) => {
    await mockTauri(page, { scripts: LIBRARY });
    await page.goto("/");
    await page.getByRole("button", { name: "Scripts" }).click();

    await page.getByRole("button", { name: "Open", exact: true }).first().click();

    expect(await lastCall(page, "scripts_open")).toEqual({ name: "Opening monologue" });
    await expect(page.getByTestId("script-library")).toHaveCount(0);
  });

  test("Rename sends the old and new names together", async ({ page }) => {
    await mockTauri(page, { scripts: LIBRARY });
    await page.goto("/");
    await page.getByRole("button", { name: "Scripts" }).click();

    await page.getByRole("button", { name: "Rename" }).first().click();
    await page.getByLabel("Rename").fill("Cold open");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    expect(await lastCall(page, "scripts_rename")).toEqual({
      from: "Opening monologue",
      to: "Cold open",
    });
  });

  test("Delete asks first — and only deletes after the confirmation", async ({ page }) => {
    await mockTauri(page, { scripts: LIBRARY });
    await page.goto("/");
    await page.getByRole("button", { name: "Scripts" }).click();

    await page.getByRole("button", { name: "Delete", exact: true }).first().click();
    await expect(page.getByText("Delete it?")).toBeVisible();
    // Nothing has been deleted yet — the confirmation is the whole point.
    expect((await ipcCalls(page)).some((c) => c.cmd === "scripts_delete")).toBe(false);

    await page.getByRole("button", { name: "Yes" }).click();
    expect(await lastCall(page, "scripts_delete")).toEqual({ name: "Opening monologue" });
  });

  test("declining the confirmation deletes nothing", async ({ page }) => {
    await mockTauri(page, { scripts: LIBRARY });
    await page.goto("/");
    await page.getByRole("button", { name: "Scripts" }).click();

    await page.getByRole("button", { name: "Delete", exact: true }).first().click();
    await page.getByRole("button", { name: "No" }).click();
    await expect(page.getByText("Delete it?")).toHaveCount(0);
    expect((await ipcCalls(page)).some((c) => c.cmd === "scripts_delete")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FT-11 — the caesura chip editor
// ---------------------------------------------------------------------------

test.describe("FT-11 caesura chip editor", () => {
  test("renders one chip per caesura, and only per caesura", async ({ page }) => {
    // Two real caesuras; the three-dash run and the hyphenated word are NOT.
    await mockTauri(page, { script: "hold -- here and --2 there, a--b, x --- y, well-known" });
    await page.goto("/");

    const editor = page.getByTestId("caesura-editor");
    await expect(editor).toBeVisible();
    await expect(editor.locator("[data-caesura]")).toHaveCount(2);
    // The chip shows its duration: the bare one takes the operator default.
    await expect(editor.getByText("⏸ 0.75s")).toBeVisible();
    await expect(editor.getByText("⏸ 2s")).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/chip-editor.png` });
  });

  test("a chip is atomic — the caret can never land inside it", async ({ page }) => {
    await mockTauri(page, { script: "hold -- here" });
    await page.goto("/");

    const chip = page.getByTestId("caesura-editor").locator("[data-caesura]").first();
    // `contenteditable=false` is what makes it one unit for caret, selection,
    // backspace, delete and copy — the whole FT-11 requirement in one attribute.
    await expect(chip).toHaveAttribute("contenteditable", "false");
    await expect(chip).toHaveAttribute("role", "img");
    await expect(chip).toHaveAttribute("aria-label", "pause 0.75s");
  });

  test("typing the second dash expands to a fenced caesura chip", async ({ page }) => {
    await mockTauri(page, { script: "" });
    await page.goto("/");

    const editor = page.getByTestId("caesura-editor");
    await editor.click();
    await page.keyboard.type("hold--");

    // Two keystrokes make a pause, not five: the editor inserts the fence
    // spaces itself and the result is a real chip.
    await expect(editor.locator("[data-caesura]")).toHaveCount(1);
    expect(await lastCall(page, "teleprompter_set_script")).toEqual({ text: "hold -- " });
  });

  test("every edit reaches the engine, so the projector shows it as it is typed", async ({
    page,
  }) => {
    await mockTauri(page, { script: "" });
    await page.goto("/");

    await page.getByTestId("caesura-editor").click();
    await page.keyboard.type("live");

    expect(await lastCall(page, "teleprompter_set_script")).toEqual({ text: "live" });
    // And the reading surface has it, one span per visible character.
    await expect(page.getByTestId("teleprompter-scroller").locator("[data-ch]")).toHaveCount(4);
  });
});

// ---------------------------------------------------------------------------
// FT-12 — the projector + the LAN mirror
// ---------------------------------------------------------------------------

test.describe("FT-12 projector and LAN mirror", () => {
  test("the setup dialog lists every display and screenshots", async ({ page }) => {
    await mockTauri(page, { displays: DISPLAYS });
    await page.goto("/");

    await page.getByRole("button", { name: "Projector" }).click();
    await expect(page.getByTestId("projector-setup")).toBeVisible();
    const picker = page.getByRole("combobox", { name: "Display" });
    await expect(picker.locator("option")).toHaveCount(3); // windowed + two displays
    await expect(picker.locator("option").nth(1)).toContainText("Display 1 — 2560×1440");
    await expect(picker.locator("option").nth(1)).toContainText("(primary)");

    await page.screenshot({ path: `${SHOTS}/projector-setup.png` });
  });

  test("opening on a chosen display asks for that display, filled", async ({ page }) => {
    await mockTauri(page, { displays: DISPLAYS });
    await page.goto("/");

    await page.getByRole("button", { name: "Projector" }).click();
    await page.getByRole("combobox", { name: "Display" }).selectOption("1");
    await page.getByRole("button", { name: "Open", exact: true }).click();

    expect(await lastCall(page, "projector_open")).toEqual({
      title: "Freally Teleprompt — projector",
      display: 1,
      fill: true,
    });
  });

  test("a floating window is never 'filled' — there is no display to fill", async ({ page }) => {
    await mockTauri(page, { displays: DISPLAYS });
    await page.goto("/");

    await page.getByRole("button", { name: "Projector" }).click();
    // "Fill the whole display" is meaningless without a display, so it is
    // disabled AND ignored — a checked-but-disabled box must not leak through.
    await expect(page.getByRole("checkbox", { name: "Fill the whole display" })).toBeDisabled();
    await page.getByRole("button", { name: "Open", exact: true }).click();

    expect(await lastCall(page, "projector_open")).toMatchObject({ display: null, fill: false });
  });

  test("the mirror flip writes straight through to the engine", async ({ page }) => {
    await mockTauri(page, { displays: DISPLAYS });
    await page.goto("/");

    await page.getByRole("button", { name: "Projector" }).click();
    await page.getByRole("checkbox", { name: /Mirror horizontally/ }).check();

    expect(await lastCall(page, "teleprompter_set_mirror")).toEqual({ mirror: true });
  });

  test("a running LAN mirror shows its link and a scannable QR code", async ({ page }) => {
    await mockTauri(page, {
      mirror: {
        running: true,
        url: "http://192.168.1.24:7346/?k=0123456789abcdef01234567",
        error: null,
      },
    });
    await page.goto("/");

    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("tab", { name: "Network" }).click();
    await expect(
      page.getByText("http://192.168.1.24:7346/?k=0123456789abcdef01234567"),
    ).toBeVisible();
    // The QR is drawn as a real SVG path locally — no image service is asked
    // for a picture of the URL, which carries the session key.
    const qr = page.getByRole("img", { name: "QR code for the mirror link" });
    await expect(qr).toBeVisible();
    await expect(qr.locator("path")).toHaveCount(1);

    await page.screenshot({ path: `${SHOTS}/lan-mirror.png` });
  });

  test("the projector window renders the talent surface, not the operator shell", async ({
    page,
  }) => {
    // `main.tsx` routes on the Tauri window label, so a page that believes it is
    // the projector must render the reading surface — with no editor, no
    // toolbar, and nothing that could let the talent edit the script mid-take.
    await mockTauri(page, { windowLabel: "projector", script: "the talent reads this" });
    await page.goto("/");

    await expect(page.getByTestId("projector")).toBeVisible();
    await expect(page.getByTestId("teleprompter-scroller")).toBeVisible();
    await expect(page.getByTestId("transport")).toBeVisible();
    await expect(page.getByText("Press Esc to close")).toBeVisible();
    // The operator shell must NOT be here.
    await expect(page.getByTestId("caesura-editor")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Scripts" })).toHaveCount(0);

    await page.screenshot({ path: `${SHOTS}/projector.png` });
  });

  test("the projector's transport drives the shared scroll", async ({ page }) => {
    await mockTauri(page, { windowLabel: "projector", script: "the talent reads this" });
    await page.goto("/");

    await page.getByTestId("transport").getByRole("button", { name: "Play" }).click();
    expect(await lastCall(page, "teleprompter_control")).toMatchObject({ action: "toggle" });
  });

  test("a mirror that failed to start says why", async ({ page }) => {
    await mockTauri(page, {
      mirror: { running: false, url: null, error: "could not listen on 0.0.0.0:7346" },
    });
    await page.goto("/");

    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("tab", { name: "Network" }).click();
    // A switch that is on next to a mirror that is not running would be a lie.
    await expect(page.getByRole("alert")).toContainText("could not listen on 0.0.0.0:7346");
  });
});

// ---------------------------------------------------------------------------
// FT-13 — playback
// ---------------------------------------------------------------------------

test.describe("FT-13 playback", () => {
  test("the transport is real buttons with accessible names", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    const transport = page.getByTestId("transport");
    for (const name of [
      "Back to top",
      "Rewind",
      "Slower",
      "Play",
      "Stop",
      "Faster",
      "Fast-forward",
    ]) {
      await expect(transport.getByRole("button", { name })).toBeVisible();
    }
    // SVG icons, not text glyphs (FT-13's actual ask).
    await expect(transport.locator("svg")).toHaveCount(5);

    await page.screenshot({ path: `${SHOTS}/transport.png` });
  });

  test("play toggles the shared scroll and the button becomes Pause", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    await page.getByTestId("transport").getByRole("button", { name: "Play" }).click();
    expect(await lastCall(page, "teleprompter_control")).toMatchObject({ action: "toggle" });
    await expect(
      page.getByTestId("transport").getByRole("button", { name: "Pause" }),
    ).toBeVisible();
  });

  test("stop is ONE engine action that halts and rewinds", async ({ page }) => {
    await mockTauri(page, { playing: true, script: "a script long enough to scroll" });
    await page.goto("/");

    await page.getByTestId("transport").getByRole("button", { name: "Stop" }).click();

    // One action, not a pause+top composed at the call site. The engine owns the
    // meaning of Stop, so a hotkey or the tray gets the same behaviour as the
    // button — and there is no window where the projector shows paused-but-not-
    // rewound between two broadcasts.
    const actions = (await ipcCalls(page))
      .filter((c) => c.cmd === "teleprompter_control")
      .map((c) => c.args.action);
    expect(actions).toEqual(["stop"]);
    // And it really did both: stopped, and back at the top.
    //
    // `toHaveAttribute`, not a bare `getAttribute`. The one-shot read does not
    // retry, so it raced the engine event that carries the rewind and failed
    // intermittently on the slower CI runners — this spec boots with
    // `playing: true`, so the offset is moving right up until the stop lands.
    // Retrying tolerates the timing without tolerating the wrong value: if stop
    // genuinely stopped rewinding, this still fails, just later.
    await expect(page.getByTestId("transport").getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Seek through the script" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  test("the seek bar is a real slider and is keyboard-operable", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    const slider = page.getByRole("slider", { name: "Seek through the script" });
    await expect(slider).toBeVisible();
    await slider.focus();
    await page.keyboard.press("End");

    // A slider only a mouse can move is not a slider.
    expect(await lastCall(page, "teleprompter_control")).toMatchObject({ action: "seek" });
  });

  test("clicking a word in the preview seeks to that character", async ({ page }) => {
    await mockTauri(page, { script: "click any word here" });
    await page.goto("/");

    const chars = page.getByTestId("teleprompter-scroller").locator("[data-ch]");
    await chars.nth(6).click();

    expect(await lastCall(page, "teleprompter_control")).toEqual({ action: "seek", value: 6 });
  });
});

// ---------------------------------------------------------------------------
// FT-14 — the speed model
// ---------------------------------------------------------------------------

test.describe("FT-14 speed model", () => {
  test("BPM mode swaps the slider for a BPM entry and converts on the way out", async ({
    page,
  }) => {
    await mockTauri(page);
    await page.goto("/");

    await expect(page.getByLabel("Speed (characters per second)")).toBeVisible();
    await page.getByRole("checkbox", { name: "BPM mode (for singing)" }).check();

    const bpm = page.getByLabel("Speed (BPM)");
    await expect(bpm).toBeVisible();
    await expect(page.getByLabel("Speed (characters per second)")).toHaveCount(0);

    await bpm.fill("120");
    // 120 BPM × 3.5 chars/beat ÷ 60 = 7 chars/sec. The engine only ever hears
    // chars/sec; BPM never crosses the IPC boundary.
    expect(await lastCall(page, "teleprompter_set_speed")).toEqual({ speed: 7 });
  });

  test("a BPM typed out of range is clamped, not sent raw", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    await page.getByRole("checkbox", { name: "BPM mode (for singing)" }).check();
    const bpm = page.getByLabel("Speed (BPM)");
    await bpm.fill("9000");
    await bpm.press("Enter");

    // Clamped to 250 BPM → 14.583… chars/sec, still inside the engine's range.
    const sent = (await lastCall(page, "teleprompter_set_speed")) as { speed: number };
    expect(sent.speed).toBeCloseTo((250 * 3.5) / 60, 5);
  });
});

// ---------------------------------------------------------------------------
// FT-15 — appearance
// ---------------------------------------------------------------------------

test.describe("FT-15 appearance", () => {
  test("the reading surface renders with the operator's chosen look", async ({ page }) => {
    await mockTauri(page, {
      script: "styled reading text",
      look: {
        fontFamily: "serif",
        fontWeight: 800,
        textColor: "#ffcc00",
        marginPct: 20,
        lineHeight: 2,
        guidePct: 35,
      },
    });
    await page.goto("/");

    const scroller = page.getByTestId("teleprompter-scroller");
    await expect(scroller).toBeVisible();
    // Colour is set on the surface so unread text takes it; the sweep then
    // overrides each character to the accent as it is read.
    await expect(scroller).toHaveCSS("color", "rgb(255, 204, 0)");

    const track = scroller.locator("[data-ch]").first();
    await expect(track).toHaveCSS("font-family", /Georgia/);
    await expect(track).toHaveCSS("font-weight", "800");
    // 48px font × 2.0 line height.
    await expect(track).toHaveCSS("line-height", "96px");

    // The reading guide moved with the setting — it is not pinned at 12%.
    const guideTop = await scroller
      .locator("div[aria-hidden='true']")
      .last()
      .evaluate((el) => (el as HTMLElement).style.top);
    expect(guideTop).toBe("35%");

    await page.screenshot({ path: `${SHOTS}/appearance.png` });
  });

  test("Settings offers every typeface, translated — never a raw key", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("tab", { name: "Appearance" }).click();

    const picker = page.getByRole("combobox", { name: "Typeface" });
    // Read the option labels outright: `hasText` is a substring match, and
    // "Serif" is a substring of "Sans-serif", so a filter would have counted two.
    const labels = await picker.locator("option").allTextContents();
    expect(labels).toEqual(["System", "Sans-serif", "Serif", "Monospace", "Rounded", "Slab"]);
    // The ids are built at runtime, so an untranslated one would ship as
    // `settings-font-slab` and only ever be caught here.
    await expect(picker).not.toContainText("settings-font-");
  });
});

// ---------------------------------------------------------------------------
// The app's own window chrome (the OS decorations are off)
// ---------------------------------------------------------------------------

test.describe("custom title bar", () => {
  test("carries a centred title and the three window buttons", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    const bar = page.getByTestId("titlebar");
    await expect(bar).toBeVisible();
    for (const name of ["Minimize", "Maximize", "Close"]) {
      await expect(bar.getByRole("button", { name })).toBeVisible();
    }

    // Centred on the WINDOW, not in the space left over beside the buttons —
    // a flex layout would sit it half a button-cluster to the left.
    const title = bar.getByText("Freally Teleprompt", { exact: true });
    const titleBox = await title.boundingBox();
    const viewport = page.viewportSize();
    expect(titleBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    const titleCentre = titleBox!.x + titleBox!.width / 2;
    expect(Math.abs(titleCentre - viewport!.width / 2)).toBeLessThan(2);

    await page.screenshot({ path: `${SHOTS}/titlebar.png` });
  });

  test("minimize goes through Rust, which owns the minimize-to-tray rule", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    await page.getByTestId("titlebar").getByRole("button", { name: "Minimize" }).click();
    // NOT `plugin:window|minimize` — Rust decides minimise-vs-hide-to-tray,
    // because Rust owns the setting.
    await expect
      .poll(async () => (await ipcCalls(page)).map((c) => c.cmd))
      .toContain("window_minimize");
  });

  test("the window has resize grips on every edge and corner", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    // With no OS decorations there is no resize border, so these are the only
    // thing making the window resizable at all.
    const edges = page.getByTestId("resize-edges");
    await expect(edges.locator("[data-resize]")).toHaveCount(8);
    for (const direction of ["North", "South", "East", "West", "NorthEast", "SouthWest"]) {
      await expect(edges.locator(`[data-resize="${direction}"]`)).toHaveCount(1);
    }
  });

  test("the About dialog names the app and offers its links", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    await page.getByRole("button", { name: "About" }).click();
    const about = page.getByTestId("about-dialog");
    await expect(about).toBeVisible();
    await expect(about.getByRole("button", { name: "Website" })).toBeVisible();
    await expect(about.getByRole("button", { name: "Source" })).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/about.png` });
  });
});

test.describe("Settings modal", () => {
  test("is a category sidebar with a search box and an OK/Cancel/Apply footer", async ({
    page,
  }) => {
    await mockTauri(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();

    const dialog = page.getByTestId("settings-dialog");
    await expect(dialog).toBeVisible();
    for (const name of ["General", "Editor", "Reading", "Appearance", "Projector", "Network"]) {
      await expect(dialog.getByRole("tab", { name })).toBeVisible();
    }
    for (const name of ["OK", "Cancel", "Apply"]) {
      await expect(dialog.getByRole("button", { name })).toBeVisible();
    }
    // Apply is dead until something actually changes — a settings write
    // re-broadcasts to every surface and restarts the LAN mirror.
    await expect(dialog.getByRole("button", { name: "Apply" })).toBeDisabled();

    await page.screenshot({ path: `${SHOTS}/settings-dialog.png` });
  });

  test("the search box narrows the sidebar to matching panes", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();

    await page.getByLabel("Search settings").fill("guide");
    // "Reading guide" is an Appearance control, so that pane must survive and
    // the others must not.
    await expect(page.getByRole("tab", { name: "Appearance" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Reading" })).toHaveCount(0);
  });

  test("minimize to tray is offered, and rides in the applied draft", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();

    const box = page.getByRole("checkbox", { name: "Minimize to the system tray" });
    await expect(box).toBeVisible();
    await expect(box).not.toBeChecked();
    await box.check();
    await page.getByRole("button", { name: "Apply" }).click();

    const sent = (await lastCall(page, "settings_set")) as { next: { minimizeToTray: boolean } };
    expect(sent.next.minimizeToTray).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FT-16 — read aloud
// ---------------------------------------------------------------------------

test.describe("FT-16 read aloud", () => {
  test("the checkbox carries the exact required label", async ({ page }) => {
    await mockTauri(page);
    await page.goto("/");

    // The label is specified verbatim in the roadmap, so assert it verbatim —
    // and with no leading emoji, which is what the roadmap actually says. The
    // decorative speaker glyph that used to be here rendered as a tofu box on
    // Linux, which the CI launch screenshot showed.
    const box = page.getByRole("checkbox", { name: "Read aloud with per-OS speech synthesis" });
    await expect(box).toBeVisible();
    await expect(box).toBeEnabled();
  });

  test("reading NEVER touches the shared scroll — the projector is unaffected", async ({
    page,
  }) => {
    await mockTauri(page, { script: "a short line to read aloud" });
    await page.goto("/");

    await page.getByRole("checkbox", { name: /Read aloud/ }).check();
    const before = (await ipcCalls(page)).filter((c) => c.cmd === "teleprompter_control").length;

    await page.getByTestId("transport").getByRole("button", { name: "Play" }).click();

    // This is the load-bearing FT-16 contract: in read-aloud mode the transport
    // drives the SPEECH via a preview-local offset. If a `teleprompter_control`
    // slips through here, the talent's projector starts scrolling on its own
    // while the operator is only auditioning the pace.
    const after = (await ipcCalls(page)).filter((c) => c.cmd === "teleprompter_control").length;
    expect(after).toBe(before);
  });

  test("the checkbox is disabled while a read is engaged, so it cannot be flipped mid-speech", async ({
    page,
  }) => {
    await mockTauri(page, { script: "a short line to read aloud" });
    await page.goto("/");

    const box = page.getByRole("checkbox", { name: /Read aloud/ });
    await box.check();
    await page.getByTestId("transport").getByRole("button", { name: "Play" }).click();
    await expect(box).toBeDisabled();

    // Stop is the only thing that frees it again.
    await page.getByTestId("transport").getByRole("button", { name: "Stop" }).click();
    await expect(box).toBeEnabled();
  });
});
