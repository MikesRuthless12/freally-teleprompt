import { useEffect, useState } from "react";

import { bugReportBuild, bugReportClearCrash, openUrl } from "../api/commands";
import type { BugReportTarget } from "../api/types";
import { ModalShell } from "../components/ModalShell";
import {
  BUTTON,
  DIALOG_BODY,
  DIALOG_FOOTER,
  DIALOG_TITLE,
  ERROR_LINE,
  PRIMARY,
  READONLY_FIELD,
  TEXTAREA,
} from "../components/styles";
import { useT } from "../i18n/t";

/** The read-only report: same box, monospaced and quieter — it is not editable. */

/** How long the preview waits for the typing to settle before rebuilding. */
const PREVIEW_DEBOUNCE_MS = 150;

/**
 * "Report a problem" (FT-06) — opt-in and anonymous. Implements the suite-wide
 * standard in `../../../HAVOC-STANDARD-bug-report-and-updater.md`.
 *
 * Nothing is ever sent from here. Each button opens a **pre-filled** window —
 * a GitHub issue, a Gmail draft, or the OS mail client — and the user presses
 * send themselves. The read-only preview is the exact text those windows will
 * carry, home path and username already redacted.
 *
 * The preview is composed by **Rust** ([`bugReportBuild`]) rather than
 * re-assembled here: the field is labelled "exactly what will be sent", and a
 * second implementation in TypeScript is a second thing to keep in step.
 */
export function BugReportDialog({
  open,
  pendingCrash,
  onCrashDismissed,
  onClose,
}: {
  open: boolean;
  /** The scrubbed crash text from the previous run, or null after a clean one. */
  pendingCrash: string | null;
  /** Called once the pending crash has been deleted, so the shell can forget it. */
  onCrashDismissed: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One IPC per edit, debounced so a fast typist does not queue one per
  // keystroke; `alive` drops any answer that lands after the input moved on.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      bugReportBuild("email", description)
        .then((report) => {
          if (alive) setPreview(report.text);
        })
        .catch((err) => {
          if (alive) setError(String(err));
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [open, description, pendingCrash]);

  const submit = (target: BugReportTarget) => {
    setError(null);
    bugReportBuild(target, description)
      .then((report) => openUrl(report.url))
      .catch((err) => setError(String(err)));
  };

  const copy = () => {
    navigator.clipboard
      .writeText(preview)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch((err) => setError(String(err)));
  };

  const dismissCrash = () => {
    setError(null);
    bugReportClearCrash()
      .then(onCrashDismissed)
      .catch((err) => setError(String(err)));
  };

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="bug-report-title">
      <div data-testid="bug-report-dialog" className={`w-[36rem] ${DIALOG_BODY}`}>
        <h2 id="bug-report-title" className={DIALOG_TITLE}>
          {t("bug-title")}
        </h2>

        <p className="text-havoc-muted m-0 text-[11px] leading-relaxed">{t("bug-intro")}</p>

        {pendingCrash && (
          <p className="m-0 rounded-md border border-white/15 bg-white/5 px-2.5 py-2 text-[11px]">
            {t("bug-crash-attached")}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">{t("bug-what-happened")}</span>
          <textarea
            className={TEXTAREA}
            rows={3}
            value={description}
            placeholder={t("bug-what-happened-placeholder")}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">{t("bug-preview-label")}</span>
          <textarea readOnly className={READONLY_FIELD} rows={10} value={preview} />
        </label>

        {error && (
          <p role="alert" className={ERROR_LINE}>
            {error}
          </p>
        )}

        {/* Dismissive actions first, the three pre-filled targets last, with
            the primary one furthest right — the same shape as Settings. */}
        <div className={`flex-wrap ${DIALOG_FOOTER}`}>
          <button type="button" className={BUTTON} onClick={onClose}>
            {t("bug-close")}
          </button>
          {pendingCrash && (
            <button type="button" className={BUTTON} onClick={dismissCrash}>
              {t("bug-dismiss-crash")}
            </button>
          )}
          <button type="button" className={BUTTON} onClick={copy}>
            {copied ? t("bug-copied") : t("bug-copy")}
          </button>
          <button type="button" className={BUTTON} onClick={() => submit("email")}>
            {t("bug-send-email")}
          </button>
          <button type="button" className={BUTTON} onClick={() => submit("gmail")}>
            {t("bug-compose-gmail")}
          </button>
          <button type="button" className={PRIMARY} onClick={() => submit("github")}>
            {t("bug-open-github")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
