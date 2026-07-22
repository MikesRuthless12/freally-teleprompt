import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Settings } from "../../api/types";
import { SettingsDialog } from "../Settings";

// The dialog is the client half of the draft/apply pattern; the backend call is
// the only thing it does to the outside world, so that is what we stub. The
// signature is given explicitly so `mock.calls[0][0]` stays typed as the draft —
// these tests assert on exactly what would have been sent.
const settingsSet = vi.fn<(next: Settings) => Promise<void>>();
vi.mock("../../api/commands", () => ({
  settingsSet: (next: Settings) => settingsSet(next),
}));

const BASE: Settings = {
  language: "en",
  theme: "dark",
  speed: 12,
  fontSize: 48,
  caesuraSecs: 0.75,
  countdownSecs: 0,
  mirror: false,
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
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(settingsSet.mock.calls[0][0].acceptedEulaVersion).toBe("2026-07-21");
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
