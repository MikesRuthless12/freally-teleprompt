import { useEffect, useMemo, useRef, useState } from "react";

import { lanMirrorOpen, lanMirrorStatus, settingsSet } from "../api/commands";
import type { Look, MirrorStatus, Settings } from "../api/types";
import { ModalShell } from "../components/ModalShell";
import { QrSvg } from "../components/QrSvg";
import { BUTTON, DIALOG_TITLE, ERROR_LINE, FIELD, PRIMARY } from "../components/styles";
import { AUTO_LOCALE, LOCALES } from "../i18n/locales";
import { useT } from "../i18n/t";
import { FONT_FAMILY_IDS } from "../lib/fonts";

/** The sidebar, top to bottom. Every entry is a pane of REAL settings. */
const CATEGORIES = ["general", "reading", "appearance", "projector", "network"] as const;
type CategoryId = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<CategoryId, string> = {
  general: "settings-cat-general",
  reading: "settings-cat-reading",
  appearance: "settings-cat-appearance",
  projector: "settings-cat-projector",
  network: "settings-cat-network",
};

/** Which `Settings` fields back each category, for the "changed" dot (draft vs
 * applied) and for deciding whether a search term should reveal a pane. */
const CATEGORY_FIELDS: Record<CategoryId, Array<keyof Settings>> = {
  general: ["language", "theme", "minimizeToTray"],
  reading: ["speed", "fontSize", "caesuraSecs", "countdownSecs"],
  appearance: ["look"],
  projector: ["mirror"],
  network: ["lanEnabled", "lanAllInterfaces", "lanPort"],
};

/** The i18n keys each category's controls are labelled with — what the search
 * box matches against, so typing "guide" finds Appearance. */
const CATEGORY_KEYS: Record<CategoryId, string[]> = {
  general: ["settings-language", "settings-theme", "settings-minimize-to-tray"],
  reading: ["settings-speed", "settings-font-size", "settings-caesura", "settings-countdown"],
  appearance: [
    "settings-font-family",
    "settings-font-weight",
    "settings-text-color",
    "settings-line-height",
    "settings-margins",
    "settings-guide",
  ],
  projector: ["settings-mirror"],
  network: ["settings-lan-enabled", "settings-lan-all-interfaces", "settings-lan-port"],
};

/** The weights the picker offers, matching Rust's 300–900 clamp. */
const WEIGHTS = [300, 400, 500, 600, 700, 800, 900];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-havoc-muted m-0 text-[10px] tracking-wide uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** A labelled slider with its live value in the label — the shape every reading
 * and appearance control uses. */
function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-havoc-muted text-[11px]">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

