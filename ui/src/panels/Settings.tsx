import { useState } from "react";

import { settingsSet } from "../api/commands";
import type { Settings } from "../api/types";
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
import { AUTO_LOCALE, LOCALES } from "../i18n/locales";
import { useT } from "../i18n/t";

/**
 * The Settings dialog (FT-03) — the draft/apply pattern's client half.
 *
 * Editing writes to a LOCAL draft, never to the live settings. Nothing reaches
 * the backend until **Apply**; **Cancel** throws the draft away, so the user
 * gets back exactly what they had. That is the whole contract, and it is why
 * this component holds `draft` in state rather than calling `settingsSet` on
 * every keystroke.
 *
 * `acceptedEulaVersion` rides along in the draft untouched — the backend
 * ignores it on `set`, so a dialog opened before acceptance cannot wipe it.
 */
export function SettingsDialog({
  open,
  settings,
  onClose,
  onApplied,
}: {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onApplied: (applied: Settings) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<Settings>(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the draft on every OPEN transition, so a cancelled edit never leaks
  // into the next opening. Keying off the `settings` prop instead would miss the
  // case that matters most: edit, Cancel, reopen — `settings` is unchanged
  // (nothing was applied), so the abandoned draft would still be sitting there,
  // and "Cancel restores exactly what you had" would be a lie.
  // `busy` and `error` are reset alongside the draft, not left behind. The
  // dialog is never unmounted, so a failed Apply used to render its stale error
  // under a freshly-reopened dialog — and Cancelling mid-Apply left `busy`
  // stuck true, disabling Apply on the next opening while the in-flight write
  // closed the dialog out from under the user when it finally resolved.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(settings);
      setBusy(false);
      setError(null);
    }
  }

  const patch = (fields: Partial<Settings>) => setDraft((d) => ({ ...d, ...fields }));

  const apply = () => {
    setBusy(true);
    setError(null);
    settingsSet(draft)
      .then(() => {
        setBusy(false);
        onApplied(draft);
        onClose();
      })
      .catch((err) => {
        setBusy(false);
        setError(String(err));
      });
  };

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="settings-title">
      <div data-testid="settings-dialog" className={`w-[28rem] ${DIALOG_BODY}`}>
        <h2 id="settings-title" className={DIALOG_TITLE}>
          {t("settings-title")}
        </h2>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">{t("settings-language")}</span>
          <select
            className={FIELD}
            value={draft.language}
            onChange={(e) => patch({ language: e.target.value })}
          >
            <option value={AUTO_LOCALE}>{t("settings-language-auto")}</option>
            {LOCALES.map((locale) => (
              <option key={locale.code} value={locale.code}>
                {locale.native}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">{t("settings-theme")}</span>
          <select
            className={FIELD}
            value={draft.theme}
            onChange={(e) => patch({ theme: e.target.value as Settings["theme"] })}
          >
            <option value="dark">{t("settings-theme-dark")}</option>
            <option value="light">{t("settings-theme-light")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">
            {t("settings-speed", { value: Math.round(draft.speed) })}
          </span>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={draft.speed}
            onChange={(e) => patch({ speed: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">
            {t("settings-font-size", { value: Math.round(draft.fontSize) })}
          </span>
          <input
            type="range"
            min={12}
            max={240}
            step={1}
            value={draft.fontSize}
            onChange={(e) => patch({ fontSize: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">
            {t("settings-caesura", { value: draft.caesuraSecs.toFixed(2) })}
          </span>
          <input
            type="range"
            min={0.75}
            max={2}
            step={0.05}
            value={draft.caesuraSecs}
            onChange={(e) => patch({ caesuraSecs: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">
            {t("settings-countdown", { value: Math.round(draft.countdownSecs) })}
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={draft.countdownSecs}
            onChange={(e) => patch({ countdownSecs: Number(e.target.value) })}
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.mirror}
            onChange={(e) => patch({ mirror: e.target.checked })}
          />
          <span className="text-[11px]">{t("settings-mirror")}</span>
        </label>

        {error && (
          <p role="alert" className={ERROR_LINE}>
            {error}
          </p>
        )}

        <div className={DIALOG_FOOTER}>
          <button type="button" className={BUTTON} onClick={onClose}>
            {t("settings-cancel")}
          </button>
          <button type="button" className={PRIMARY} onClick={apply} disabled={busy}>
            {t("settings-apply")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
