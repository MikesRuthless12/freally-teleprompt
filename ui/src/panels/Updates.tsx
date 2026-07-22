import { useEffect, useState } from "react";

import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

import { ModalShell } from "../components/ModalShell";
import {
  BUTTON,
  DIALOG_BODY,
  DIALOG_FOOTER,
  DIALOG_TITLE,
  PRIMARY,
  READONLY_FIELD,
} from "../components/styles";
import { useT } from "../i18n/t";

/** What the check found. `checking` renders nothing at all — see the class docs. */
type Phase =
  | { kind: "checking" }
  | { kind: "available"; update: Update }
  | { kind: "installing"; pct: number | null }
  | { kind: "none" }
  | { kind: "error" };

/**
 * Check for updates (FT-06), per `../../../HAVOC-STANDARD-bug-report-and-updater.md`.
 *
 * One check runs at launch after the EULA gate, and the toolbar entry runs
 * another on demand. The two differ only in what a boring answer does: a launch
 * check that finds nothing — offline, rate-limited, no release yet — **stays
 * silent** and closes itself, because an updater that nags on every launch is
 * worse than one nobody notices. A check the user asked for owes them an answer,
 * so `manual` surfaces "up to date" and failures too.
 *
 * The version and the notes both come from the **manifest** the plugin fetched,
 * never from the download URL: the macOS artifact is named `<App>.app.tar.gz`
 * and carries no version at all, so parsing the URL works on two platforms and
 * returns nothing on the third.
 *
 * Every download is verified against the bundled minisign public key before it
 * is applied — an unsigned or tampered package is refused by the plugin, never
 * by this UI. Nothing downloads without the explicit Yes below.
 */
export function UpdatesDialog({
  manual,
  stacked = false,
  onClose,
}: {
  manual: boolean;
  /** True when this opens above another dialog — see `ModalShell`'s `stacked`. */
  stacked?: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });

  // `onClose` must be stable (the shell wraps it in `useCallback`) or this
  // effect would re-issue the check on every parent render. Rely on `alive`
  // rather than a ref guard: under StrictMode the effect runs
  // setup→cleanup→setup, and a ref guard would swallow the second setup's check
  // while the first's result was already discarded — leaving it stuck.
  useEffect(() => {
    let alive = true;
    check()
      .then((update) => {
        if (!alive) return;
        if (update) setPhase({ kind: "available", update });
        else if (manual) setPhase({ kind: "none" });
        else onClose();
      })
      .catch(() => {
        if (!alive) return;
        if (manual) setPhase({ kind: "error" });
        else onClose();
      });
    return () => {
      alive = false;
    };
  }, [manual, onClose]);

  // On Windows this never returns: after verifying the package the plugin hands
  // the NSIS installer to the shell and calls `std::process::exit(0)`, so the
  // old binary is not locked while it is replaced, and the installer restarts
  // the app. The `relaunch()` below is therefore live only on macOS and Linux,
  // where the bundle is swapped in place and the app must restart itself. That
  // asymmetry is by design — it is not a missing "Restart now" button.
  const install = (update: Update) => {
    setPhase({ kind: "installing", pct: null });
    let downloaded = 0;
    let total = 0;
    update
      .downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          const pct = total > 0 ? Math.min(100, (downloaded / total) * 100) : null;
          setPhase({ kind: "installing", pct });
        }
      })
      .then(() => relaunch())
      .catch(() => setPhase({ kind: "error" }));
  };

  const offering = phase.kind === "available" || phase.kind === "installing";
  // The real changelog section for this version, straight from the manifest.
  // A release job that fails to extract it publishes an empty note rather than
  // a plausible-looking generic one — so an empty field means "check the job".
  const notes = phase.kind === "available" ? phase.update.body : undefined;
  return (
    <ModalShell
      // A check the USER asked for owes them an answer immediately, even while
      // it is still running — otherwise the button appears to do nothing on a
      // slow network, and clicking again is a no-op. The launch check stays
      // invisible while checking, which is what "never nag" requires.
      open={manual || phase.kind !== "checking"}
      // A download in flight has nothing to cancel to, so it is not dismissable.
      onClose={phase.kind === "installing" ? undefined : onClose}
      labelledBy="updates-heading"
      stacked={stacked}
    >
      <div data-testid="updates-dialog" className={`w-[32rem] ${DIALOG_BODY}`}>
        <h2 id="updates-heading" className={DIALOG_TITLE}>
          {offering ? t("updates-title") : t("toolbar-updates")}
        </h2>

        {phase.kind === "available" && (
          <>
            <p className="m-0 text-xs leading-relaxed">
              {t("updates-available", {
                version: phase.update.version,
                current: phase.update.currentVersion,
              })}
            </p>
            {notes ? (
              <label className="flex flex-col gap-1">
                <span className="text-havoc-muted text-[11px]">{t("updates-notes-label")}</span>
                <textarea readOnly className={READONLY_FIELD} rows={10} value={notes} />
              </label>
            ) : null}
            <div className={DIALOG_FOOTER}>
              <button type="button" className={BUTTON} onClick={onClose}>
                {t("updates-no")}
              </button>
              <button type="button" className={PRIMARY} onClick={() => install(phase.update)}>
                {t("updates-yes")}
              </button>
            </div>
          </>
        )}

        {phase.kind === "checking" && <p className="m-0 text-xs">{t("updates-checking")}</p>}

        {phase.kind === "installing" && (
          <div className="flex flex-col gap-2">
            <p className="m-0 text-xs">{t("updates-installing")}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="from-havoc-accent to-havoc-accent-2 h-full rounded-full bg-gradient-to-r transition-[width]"
                style={{ width: phase.pct !== null ? `${phase.pct.toFixed(2)}%` : "8%" }}
              />
            </div>
          </div>
        )}

        {(phase.kind === "none" || phase.kind === "error") && (
          <>
            <p
              role={phase.kind === "error" ? "alert" : undefined}
              className={`m-0 text-xs ${phase.kind === "error" ? "text-red-300" : ""}`}
            >
              {phase.kind === "error" ? t("updates-error") : t("updates-none")}
            </p>
            <div className={DIALOG_FOOTER}>
              <button type="button" className={BUTTON} onClick={onClose}>
                {t("bug-close")}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
