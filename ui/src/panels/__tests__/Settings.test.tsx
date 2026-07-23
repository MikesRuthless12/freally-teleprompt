import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Settings } from "../../api/types";
import { SettingsDialog } from "../Settings";

// The dialog is the client half of the draft/apply pattern; the backend calls
// are the only thing it does to the outside world, so that is what we stub. The
// `settingsSet` signature is given explicitly so `mock.calls[0][0]` stays typed
// as the draft — these tests assert on exactly what would have been sent.
// `lanMirrorStatus` is stubbed because the dialog reads the mirror's LIVE state
// on every open (FT-12); it must not be a draft field.
const settingsSet = vi.fn<(next: Settings) => Promise<void>>();
vi.mock("../../api/commands", () => ({
  settingsSet: (next: Settings) => settingsSet(next),
  lanMirrorStatus: () => Promise.resolve({ running: false, url: null, error: null }),
  lanMirrorOpen: () => Promise.resolve(),
  // Applying reconciles the tray, whose menu labels are localised here.
  traySync: () => Promise.resolve(),
  // The Voice pane reads the trained model on open (FT-31); no command is trained.
  voiceSummary: () => Promise.resolve({ commands: [], listening: false }),
  voiceEnrollCapture: (id: string) =>
    Promise.resolve({ commands: [{ id, takes: 1 }], listening: false }),
  voiceForgetCommand: () => Promise.resolve({ commands: [], listening: false }),
}));

const BASE: Settings = {
  language: "en",
  theme: "dark",
  speed: 12,
  fontSize: 48,
  caesuraSecs: 0.75,
  countdownSecs: 0,
  mirror: false,
  look: {
    fontFamily: "system",
    fontWeight: 500,
    textColor: "#ffffff",
    marginPct: 8,
    lineHeight: 1.5,
    guidePct: 12,
  },
  minimizeToTray: false,
  lanEnabled: false,
  lanAllInterfaces: false,
  lanPort: 7346,
  autocomplete: true,
  autocompleteLanguage: "auto",
  voiceEnabled: false,
  voiceMode: "push_to_talk",
  recentScripts: [],
  acceptedEulaVersion: "2026-07-21",
};

/** The theme `<select>`, found the way a screen-reader user would. */
const themeSelect = () => screen.getByRole("combobox", { name: "Theme" });

function renderDialog(open: boolean, onClose = vi.fn(), onApplied = vi.fn()) {
  return render(
    <SettingsDialog open={open} settings={BASE} onClose={onClose} onApplied={onApplied} />,
  );
}

describe("SettingsDialog — the draft/apply contract", () => {
  beforeEach(() => {
    settingsSet.mockReset();
    settingsSet.mockResolvedValue(undefined);
  });

  it("does not touch the backend while the user is editing", () => {
    renderDialog(true);
    fireEvent.change(themeSelect(), { target: { value: "light" } });
    expect(themeSelect()).toHaveValue("light");
    expect(settingsSet).not.toHaveBeenCalled();
  });

  it("sends the whole draft on Apply", () => {
    renderDialog(true);
    fireEvent.change(themeSelect(), { target: { value: "light" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(settingsSet).toHaveBeenCalledTimes(1);
    expect(settingsSet.mock.calls[0][0]).toMatchObject({ ...BASE, theme: "light" });
  });

  it("keeps EULA acceptance in the payload — the backend ignores it, but we never blank it", () => {
    renderDialog(true);
    // An edit first: Apply on an unchanged draft deliberately writes nothing
    // (see the next test), so without one there would be no payload to inspect.
    fireEvent.change(themeSelect(), { target: { value: "light" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(settingsSet.mock.calls[0][0].acceptedEulaVersion).toBe("2026-07-21");
  });

  /**
   * Apply is disabled — and refuses — when nothing has changed. A settings write
   * is not free: it re-validates, re-broadcasts to every surface, and restarts
   * the LAN mirror. Doing all that because someone pressed a button twice would
   * be a visible hitch for no reason.
   */
  it("writes nothing when the draft is unchanged", () => {
    renderDialog(true);
    const applyButton = screen.getByRole("button", { name: "Apply" });
    expect(applyButton).toBeDisabled();
    fireEvent.click(applyButton);
    expect(settingsSet).not.toHaveBeenCalled();
  });

  /**
   * The regression this component was rewritten for: edit → Cancel → reopen must
   * show the ORIGINAL values. `settings` is unchanged across that sequence
   * (nothing was applied), so re-seeding on the prop alone would leave the
   * abandoned draft on screen and make "Cancel" a lie.
   */
  it("discards an abandoned draft when reopened after Cancel", () => {
    const onClose = vi.fn();
    const { rerender } = renderDialog(true, onClose);

    fireEvent.change(themeSelect(), { target: { value: "light" } });
    expect(themeSelect()).toHaveValue("light");

    // Cancel: the parent closes the dialog without applying anything.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    rerender(<SettingsDialog open={false} settings={BASE} onClose={onClose} onApplied={vi.fn()} />);

    // Reopen with the SAME settings object.
    rerender(<SettingsDialog open={true} settings={BASE} onClose={onClose} onApplied={vi.fn()} />);
    expect(themeSelect()).toHaveValue("dark");
    expect(settingsSet).not.toHaveBeenCalled();
  });

  it("renders nothing at all when closed", () => {
    renderDialog(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
