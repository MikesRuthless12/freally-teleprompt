import { useEffect, useState } from "react";

import { lanMirrorOpen, lanMirrorStatus, settingsSet } from "../api/commands";
import type { Look, MirrorStatus, Settings } from "../api/types";
import { ModalShell } from "../components/ModalShell";
import { QrSvg } from "../components/QrSvg";
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
import { FONT_FAMILY_IDS } from "../lib/fonts";

/** The weights the picker offers, matching Rust's 300–900 clamp. */
const WEIGHTS = [300, 400, 500, 600, 700, 800, 900];

/** A settings section heading — the dialog grew past the point where a flat
 * list of fifteen controls could be scanned. */
function Section({ children }: { children: string }) {
  return (
    <h3 className="text-havoc-muted m-0 border-t border-white/10 pt-3 text-[11px] font-semibold tracking-wide uppercase">
      {children}
    </h3>
  );
}

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
  const patchLook = (fields: Partial<Look>) =>
    setDraft((d) => ({ ...d, look: { ...d.look, ...fields } }));

  // The LAN mirror's live state — what the server is ACTUALLY doing, not what
  // the draft asks for. Read on open and again after Apply, because Apply is
  // what starts or stops it (and is where a port clash surfaces).
  const [mirror, setMirror] = useState<MirrorStatus | null>(null);
  const refreshMirror = () => {
    lanMirrorStatus()
      .then(setMirror)
      .catch(() => setMirror(null));
  };
  useEffect(() => {
    if (open) refreshMirror();
  }, [open]);

  const apply = () => {
    setBusy(true);
    setError(null);
    settingsSet(draft)
      .then(() => {
        setBusy(false);
        onApplied(draft);
        // Applying is what starts or stops the mirror. If the user just turned
        // it ON, keep the dialog open so they can see the link and the QR — and
        // so a failed bind is visible instead of silently swallowed.
        if (draft.lanEnabled) {
          refreshMirror();
          return;
        }
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

        <Section>{t("settings-section-reading")}</Section>

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

        <Section>{t("settings-section-appearance")}</Section>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">{t("settings-font-family")}</span>
          <select
            className={FIELD}
            value={draft.look.fontFamily}
            onChange={(e) => patchLook({ fontFamily: e.target.value as Look["fontFamily"] })}
          >
            {FONT_FAMILY_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`settings-font-${id}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">{t("settings-font-weight")}</span>
          <select
            className={FIELD}
            value={draft.look.fontWeight}
            onChange={(e) => patchLook({ fontWeight: Number(e.target.value) })}
          >
            {WEIGHTS.map((weight) => (
              <option key={weight} value={weight}>
                {weight}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-2">
          <span className="text-havoc-muted text-[11px]">{t("settings-text-color")}</span>
          <input
            type="color"
            className="h-7 w-16 rounded border border-white/10 bg-transparent"
            value={draft.look.textColor}
            onChange={(e) => patchLook({ textColor: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">
            {t("settings-line-height", { value: draft.look.lineHeight.toFixed(2) })}
          </span>
          <input
            type="range"
            min={1}
            max={2.5}
            step={0.05}
            value={draft.look.lineHeight}
            onChange={(e) => patchLook({ lineHeight: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">
            {t("settings-margins", { value: Math.round(draft.look.marginPct) })}
          </span>
          <input
            type="range"
            min={0}
            max={25}
            step={1}
            value={draft.look.marginPct}
            onChange={(e) => patchLook({ marginPct: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-havoc-muted text-[11px]">
            {t("settings-guide", { value: Math.round(draft.look.guidePct) })}
          </span>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={draft.look.guidePct}
            onChange={(e) => patchLook({ guidePct: Number(e.target.value) })}
          />
        </label>

        <Section>{t("settings-section-projector")}</Section>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.mirror}
            onChange={(e) => patch({ mirror: e.target.checked })}
          />
          <span className="text-[11px]">{t("settings-mirror")}</span>
        </label>

        <Section>{t("settings-section-mirror")}</Section>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.lanEnabled}
            onChange={(e) => patch({ lanEnabled: e.target.checked })}
          />
          <span className="text-[11px]">{t("settings-lan-enabled")}</span>
        </label>

        {draft.lanEnabled && (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.lanAllInterfaces}
                onChange={(e) => patch({ lanAllInterfaces: e.target.checked })}
              />
              <span className="text-[11px]">{t("settings-lan-all-interfaces")}</span>
            </label>
            {/* Said plainly rather than implied: the key rides in the URL over
                plain HTTP, which is a trusted-network assumption, not a
                security guarantee. */}
            <p className="text-havoc-muted m-0 text-[10px] leading-snug">
              {t("settings-lan-warning")}
            </p>
            <label className="flex items-center justify-between gap-2">
              <span className="text-havoc-muted text-[11px]">{t("settings-lan-port")}</span>
              <input
                type="number"
                min={1024}
                max={65535}
                step={1}
                className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-center font-mono text-xs"
                value={draft.lanPort}
                onChange={(e) => patch({ lanPort: Number(e.target.value) })}
              />
            </label>
          </>
        )}

        {mirror?.error && (
          <p role="alert" className={ERROR_LINE}>
            {t("settings-lan-failed", { error: mirror.error })}
          </p>
        )}
        {mirror?.running && mirror.url && (
          <div className="flex items-start gap-3">
            <QrSvg link={mirror.url} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-havoc-muted text-[10px]">{t("settings-lan-open-hint")}</span>
              <code className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] break-all">
                {mirror.url}
              </code>
              <button
                type="button"
                className={BUTTON}
                onClick={() => void lanMirrorOpen().catch((err) => setError(String(err)))}
              >
                {t("settings-lan-open")}
              </button>
            </div>
          </div>
        )}

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
