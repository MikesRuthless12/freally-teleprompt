import { useCallback, useEffect, useState } from "react";

import {
  bugReportPending,
  eulaStatus as fetchEulaStatus,
  settingsGet,
  teleprompterControl,
  teleprompterSetScript,
} from "./api/commands";
import type { EulaStatus, Settings } from "./api/types";
import { applySettingsToDocument, initLocale, useT } from "./i18n/t";
import { BUTTON } from "./components/styles";
import { useTeleprompter } from "./lib/useTeleprompter";
import { BugReportDialog } from "./panels/BugReport";
import { EulaGate } from "./panels/EulaGate";
import { SettingsDialog } from "./panels/Settings";
import { TeleprompterScroller } from "./panels/Teleprompter";
import { UpdatesDialog } from "./panels/Updates";

/**
 * The single-window app shell (FT-03): a toolbar over the ported preview.
 *
 * Phase 0 deliberately stops here. The script library (FT-10), the caesura-chip
 * editor (FT-11), the projector (FT-12), and the real transport (FT-13) are
 * Phase 1 — this shell exists to prove the ported engine, i18n, settings, the
 * EULA gate, and the problem reporter + update check (FT-06) all work end to end.
 *
 * The shell owns the dialog slot on launch, because the order matters: a crash
 * report waiting from the last run is shown, and the update check is skipped
 * entirely until the next launch.
 */
export default function App() {
  const t = useT();
  const state = useTeleprompter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [eula, setEula] = useState<EulaStatus | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftScript, setDraftScript] = useState("");
  const [bugOpen, setBugOpen] = useState(false);
  // `undefined` until the local crash folder has been read — the update check
  // below must not run before it knows whether a report is waiting.
  const [pendingCrash, setPendingCrash] = useState<string | null | undefined>(undefined);
  const [manualUpdates, setManualUpdates] = useState(false);
  const [autoUpdateDone, setAutoUpdateDone] = useState(false);

  // Settings must land before the first paint that shows text, so the app opens
  // in the user's own language rather than flashing English.
  useEffect(() => {
    settingsGet()
      .then((loaded) => {
        setSettings(loaded);
        applySettingsToDocument(loaded);
      })
      .catch(() => {
        // No backend (unit test / lost host): fall back to OS language.
        initLocale("auto");
      });
    fetchEulaStatus()
      .then(setEula)
      .catch(() => setEula(null));
  }, []);

  // Did the last run crash? The report is a local file the panic hook wrote;
  // reading it sends nothing. If there is one, it opens on top of the app —
  // which is the whole point of the crash → restart → report loop.
  useEffect(() => {
    bugReportPending()
      .then((crash) => {
        setPendingCrash(crash);
        if (crash) setBugOpen(true);
      })
      .catch(() => setPendingCrash(null));
  }, []);

  // One update check per launch, AFTER the EULA gate — and only when a pending
  // crash report is not already claiming the dialog slot. The report wins; the
  // update waits for the next launch. Offline, rate-limited or no-release-yet
  // stays silent, which `UpdatesDialog` decides for itself.
  //
  // Derived during render rather than pushed into state by an effect: "is a
  // launch check due?" is a pure function of what we already know, and an effect
  // that only calls setState is a cascading render for no gain. `pendingCrash`
  // is `undefined` until its IPC resolves, so this stays false until the answer
  // is actually in — the crash report gets first refusal on the dialog slot.
  const autoUpdateDue =
    !autoUpdateDone && !manualUpdates && eula?.accepted === true && pendingCrash === null;

  const onApplied = useCallback((applied: Settings) => {
    setSettings(applied);
    applySettingsToDocument(applied);
  }, []);

  // Stable, so the dialog's one check does not re-issue on every render here.
  // Retiring the launch check on close is what makes it once-per-launch: the
  // dialog unmounts and `autoUpdateDue` can never come back true this session.
  const closeUpdates = useCallback(() => {
    setManualUpdates(false);
    setAutoUpdateDone(true);
  }, []);

  // Stable: the scroller attaches a native non-passive wheel listener keyed on
  // this identity, so a fresh closure each render would tear it down and
  // re-attach it on every keystroke in the script box and every engine event.
  const seek = useCallback((offset: number) => {
    void teleprompterControl("seek", offset);
  }, []);

  const loadScript = () => {
    void teleprompterSetScript(draftScript);
  };

  // The app is unusable until the current EULA version is accepted (FT-05).
  if (eula && !eula.accepted) {
    return <EulaGate status={eula} onAccepted={() => setEula({ ...eula, accepted: true })} />;
  }

  return (
    <div className="bg-havoc-bg text-havoc-text flex h-full w-full flex-col">
      <header className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <span className="from-havoc-accent to-havoc-accent-2 bg-gradient-to-r bg-clip-text text-sm font-bold tracking-wide text-transparent">
          {t("app-name")}
        </span>
        <div className="flex-1" />
        <button type="button" className={BUTTON} onClick={() => teleprompterControl("toggle")}>
          {state.playing ? t("transport-pause") : t("transport-play")}
        </button>
        <button type="button" className={BUTTON} onClick={() => teleprompterControl("top")}>
          {t("transport-restart")}
        </button>
        <button type="button" className={BUTTON} onClick={() => setBugOpen(true)}>
          {t("toolbar-bug-report")}
        </button>
        <button type="button" className={BUTTON} onClick={() => setManualUpdates(true)}>
          {t("toolbar-updates")}
        </button>
        <button type="button" className={BUTTON} onClick={() => setSettingsOpen(true)}>
          {t("toolbar-settings")}
        </button>
      </header>

      <main className="flex min-h-0 flex-1">
        <section className="flex w-80 flex-col gap-2 border-r border-white/10 p-3">
          <label className="text-havoc-muted text-[11px]" htmlFor="script-input">
            {t("editor-label")}
          </label>
          <textarea
            id="script-input"
            className="text-havoc-text min-h-0 flex-1 resize-none rounded-md border border-white/10 bg-white/5 p-2 font-mono text-xs"
            placeholder={t("editor-placeholder")}
            value={draftScript}
            onChange={(e) => setDraftScript(e.target.value)}
          />
          <button type="button" className={BUTTON} onClick={loadScript}>
            {t("editor-load")}
          </button>
        </section>

        <section className="min-w-0 flex-1">
          <TeleprompterScroller state={state} onSeek={seek} />
        </section>
      </main>

      {settings && (
        <SettingsDialog
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onApplied={onApplied}
        />
      )}

      <BugReportDialog
        open={bugOpen}
        pendingCrash={pendingCrash ?? null}
        onCrashDismissed={() => setPendingCrash(null)}
        onClose={() => setBugOpen(false)}
      />

      {/* `stacked` when the bug reporter is already open: a second backdrop blur
          over the first smears the dialog underneath, which is meant to stay
          crisp (SR-1). Reachable in practice — a pending crash report opens the
          reporter at launch, and the toolbar can raise Updates on top of it. */}
      {(manualUpdates || autoUpdateDue) && (
        <UpdatesDialog manual={manualUpdates} stacked={bugOpen} onClose={closeUpdates} />
      )}
    </div>
  );
}
