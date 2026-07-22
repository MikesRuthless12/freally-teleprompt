import { useEffect, useState } from "react";

import { listDisplays, projectorOpen, teleprompterSetMirror } from "../api/commands";
import type { DisplayInfo } from "../api/types";
import { ModalShell } from "../components/ModalShell";
import {
  BUTTON,
  DIALOG_BODY,
  DIALOG_FOOTER,
  DIALOG_TITLE,
  ERROR_LINE,
  FIELD,
  PRIMARY,
} from "../components/styles";
import { useT } from "../i18n/t";

/** The picker's "not a specific monitor" option — a floating window here. */
const WINDOWED = "windowed";

/**
 * Open the projector on a chosen display (FT-12).
 *
 * Also carries the **mirror flip**, because that is the moment the operator is
 * thinking about the beam-splitter rig — burying it in Settings meant opening
 * the projector, seeing reversed text, and going hunting. It writes straight
 * through to the engine (not a draft) so the projector already has it.
 */
export function ProjectorSetup({
  open,
  mirror,
  onClose,
}: {
  open: boolean;
  /** The live mirror flag from the shared engine state. */
  mirror: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [display, setDisplay] = useState<string>(WINDOWED);
  const [fill, setFill] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear a stale error on the OPEN transition, derived during render — the
  // pattern `SettingsDialog` and `ScriptLibrary` use, so a setState never runs
  // synchronously inside an effect body.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setError(null);
  }

  // Re-enumerate on every opening: monitors get plugged in and unplugged, and
  // an operator opening this dialog has usually just changed the rig.
  useEffect(() => {
    if (!open) return;
    listDisplays()
      .then(setDisplays)
      .catch((err) => setError(String(err)));
  }, [open]);

  const openProjector = () => {
    setError(null);
    const index = display === WINDOWED ? null : Number(display);
    // A floating window is never "filled": filling means covering a specific
    // monitor, and there is no monitor chosen to cover.
    projectorOpen(t("projector-window-title"), index, index !== null && fill)
      .then(onClose)
      .catch((err) => setError(String(err)));
  };

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="projector-title">
      <div data-testid="projector-setup" className={`w-[26rem] ${DIALOG_BODY}`}>
        <h2 id="projector-title" className={DIALOG_TITLE}>
          {t("projector-title")}
        </h2>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">{t("projector-display")}</span>
          <select className={FIELD} value={display} onChange={(e) => setDisplay(e.target.value)}>
            <option value={WINDOWED}>{t("projector-windowed")}</option>
            {displays.map((info) => (
              <option key={info.index} value={String(info.index)}>
                {t("projector-display-option", {
                  n: info.index + 1,
                  // Passed as STRINGS: Fluent number-formats numeric arguments
                  // for the locale, which turned a 2560×1440 panel into
                  // "2,560×1,440". A resolution is a technical identifier, not a
                  // quantity — nobody writes it with thousands separators.
                  w: String(info.width),
                  h: String(info.height),
                })}
                {info.primary ? ` ${t("projector-primary")}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fill}
            disabled={display === WINDOWED}
            onChange={(e) => setFill(e.target.checked)}
          />
          <span className={`text-[11px] ${display === WINDOWED ? "opacity-40" : ""}`}>
            {t("projector-fill")}
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={mirror}
            onChange={(e) => void teleprompterSetMirror(e.target.checked).catch(() => undefined)}
          />
          <span className="text-[11px]">{t("projector-mirror")}</span>
        </label>
        <p className="text-havoc-muted m-0 text-[10px] leading-snug">
          {t("projector-mirror-hint")}
        </p>

        {error && (
          <p role="alert" className={ERROR_LINE}>
            {error}
          </p>
        )}

        <div className={DIALOG_FOOTER}>
          <button type="button" className={BUTTON} onClick={onClose}>
            {t("projector-cancel")}
          </button>
          <button type="button" className={PRIMARY} onClick={openProjector}>
            {t("projector-open")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
