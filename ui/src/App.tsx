import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  bugReportPending,
  eulaStatus as fetchEulaStatus,
  scriptsSave,
  settingsGet,
  teleprompterControl,
  teleprompterSetScript,
  teleprompterSetSpeed,
  traySync,
  voiceStartListening,
  voiceStopListening,
} from "./api/commands";
import { onVoiceCommand, onVoiceListening } from "./api/events";
import type { EulaStatus, Settings } from "./api/types";
import { voiceCommandToControl } from "./lib/voice";
import { AUTO_LOCALE, resolveAutocompleteLocale } from "./i18n/locales";
import { applySettingsToDocument, getLocale, initLocale, useT } from "./i18n/t";
import { CaesuraEditor } from "./components/CaesuraEditor";
import { BUTTON, ERROR_LINE } from "./components/styles";
import { ResizeEdges, TitleBar } from "./components/TitleBar";
import { Transport } from "./components/Transport";
import { parseCaesuras, timeAtOffset, visibleChars } from "./lib/caesura";
import { BPM_MAX, BPM_MIN, bpmFromSpeed, clampBpm, speedFromBpm } from "./lib/speed";
import { fmtTime } from "./lib/time";
import { readAloud, stopReading } from "./lib/tts";
import { useTeleprompter } from "./lib/useTeleprompter";
import { AboutDialog } from "./panels/About";
import { BugReportDialog } from "./panels/BugReport";
import { EulaGate } from "./panels/EulaGate";
import { ProjectorSetup } from "./panels/ProjectorSetup";
import { ScriptLibrary } from "./panels/ScriptLibrary";
import { SettingsDialog } from "./panels/Settings";
import { TeleprompterScroller, TeleprompterSeekBar } from "./panels/Teleprompter";
import { UpdatesDialog } from "./panels/Updates";

/** How long the editor waits after the last keystroke before autosaving (FT-10). */
const AUTOSAVE_MS = 800;

/**
 * The single-window app shell (FT-03, grown into the Phase 1 operator surface).
 *
 * The chip editor on the left, the reading preview on the right, the transport
 * and the seek bar under it. Every control drives the **shared** engine state,
 * so the projector (FT-12) and the LAN mirror follow from one broadcast — with
 * exactly one deliberate exception: read-aloud (FT-16) is a preview-local mode
 * that drives a local `raOffset` and never touches the shared scroll.
 *
 * The shell owns the dialog slot on launch, because the order matters: a crash
 * report waiting from the last run is shown, and the update check is skipped
 * entirely until the next launch.
 */