/**
 * The Settings modal, in the same shape as Freally Capture's: a category
 * sidebar with a search box, a scrollable pane per category, and an
 * **OK / Cancel / Apply** footer.
 *
 * Everything edits ONE draft. Nothing persists until Apply or OK — Cancel
 * throws the draft away, so the user gets back exactly what they had. That is
 * the whole contract, and it is why `draft` lives in state rather than each
 * control calling `settingsSet` as it changes.
 *
 * Unlike Capture, the draft is seeded from the `settings` PROP rather than a
 * fresh `settingsGet()`. Capture needs the re-read because several dialogs can
 * write settings; here this modal is the only writer, so a re-read would buy
 * nothing and cost an async seed that every test would have to await.
 *
 * `acceptedEulaVersion` and `recentScripts` ride along in the draft untouched —
 * the backend preserves both on `set`, so this dialog cannot wipe them.
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
  const [active, setActive] = useState<CategoryId>("general");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Settings>(settings);
  /** The last state known to be on disk — Apply's baseline, and what the
   * "changed" dots compare against. */
  const [applied, setApplied] = useState<Settings>(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabRefs = useRef<Partial<Record<CategoryId, HTMLButtonElement | null>>>({});

  // Re-seed on every OPEN transition, so a cancelled edit never leaks into the
  // next opening. Keying off the `settings` prop instead would miss the case
  // that matters most: edit, Cancel, reopen — `settings` is unchanged (nothing
  // was applied), so the abandoned draft would still be sitting there and
  // "Cancel restores exactly what you had" would be a lie.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(settings);
      setApplied(settings);
      setBusy(false);
      setError(null);
      setSearch("");
    }
  }

  const patch = (fields: Partial<Settings>) => setDraft((d) => ({ ...d, ...fields }));
  const patchLook = (fields: Partial<Look>) =>
    setDraft((d) => ({ ...d, look: { ...d.look, ...fields } }));

  // The LAN mirror's LIVE state — what the server is actually doing, not what
  // the draft asks for. Read on open and again after Apply, which is what
  // starts or stops it (and where a port clash surfaces).
  const [mirror, setMirror] = useState<MirrorStatus | null>(null);
  const refreshMirror = () => {
    lanMirrorStatus()
      .then(setMirror)
      .catch(() => setMirror(null));
  };
  useEffect(() => {
    if (open) refreshMirror();
  }, [open]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(applied), [draft, applied]);

  const changedByCategory = useMemo(() => {
    const out = {} as Record<CategoryId, boolean>;
    for (const category of CATEGORIES) {
      out[category] = CATEGORY_FIELDS[category].some(
        (field) => JSON.stringify(draft[field]) !== JSON.stringify(applied[field]),
      );
    }
    return out;
  }, [draft, applied]);

  const visibleCategories = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [...CATEGORIES];
    return CATEGORIES.filter(
      (category) =>
        t(CATEGORY_LABELS[category]).toLowerCase().includes(needle) ||
        CATEGORY_KEYS[category].some((key) => t(key).toLowerCase().includes(needle)),
    );
  }, [search, t]);

  // Which pane is actually on screen. When a search hides the selected category
  // its tab disappears but `active` does not change, so the pane went on showing
  // a category with no visible tab — a search for "guide" listed only Appearance
  // while still displaying General. Derived rather than stored, so it cannot get
  // out of step with the filter.
  const shown = visibleCategories.includes(active) ? active : (visibleCategories[0] ?? active);

  /** Save the whole draft. Resolves to whether it stuck — OK closes only then. */
  const apply = async (): Promise<boolean> => {
    if (!dirty) return true;
    setBusy(true);
    setError(null);
    try {
      // Adopt what Rust STORED, not the draft: it clamps every numeric field,
      // so a port of 80 comes back as 7346. Showing the draft instead left the
      // dialog displaying a number the app was not using.
      const stored = await settingsSet(draft);
      setDraft(stored);
      setApplied(stored);
      // The shell owns the tray: `onApplied` updates its `settings`, and its
      // effect re-syncs the tray from there. Doing it here as well would be two
      // callers for one job, which is how they drift.
      onApplied(stored);
      refreshMirror();
      setBusy(false);
      return true;
    } catch (err) {
      setBusy(false);
      setError(String(err));
      return false;
    }
  };

  const confirm = () => {
    void apply().then((stuck) => {
      if (stuck) onClose();
    });
  };

  /** Arrow keys move between tabs, the way a tablist is supposed to behave. */
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    const order = visibleCategories;
    const at = order.indexOf(active);
    if (at < 0) return;
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? order[(at + 1) % order.length]
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? order[(at - 1 + order.length) % order.length]
          : null;
    if (!next) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="settings-title">
      <div
        data-testid="settings-dialog"
        className="flex h-[34rem] max-h-full w-[46rem] max-w-full flex-col"
      >
        <h2 id="settings-title" className={`${DIALOG_TITLE} px-4 py-3`}>
          {t("settings-title")}
        </h2>

        <div className="flex min-h-0 flex-1 border-t border-white/10">
          <nav
            role="tablist"
            aria-orientation="vertical"
            aria-label={t("settings-title")}
            className="flex w-48 shrink-0 flex-col gap-1 overflow-y-auto border-r border-white/10 p-2"
          >
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("settings-search-placeholder")}
              aria-label={t("settings-search-placeholder")}
              className={`${FIELD} mb-1 w-full`}
            />
            {visibleCategories.length === 0 ? (
              <p className="text-havoc-muted m-0 px-2 py-1 text-[11px]">
                {t("settings-search-none")}
              </p>
            ) : (
              visibleCategories.map((category) => (
                <button
                  key={category}
                  ref={(el) => {
                    tabRefs.current[category] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`settings-tab-${category}`}
                  aria-selected={active === category}
                  aria-controls="settings-active-pane"
                  tabIndex={active === category ? 0 : -1}
                  onClick={() => setActive(category)}
                  onKeyDown={onTabKeyDown}
                  className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                    active === category
                      ? "border-havoc-accent/60 bg-havoc-accent/15 text-havoc-text"
                      : "text-havoc-muted hover:text-havoc-text border-transparent hover:bg-white/5"
                  }`}
                >
                  {t(CATEGORY_LABELS[category])}
                  {changedByCategory[category] && (
                    <span
                      title={t("settings-changed")}
                      aria-label={t("settings-changed")}
                      className="bg-havoc-accent h-1.5 w-1.5 shrink-0 rounded-full"
                    />
                  )}
                </button>
              ))
            )}
          </nav>

          <div
            role="tabpanel"
            id="settings-active-pane"
            aria-labelledby={`settings-tab-${shown}`}
            tabIndex={0}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
          >
            {shown === "general" && (
              <>
                <Section title={t("settings-cat-general")}>
                  <label className="flex items-center justify-between gap-3">
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

                  <label className="flex items-center justify-between gap-3">
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
                </Section>

                <Section title={t("settings-window-section")}>
                  <label className="flex items-center gap-2 text-[11px]">
                    <input
                      type="checkbox"
                      checked={draft.minimizeToTray}
                      onChange={(e) => patch({ minimizeToTray: e.target.checked })}
                    />
                    {t("settings-minimize-to-tray")}
                  </label>
                  <p className="text-havoc-muted m-0 text-[10px] leading-snug">
                    {t("settings-minimize-to-tray-note")}
                  </p>
                </Section>
              </>
            )}

            {shown === "reading" && (
              <Section title={t("settings-cat-reading")}>
                <Slider
                  label={t("settings-speed", { value: Math.round(draft.speed) })}
                  min={1}
                  max={60}
                  step={1}
                  value={draft.speed}
                  onChange={(speed) => patch({ speed })}
                />
                <Slider
                  label={t("settings-font-size", { value: Math.round(draft.fontSize) })}
                  min={12}
                  max={240}
                  step={1}
                  value={draft.fontSize}
                  onChange={(fontSize) => patch({ fontSize })}
                />
                <Slider
                  label={t("settings-caesura", { value: draft.caesuraSecs.toFixed(2) })}
                  min={0.75}
                  max={2}
                  step={0.05}
                  value={draft.caesuraSecs}
                  onChange={(caesuraSecs) => patch({ caesuraSecs })}
                />
                <Slider
                  label={t("settings-countdown", { value: Math.round(draft.countdownSecs) })}
                  min={0}
                  max={10}
                  step={1}
                  value={draft.countdownSecs}
                  onChange={(countdownSecs) => patch({ countdownSecs })}
                />
              </Section>
            )}

            {shown === "appearance" && (
              <Section title={t("settings-cat-appearance")}>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-havoc-muted text-[11px]">{t("settings-font-family")}</span>
                  <select
                    className={FIELD}
                    value={draft.look.fontFamily}
                    onChange={(e) =>
                      patchLook({ fontFamily: e.target.value as Look["fontFamily"] })
                    }
                  >
                    {FONT_FAMILY_IDS.map((id) => (
                      <option key={id} value={id}>
                        {t(`settings-font-${id}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center justify-between gap-3">
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

                <label className="flex items-center justify-between gap-3">
                  <span className="text-havoc-muted text-[11px]">{t("settings-text-color")}</span>
                  <input
                    type="color"
                    className="h-6 w-12 cursor-pointer rounded border border-white/10 bg-transparent p-0"
                    value={draft.look.textColor}
                    aria-label={t("settings-text-color")}
                    onChange={(e) => patchLook({ textColor: e.target.value })}
                  />
                </label>

                <Slider
                  label={t("settings-line-height", { value: draft.look.lineHeight.toFixed(2) })}
                  min={1}
                  max={2.5}
                  step={0.05}
                  value={draft.look.lineHeight}
                  onChange={(lineHeight) => patchLook({ lineHeight })}
                />
                <Slider
                  label={t("settings-margins", { value: Math.round(draft.look.marginPct) })}
                  min={0}
                  max={25}
                  step={1}
                  value={draft.look.marginPct}
                  onChange={(marginPct) => patchLook({ marginPct })}
                />
                <Slider
                  label={t("settings-guide", { value: Math.round(draft.look.guidePct) })}
                  min={5}
                  max={50}
                  step={1}
                  value={draft.look.guidePct}
                  onChange={(guidePct) => patchLook({ guidePct })}
                />
              </Section>
            )}

            {shown === "projector" && (
              <Section title={t("settings-cat-projector")}>
                <label className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={draft.mirror}
                    onChange={(e) => patch({ mirror: e.target.checked })}
                  />
                  {t("settings-mirror")}
                </label>
              </Section>
            )}

            {shown === "network" && (
              <Section title={t("settings-cat-network")}>
                <label className="flex items-center gap-2 text-[11px]">
                  <input
                    type="checkbox"
                    checked={draft.lanEnabled}
                    onChange={(e) => patch({ lanEnabled: e.target.checked })}
                  />
                  {t("settings-lan-enabled")}
                </label>

                {draft.lanEnabled && (
                  <>
                    <label className="flex items-center gap-2 text-[11px]">
                      <input
                        type="checkbox"
                        checked={draft.lanAllInterfaces}
                        onChange={(e) => patch({ lanAllInterfaces: e.target.checked })}
                      />
                      {t("settings-lan-all-interfaces")}
                    </label>
                    {/* Said plainly rather than implied: the key rides in the URL
                        over plain HTTP, which is a trusted-network assumption,
                        not a security guarantee. */}
                    <p className="m-0 text-[10px] leading-snug text-amber-400">
                      {t("settings-lan-warning")}
                    </p>
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-havoc-muted text-[11px]">{t("settings-lan-port")}</span>
                      <input
                        type="number"
                        min={1024}
                        max={65535}
                        step={1}
                        className={`${FIELD} w-28 text-center font-mono`}
                        value={draft.lanPort}
                        onChange={(e) =>
                          patch({ lanPort: Number(e.target.value) || draft.lanPort })
                        }
                      />
                    </label>
                  </>
                )}

                {mirror?.error && (
                  <p role="alert" className={ERROR_LINE}>
                    {t("settings-lan-failed", { error: mirror.error })}
                  </p>
                )}
                {mirror?.running && mirror.url ? (
                  <div className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
                    <QrSvg link={mirror.url} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="text-havoc-muted text-[10px]">
                        {t("settings-lan-open-hint")}
                      </span>
                      <code className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] break-all">
                        {mirror.url}
                      </code>
                      <button
                        type="button"
                        className={`${BUTTON} self-start`}
                        onClick={() => void lanMirrorOpen().catch((err) => setError(String(err)))}
                      >
                        {t("settings-lan-open")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-havoc-muted m-0 text-[10px]">{t("settings-lan-off-hint")}</p>
                )}
              </Section>
            )}
          </div>
        </div>

        <footer className="flex items-center gap-3 border-t border-white/10 px-4 py-2.5">
          {error && (
            <p
              role="alert"
              title={error}
              className="m-0 min-w-0 flex-1 truncate text-[11px] text-red-300"
            >
              {error}
            </p>
          )}
          <div className="ml-auto flex shrink-0 gap-2">
            <button type="button" onClick={confirm} disabled={busy} className={PRIMARY}>
              {t("settings-ok")}
            </button>
            <button type="button" onClick={onClose} className={BUTTON}>
              {t("settings-cancel")}
            </button>
            <button
              type="button"
              onClick={() => void apply()}
              disabled={!dirty || busy}
              className={`${BUTTON} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {t("settings-apply")}
            </button>
          </div>
        </footer>
      </div>
    </ModalShell>
  );
}