export default function App() {
  const t = useT();
  const state = useTeleprompter();
  const [settings, setSettings] = useState<Settings | null>(null);
  // Three states, and the distinction matters: `undefined` = still asking,
  // `null` = the ask FAILED, an object = the answer. Collapsing the first two
  // into `null` meant the shell rendered while the question was still in
  // flight (a visible flash of an app the user has not agreed to) and, worse,
  // rendered it permanently if the query ever failed — the gate failing OPEN.
  const [eula, setEula] = useState<EulaStatus | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // The script currently open in the library (FT-10), or null for an unsaved
  // scratch script. Autosave only runs when there is somewhere to save TO.
  const [currentScript, setCurrentScript] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // `undefined` until the local crash folder has been read — the update check
  // below must not run before it knows whether a report is waiting.
  const [pendingCrash, setPendingCrash] = useState<string | null | undefined>(undefined);
  // Whether a crash report was waiting **at launch**, latched once when that
  // IPC resolves. Deliberately NOT derived from `pendingCrash`, which is live
  // state that the reporter clears: deriving from it meant dismissing a report
  // instantly released the launch update check *on top of the still-open
  // reporter*, and merely closing one (rather than dismissing it) left the
  // crash file on disk so the check was suppressed on every future launch —
  // permanently, with nothing to tell the user.
  const [crashAtLaunch, setCrashAtLaunch] = useState<boolean | undefined>(undefined);
  const [manualUpdates, setManualUpdates] = useState(false);
  const [autoUpdateDone, setAutoUpdateDone] = useState(false);

  // Settings must land before the first paint that shows text, so the app opens
  // in the user's own language rather than flashing English.
  useEffect(() => {
    settingsGet()
      .then((loaded) => {
        setSettings(loaded);
        applySettingsToDocument(loaded);
        // Rust already reloaded the script that was open last time; this is the
        // UI catching up on WHICH one, so autosave and the library agree.
        setCurrentScript(loaded.recentScripts[0] ?? null);
      })
      .catch(() => {
        // No backend (unit test / lost host): fall back to OS language.
        initLocale("auto");
      });
    fetchEulaStatus()
      .then(setEula)
      .catch(() => setEula(null));
  }, []);

  // Keep the tray in step with BOTH the setting and the language. Its menu is
  // the one piece of app text Rust owns, and Rust has no Fluent catalogs — so
  // the labels are resolved here and pushed down. Depending on `t` as well as
  // `settings` is what makes the menu re-localise when the language changes;
  // Rust could never notice that on its own.
  useEffect(() => {
    if (!settings) return;
    void traySync(t("tray-show"), t("tray-quit")).catch(() => undefined);
  }, [settings, t]);

  // Did the last run crash? The report is a local file the panic hook wrote;
  // reading it sends nothing. If there is one, it opens on top of the app —
  // which is the whole point of the crash → restart → report loop.
  useEffect(() => {
    bugReportPending()
      .then((crash) => {
        setPendingCrash(crash);
        setCrashAtLaunch(crash !== null);
        if (crash) setBugOpen(true);
      })
      .catch(() => {
        setPendingCrash(null);
        setCrashAtLaunch(false);
      });
  }, []);

  // One update check per launch, AFTER the EULA gate — and only when a crash
  // report was NOT already claiming the dialog slot at launch. The report wins;
  // the update waits for the next launch. Offline, rate-limited or
  // no-release-yet stays silent, which `UpdatesDialog` decides for itself.
  //
  // Derived during render rather than pushed into state by an effect: "is a
  // launch check due?" is a pure function of what we already know, and an effect
  // that only calls setState is a cascading render for no gain.
  //
  // It reads `crashAtLaunch`, not `pendingCrash`, and that distinction is the
  // whole point — see the latch's declaration above.
  const autoUpdateDue =
    !autoUpdateDone && !manualUpdates && eula?.accepted === true && crashAtLaunch === false;

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

  const control = useCallback(
    (action: Parameters<typeof teleprompterControl>[0], value?: number) =>
      void teleprompterControl(action, value).catch(() => undefined),
    [],
  );

  const caesuras = useMemo(
    () => parseCaesuras(state.script, state.caesuraSecs),
    [state.script, state.caesuraSecs],
  );
  // Time to read the whole script at the current pace, caesura pauses counted —
  // it moves live with the speed control and with every edit. Memoised because
  // the shell re-renders on every engine broadcast (i.e. every keystroke) and
  // again at up to 60Hz while read-aloud runs, and this is an O(script) scan.
  const totalChars = useMemo(() => Math.max(1, visibleChars(state.script)), [state.script]);
  const estSecs = useMemo(
    () => timeAtOffset(totalChars, state.speed > 0 ? state.speed : 1, caesuras),
    [totalChars, state.speed, caesuras],
  );

  // -- voice commands (FT-31) ------------------------------------------------
  // The recogniser runs in Rust and pushes results as events. A trained
  // command's id IS its transport action; "nextMarker" seeks to the next caesura,
  // computed here from the live script. Off by default — nothing opens the mic
  // until the operator enables it in Settings.
  const [micLive, setMicLive] = useState(false);

  // The dispatcher closes over the latest caesuras/offset/control. It lives in a
  // ref, synced in an effect (never assigned during render — eslint's
  // react-hooks/refs), so the subscription below can subscribe exactly once
  // rather than tearing down and re-attaching on every keystroke.
  const voiceDispatch = useRef<(id: string) => void>(() => {});
  useEffect(() => {
    voiceDispatch.current = (id: string) => {
      const command = voiceCommandToControl(id, { caesuras, offset: state.offset });
      if (command) control(command.action, command.value);
    };
  });

  useEffect(() => {
    const command = onVoiceCommand((e) => voiceDispatch.current(e.commandId));
    const listening = onVoiceListening(setMicLive);
    return () => {
      void command.then((un) => un()).catch(() => undefined);
      void listening.then((un) => un()).catch(() => undefined);
    };
  }, []);

  // Voice is on only past the gate and when the operator enabled it. Always-mode
  // keeps the mic open the whole time; push-to-talk (the hold button below) opens
  // it only while held — so the mic is never open unattended.
  const voiceOn = (settings?.voiceEnabled ?? false) && eula?.accepted === true;
  const alwaysListening = voiceOn && settings?.voiceMode === "always";
  useEffect(() => {
    if (alwaysListening) void voiceStartListening().catch(() => undefined);
    // Release on teardown — this covers turning voice off in ANY mode, including
    // a push-to-talk session whose hold button unmounts mid-press (its pointerup
    // would then never fire). Depending on `voiceOn` is what makes disabling
    // voice while the talk button is held actually stop the mic.
    return () => void voiceStopListening().catch(() => undefined);
  }, [alwaysListening, voiceOn]);

  // -- speed: chars/sec or BPM (FT-14) ---------------------------------------
  // An operator-local DISPLAY toggle over the same authoritative chars/sec.
  const [bpmMode, setBpmMode] = useState(false);
  const [bpmDraft, setBpmDraft] = useState<string | null>(null);
  const displayBpm = clampBpm(bpmFromSpeed(state.speed));
  const commitBpm = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) {
      void teleprompterSetSpeed(speedFromBpm(clampBpm(n))).catch(() => undefined);
    }
    setBpmDraft(null);
  };

  // -- read aloud (FT-16) ----------------------------------------------------
  // A preview-only MODE: never the projector, never the shared scroll state.
  // When on, the transport and the seek drive the speech and the highlight
  // follows the spoken word via `raOffset`. `engaged` (play pressed, until stop
  // or the end) disables the checkbox so it cannot be flipped mid-speech.
  const [readAloudMode, setReadAloudMode] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [raOffset, setRaOffsetState] = useState(0);
  const raOffsetRef = useRef(0);
  const setRaOffset = (o: number) => {
    raOffsetRef.current = o;
    setRaOffsetState(o);
  };
  const [seekNonce, setSeekNonce] = useState(0);

  // Start / restart speech when the read engages, the user seeks (nonce), or the
  // pace/script changes — debounced so scrubbing does not stutter. Progress
  // drives the local highlight; onEnd frees the checkbox again.
  useEffect(() => {
    if (!readAloudMode || !speaking) return;
    const id = window.setTimeout(() => {
      void readAloud(
        state.script,
        state.speed,
        () => {
          setSpeaking(false);
          setEngaged(false);
        },
        raOffsetRef.current,
        (off) => setRaOffset(off),
        caesuras,
      );
    }, 100);
    return () => window.clearTimeout(id);
  }, [readAloudMode, speaking, seekNonce, state.speed, state.script, caesuras]);

  // Stop speech when the mode turns off, and on unmount.
  useEffect(() => {
    if (readAloudMode) return;
    stopReading();
    // Defer the flag reset out of the effect body (avoids a synchronous setState).
    const raf = requestAnimationFrame(() => {
      setSpeaking(false);
      setEngaged(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [readAloudMode]);
  useEffect(() => () => stopReading(), []);

  const raPlayPause = () => {
    // Parked at the very end (finished, or seeked there)? Play restarts from the
    // top automatically — no need to hit Stop first.
    const atEnd = raOffsetRef.current >= visibleChars(state.script) - 0.5;
    if (!engaged) {
      if (atEnd) setRaOffset(0);
      setEngaged(true);
      setSpeaking(true);
    } else if (speaking) {
      stopReading();
      setSpeaking(false); // pause — the offset stays; resume re-speaks from here
    } else {
      if (atEnd) setRaOffset(0);
      setSpeaking(true);
    }
  };
  const raStop = () => {
    stopReading();
    setSpeaking(false);
    setEngaged(false);
    setRaOffset(0);
  };
  // A click/seek/drag while reading: move the highlight and jump the speech
  // there (the nonce forces a restart even to the same offset).
  //
  // Stable, because `seek` below depends on it and the scroller keys a native
  // wheel listener on `seek`'s identity — a fresh closure per render would tear
  // that listener down and re-attach it on every keystroke.
  const raSeek = useCallback((o: number) => {
    raOffsetRef.current = o;
    setRaOffsetState(o);
    setSeekNonce((n) => n + 1);
  }, []);

  const seek = useCallback(
    (offset: number) => (readAloudMode ? raSeek(offset) : control("seek", offset)),
    [readAloudMode, raSeek, control],
  );

  // -- the editor + autosave (FT-10/FT-11) -----------------------------------
  // Edits go to the engine immediately (so the preview and the projector show
  // them as they are typed) and to disk on a debounce.
  const saveTimer = useRef<number | null>(null);
  const onScriptChange = (next: string) => {
    void teleprompterSetScript(next).catch(() => undefined);
    if (!currentScript) return; // an unsaved scratch script has nowhere to go
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      scriptsSave(currentScript, next)
        .then(() => setSaveError(null))
        .catch((err) => setSaveError(String(err)));
    }, AUTOSAVE_MS);
  };
  useEffect(
    () => () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  // The app is unusable until the current EULA version is accepted (FT-05).
  // Nothing renders until we know, and a failed query fails CLOSED — a legal
  // gate that opens when it breaks is not a gate.
  //
  // The title bar and resize edges wrap ALL of these, including the gate and the
  // failure state: the window has no OS chrome, so without them a user who
  // cannot get past the gate would have no way to move, resize, or close the
  // app at all.
  const chrome = (children: React.ReactNode, withActions = false) => (
    <div className="bg-havoc-bg text-havoc-text flex h-full w-full flex-col">
      <TitleBar
        onSettings={withActions ? () => setSettingsOpen(true) : undefined}
        onAbout={withActions ? () => setAboutOpen(true) : undefined}
      />
      {children}
      <ResizeEdges />
    </div>
  );

  if (eula === undefined) return chrome(<div className="flex-1" />);
  if (eula === null) {
    return chrome(
      <div className="flex flex-1 items-center justify-center p-6">
        <p role="alert" className="m-0 text-center text-sm">
          {t("startup-failed")}
        </p>
      </div>,
    );
  }
  if (!eula.accepted) {
    // Wrapped in a `flex-1 min-h-0` box, not dropped in bare: the gate's own
    // root is `h-full`, which under the title bar resolved to the FULL window
    // height and pushed its Agree/Decline buttons off the bottom edge.
    return chrome(
      <div className="min-h-0 flex-1">
        <EulaGate status={eula} onAccepted={() => setEula({ ...eula, accepted: true })} />
      </div>,
    );
  }

  const playing = readAloudMode ? speaking : state.playing;

  return chrome(
    <>
      <header className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <button type="button" className={BUTTON} onClick={() => setLibraryOpen(true)}>
          {t("toolbar-library")}
        </button>
        <button type="button" className={BUTTON} onClick={() => setProjectorOpen(true)}>
          {t("toolbar-projector")}
        </button>
        <button type="button" className={BUTTON} onClick={() => setBugOpen(true)}>
          {t("toolbar-bug-report")}
        </button>
        <button type="button" className={BUTTON} onClick={() => setManualUpdates(true)}>
          {t("toolbar-updates")}
        </button>
        <div className="flex-1" />
        {/* Push-to-talk: the mic opens only while this is held (FT-31). */}
        {voiceOn && settings?.voiceMode === "push_to_talk" && (
          <button
            type="button"
            data-testid="voice-hold-to-talk"
            className={BUTTON}
            onPointerDown={() => void voiceStartListening().catch(() => undefined)}
            onPointerUp={() => void voiceStopListening().catch(() => undefined)}
            onPointerLeave={() => void voiceStopListening().catch(() => undefined)}
            onPointerCancel={() => void voiceStopListening().catch(() => undefined)}
          >
            {t("voice-hold-to-talk")}
          </button>
        )}
        {/* Whenever the mic is actually open — always-listening or a held talk
            button — the operator can see it. */}
        {micLive && (
          <span
            data-testid="voice-mic-live"
            role="status"
            className="flex items-center gap-1.5 text-[11px] text-red-300"
          >
            <span className="h-2 w-2 rounded-full bg-red-400" aria-hidden="true" />
            {t("voice-listening")}
          </span>
        )}
      </header>

      <main className="grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-2">
        <section className="flex min-h-0 flex-col gap-2">
          {/* Just the field label. The open script's name is NOT shown here —
              the Scripts dialog marks it, which is where you go to change it
              anyway; on the main surface it was one more thing to read. */}
          <label id="script-label" className="text-havoc-muted text-[11px]">
            {t("editor-label")}
          </label>
          <CaesuraEditor
            value={state.script}
            onChange={onScriptChange}
            caesuraSecs={state.caesuraSecs}
            autocomplete={settings?.autocomplete ?? false}
            autocompleteLang={resolveAutocompleteLocale(
              settings?.autocompleteLanguage ?? AUTO_LOCALE,
              getLocale(),
            )}
            placeholder={t("editor-placeholder")}
            ariaLabelledBy="script-label"
            className="text-havoc-text h-full w-full overflow-y-auto rounded-md border border-white/10 bg-white/5 p-2 font-mono text-xs"
          />
          <div className="text-havoc-muted flex items-center justify-between text-[11px]">
            <span>{t("editor-caesura-hint")}</span>
            <span className="font-mono">{t("editor-est-time", { time: fmtTime(estSecs) })}</span>
          </div>
          {saveError && (
            <p role="alert" className={ERROR_LINE}>
              {t("editor-save-failed", { error: saveError })}
            </p>
          )}

          <Transport
            playing={playing}
            onTop={() => (readAloudMode ? raSeek(0) : control("top"))}
            onStepBack={(step) => control("stepBack", step)}
            onStepForward={(step) => control("stepForward", step)}
            onSlower={() => control("slower")}
            onFaster={() => control("faster")}
            onPlayPause={() => (readAloudMode ? raPlayPause() : control("toggle"))}
            onStop={() => (readAloudMode ? raStop() : control("stop"))}
          />

          <label className="text-havoc-muted flex items-center justify-between text-[11px]">
            <span>{bpmMode ? t("editor-speed-bpm") : t("editor-speed")}</span>
            {bpmMode ? (
              <input
                type="number"
                min={BPM_MIN}
                max={BPM_MAX}
                step={1}
                value={bpmDraft ?? displayBpm}
                onChange={(e) => {
                  const raw = e.target.value;
                  setBpmDraft(raw);
                  // Commit live while in range so the spinner arrows take effect
                  // at once; anything typed out of range is clamped on blur/Enter.
                  const n = Number(raw);
                  if (raw !== "" && Number.isFinite(n) && n >= BPM_MIN && n <= BPM_MAX) {
                    void teleprompterSetSpeed(speedFromBpm(n)).catch(() => undefined);
                  }
                }}
                onBlur={(e) => {
                  // Only commit an actual edit — a bare focus/blur must not
                  // down-convert a high chars/sec speed to the clamped BPM view.
                  if (bpmDraft !== null) commitBpm(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitBpm(e.currentTarget.value);
                    e.currentTarget.blur();
                  }
                }}
                aria-label={t("editor-speed-bpm")}
                className="w-20 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-center font-mono"
              />
            ) : (
              <span className="font-mono">{state.speed.toFixed(1)}</span>
            )}
          </label>
          {!bpmMode && (
            <input
              type="range"
              min={1}
              max={60}
              step={1}
              value={state.speed}
              aria-label={t("editor-speed")}
              onChange={(e) =>
                void teleprompterSetSpeed(Number(e.target.value)).catch(() => undefined)
              }
            />
          )}

          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={bpmMode}
              onChange={(e) => setBpmMode(e.target.checked)}
            />
            {t("editor-bpm-mode")}
          </label>

          <label className="flex items-center gap-2 text-[11px]">
            <input
              type="checkbox"
              checked={readAloudMode}
              disabled={engaged}
              onChange={(e) => setReadAloudMode(e.target.checked)}
            />
            {/* Disabled while a read is engaged, so it cannot be flipped
                mid-speech; Stop re-enables it.

                No emoji here. This label used to lead with a speaker glyph, and
                the Linux CI screenshot showed it as a tofu box: the bundled Noto
                families cover writing systems, not emoji, and a bare Linux box
                has no emoji font either. Bundling ~10 MB of Noto Color Emoji to
                decorate one checkbox is not a trade worth making, and the label
                says what it does without it. */}
            <span className={engaged ? "opacity-40" : undefined}>{t("editor-read-aloud")}</span>
          </label>
        </section>

        {/* No "Preview" caption: a black scrolling script beside an editor does
            not need to be labelled as the preview. */}
        <section className="flex min-h-0 flex-col gap-2">
          <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-white/10">
            <TeleprompterScroller
              state={state}
              onSeek={seek}
              overrideOffset={readAloudMode ? raOffset : undefined}
            />
          </div>
          <TeleprompterSeekBar
            state={state}
            caesuras={caesuras}
            onSeek={seek}
            overrideOffset={readAloudMode ? raOffset : undefined}
          />
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

      <ScriptLibrary
        open={libraryOpen}
        currentName={currentScript}
        onClose={() => setLibraryOpen(false)}
        onOpened={(name) => {
          setCurrentScript(name);
          setSaveError(null);
        }}
        onRenamed={(from, to) => setCurrentScript((c) => (c === from ? to : c))}
        onDeleted={(name) => setCurrentScript((c) => (c === name ? null : c))}
      />

      <ProjectorSetup
        open={projectorOpen}
        mirror={state.mirror}
        onClose={() => setProjectorOpen(false)}
      />

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

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>,
    true,
  );
}
