import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  bugReportPending,
  dictationStart,
  dictationStop,
  eulaStatus as fetchEulaStatus,
  onboardingSetSeen,
  scriptsSave,
  settingsGet,
  speechCapability,
  teleprompterControl,
  teleprompterSetScript,
  teleprompterSetSpeed,
  traySync,
} from "./api/commands";
import { onVoiceDictating, onVoiceDictation, onVoiceError } from "./api/events";
import type { EulaStatus, Settings } from "./api/types";
import { AUTO_LOCALE, resolveAutocompleteLocale } from "./i18n/locales";
import { applySettingsToDocument, getLocale, initLocale, useT } from "./i18n/t";
import { CaesuraEditor, type CaesuraEditorHandle } from "./components/CaesuraEditor";
import { MarkerJump } from "./components/MarkerJump";
import { BUTTON, ERROR_LINE } from "./components/styles";
import { PaceWarning } from "./components/PaceWarning";
import { TempoReadout } from "./components/TempoReadout";
import { ResizeEdges, TitleBar } from "./components/TitleBar";
import { Transport } from "./components/Transport";
import { timeAtOffset, timedRegions, visibleChars } from "./lib/caesura";
import type { Match } from "./lib/find";
import { markers as findMarkers } from "./lib/markers";
import { Metronome } from "./lib/metronome";
import type { Sample } from "./lib/rehearsal";
import { scriptStats } from "./lib/stats";
import {
  DEFAULT_CHARS_PER_BEAT,
  bpmFromSpeed,
  bpmRange,
  clampBpm,
  speedFromBpm,
} from "./lib/speed";
import { DEFAULT_BEATS_PER_BAR } from "./lib/tempo";
import { fmtTime } from "./lib/time";
import { readAloud, stopReading } from "./lib/tts";
import { useRehearsal } from "./lib/useRehearsal";
import { useTeleprompter } from "./lib/useTeleprompter";
import { AboutDialog } from "./panels/About";
import { BugReportDialog } from "./panels/BugReport";
import { EulaGate } from "./panels/EulaGate";
import { FindReplace } from "./panels/FindReplace";
import { ImportDocument } from "./panels/ImportDocument";
import { ProjectorSetup } from "./panels/ProjectorSetup";
import { RehearsalReport } from "./panels/Rehearsal";
import { ScriptLibrary } from "./panels/ScriptLibrary";
import { SettingsDialog } from "./panels/Settings";
import { TeleprompterScroller, TeleprompterSeekBar } from "./panels/Teleprompter";
import { TourDialog } from "./panels/Tour";
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
  const [importOpen, setImportOpen] = useState(false);
  // Find & replace (FT-M07). The match lives HERE rather than in the dialog
  // because two surfaces need it: the dialog shows it in context, and the
  // editor paints it. One owner, so they cannot show different matches.
  const [findOpen, setFindOpen] = useState(false);
  const [findMatch, setFindMatch] = useState<Match | null>(null);
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
  // The onboarding tour (FT-50). `manualTour` is the replay from Settings;
  // `tourDone` retires the first-run showing for this session, the same latch
  // `autoUpdateDone` is and for the same reason — `settings.onboardingSeen`
  // only changes once the backend round-trips, and until it does, deriving
  // "should it be open?" from it alone would re-open the dialog on close.
  const [manualTour, setManualTour] = useState(false);
  const [tourDone, setTourDone] = useState(false);
  // Whether the settings read has finished, succeeded or not. `settings` alone
  // cannot answer that — null means both "still asking" and "the ask failed" —
  // and `launchClaim` has to tell them apart. Same three-state problem the
  // `eula` and `crashAtLaunch` latches above already solve.
  const [settingsSettled, setSettingsSettled] = useState(false);

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
      })
      // Settled either way — see `launchClaim`. Latched separately from
      // `settings` because a FAILED read leaves `settings` null forever, and
      // "we asked and got nothing" must still release the launch dialogs
      // rather than blocking them for the session.
      .finally(() => setSettingsSettled(true));
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

  // Who gets the dialog slot at launch. Three things want it and the order
  // matters: a crash report from the last run is the most urgent, the tour
  // introduces a first run, and the once-per-launch update check is the least
  // pressing. Whoever loses waits its turn — the tour releases the slot the
  // moment it closes, so an update found on a first run is offered right after
  // the welcome rather than a launch later. A crash report is the exception:
  // `crashAtLaunch` is latched for the whole session, so the other two really
  // do wait for the next launch behind one.
  //
  // Written as ONE ordered expression rather than as booleans that negate each
  // other. Each claimant would otherwise have to name every higher-priority one
  // in its own condition — N-1 edits every time a fourth is added, and a missed
  // one shows up as two stacked dialogs on someone's first run.
  //
  // Derived during render rather than pushed into state by an effect: "who is
  // due?" is a pure function of what we already know, and an effect that only
  // calls setState is a cascading render for no gain.
  //
  // It reads `crashAtLaunch`, not `pendingCrash`, and that distinction is the
  // whole point — see the latch's declaration above. `!== false` covers
  // `undefined` too: while the crash folder is still being read, nobody else
  // may take the slot. The update check's own silence when it is offline,
  // rate-limited, or already current is `UpdatesDialog`'s business, not this.
  //
  // `settingsSettled` is in the guard for the same reason. Without it, a first
  // run whose `settings_get` resolved AFTER the crash and EULA reads would see
  // `settings?.onboardingSeen === false` be false-because-still-loading, hand
  // the slot to the update check, start a network check, then take it away
  // again the moment the settings landed — discarding that in-flight result and
  // firing a second check once the tour closed.
  const launchClaim =
    crashAtLaunch !== false || eula?.accepted !== true || !settingsSettled
      ? "none"
      : !tourDone && settings?.onboardingSeen === false
        ? "tour"
        : !autoUpdateDone && !manualUpdates
          ? "update"
          : "none";

  const tourOpen = manualTour || launchClaim === "tour";
  const autoUpdateDue = launchClaim === "update";

  // Every exit from the tour — Done, Skip, Esc, a backdrop click — records it
  // as seen, so it introduces itself once and then stays out of the way.
  //
  // `tourDone` is the session latch (the same one `autoUpdateDone` is), and it
  // is deliberately the ONLY thing that closes the dialog: patching
  // `settings.onboardingSeen` optimistically as well would be a second latch
  // for one fact, and nothing else in the app reads that field.
  const closeTour = useCallback(() => {
    setManualTour(false);
    setTourDone(true);
    void onboardingSetSeen(true).catch(() => undefined);
  }, []);

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

  // Every region that changes the scroll's timing: caesura holds, and the
  // labels a keyword marks as unperformed (FT-M02). The keyword list rides on
  // the engine snapshot, not on `settings`, so this surface and the projector
  // cannot parse the same script differently.
  // `regions` times the scroll; `skips` says which characters read-aloud must
  // not say. Both from one pass — see `ScriptTiming`.
  const { regions: caesuras, skips } = useMemo(
    () => timedRegions(state.script, state.caesuraSecs, state.skipWords),
    [state.script, state.caesuraSecs, state.skipWords],
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
  // Script statistics (FT-M03) and section markers (FT-M05). Both are O(script)
  // scans over a value that changes only on an edit, and this component
  // re-renders on every engine broadcast and again at up to 60Hz while
  // read-aloud runs — so both are memoised for the same reason `estSecs` is.
  const stats = useMemo(
    () => scriptStats(state.script, state.skipWords),
    [state.script, state.skipWords],
  );
  const markers = useMemo(
    () => findMarkers(state.script, state.skipWords),
    [state.script, state.skipWords],
  );

  // -- speed: chars/sec or BPM (FT-14, calibratable since FT-N02) ------------
  // An operator-local DISPLAY toggle over the same authoritative chars/sec.
  //
  // The conversion needs the performer's own chars-per-beat. Where the settings
  // read has not landed (or failed), the shipped default stands in — the same
  // number Rust defaults the setting to, so the two cannot disagree.
  const [bpmMode, setBpmMode] = useState(false);
  const [bpmDraft, setBpmDraft] = useState<string | null>(null);
  const charsPerBeat = settings?.charsPerBeat ?? DEFAULT_CHARS_PER_BEAT;
  // Calibration moves which BPMs the engine can actually take — see `bpmRange`.
  const bpmLimits = bpmRange(charsPerBeat);
  /**
   * The tempo the scroll is ACTUALLY running at. Deliberately **not** clamped.
   *
   * `bpmRange` guards *entry* — it stops the operator typing a BPM the engine
   * would refuse. It must not be applied to the *readout*, and this used to be:
   * at the shipped calibration every speed above 14.58 chars/sec maps past
   * `BPM_MAX`, so one press of Faster from the default pinned the click, the
   * bar/beat counter and the seek bar's bar lines at a flat 250 while the
   * scroll went on accelerating to four times that. That is precisely the
   * failure the clamp exists to prevent, reached from the other end — a number
   * on screen that does not describe what the scroll is doing.
   *
   * The chars/sec slider can therefore put the BPM field outside its own
   * min/max. That is honest: the field says what the tempo is, and its bounds
   * say what you may type.
   */
  const displayBpm = bpmFromSpeed(state.speed, charsPerBeat);
  const commitBpm = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n)) {
      void teleprompterSetSpeed(speedFromBpm(clampBpm(n, charsPerBeat), charsPerBeat)).catch(
        () => undefined,
      );
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
        skips,
      );
    }, 100);
    return () => window.clearTimeout(id);
  }, [readAloudMode, speaking, seekNonce, state.speed, state.script, caesuras, skips]);

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

  // -- musical time: the click and the counter (FT-N03 / FT-N04) -------------
  // Both run off ONE clock — the read's own elapsed seconds, caesura holds
  // counted — so the number on screen and the click in the ear can never
  // disagree about where the script is. See `useReadClock`.
  //
  // Sits below read-aloud because it defers to it: that mode is the OS speaking
  // the script out loud, and a click over the top of it is noise over the thing
  // you asked to hear.
  const beatsPerBar = settings?.beatsPerBar ?? DEFAULT_BEATS_PER_BAR;
  const metronomeOn = settings?.metronome ?? false;
  // Bars and beats are shown when the operator is actually working to a tempo.
  // A bar number over a script being read at 12 characters a second is a number
  // with nothing attached to it.
  const tempoShown = bpmMode || metronomeOn;
  const [rehearsing, setRehearsing] = useState(false);

  // One instance for the app's life; it owns an AudioContext, and building a
  // fresh one per play would leak an audio device every time.
  const metronome = useRef<Metronome | null>(null);
  useEffect(() => {
    const click = (metronome.current ??= new Metronome());
    if (!metronomeOn || !state.playing || readAloudMode) {
      click.stop();
      return;
    }
    // Re-anchored on every engine broadcast — a seek, a tempo change, a
    // play-after-pause. `readSec` is deliberately NOT in the dep list: it ticks
    // twenty times a second, and re-anchoring that often would re-derive the
    // beat index from a moving position forever. The anchor is taken from the
    // same quantities the scroller anchors on, which is what keeps the click
    // and the scroll on one clock.
    click.start({
      bpm: displayBpm,
      beatsPerBar,
      readSec:
        state.countdownRemaining > 0
          ? -state.countdownRemaining
          : timeAtOffset(state.offset, state.speed > 0 ? state.speed : 1, caesuras),
    });
  }, [
    metronomeOn,
    readAloudMode,
    state.playing,
    state.offset,
    state.speed,
    state.countdownRemaining,
    caesuras,
    displayBpm,
    beatsPerBar,
  ]);
  // Releases the audio device when the window goes away.
  useEffect(() => () => metronome.current?.stop(), []);

  // -- rehearsal and the pace warning (FT-N01 / FT-N05) ----------------------
  // Timings and nothing else: a list of "at this second, the read was here".
  // No microphone is opened and no audio API is touched — see `useRehearsal`.
  // The recording the report is built from — null while there is no report to
  // show. A snapshot rather than a live reference: it is taken in the handler
  // that asks for the report, so the dialog reads a set of samples that cannot
  // change under it.
  const [report, setReport] = useState<Sample[] | null>(null);
  const rehearsal = useRehearsal(state, caesuras, rehearsing);

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

  // -- dictation (FT-33) -----------------------------------------------------
  // Speak, and the words are written into the script. The recogniser runs in
  // Rust behind the `vosk` feature and pushes completed utterances as events.
  //
  // Each utterance goes THROUGH THE EDITOR, via its `insertText` handle — the
  // same path a paste takes. That is one line here and a great deal of
  // machinery not written: the editor already owns the caret, the undo stack
  // and the chip-aware DOM, so dictation inherits all three, and the script
  // still reaches the engine, the projector and autosave through the editor's
  // ordinary `onChange`. See `CaesuraEditor.insertText` for what this replaced.
  const [dictating, setDictating] = useState(false);
  // The capability check: is the engine compiled in AND its model installed?
  const [speechAvailable, setSpeechAvailable] = useState(false);
  // A voice error (mic could not open, model could not load) — surfaced so a
  // failed session does not leave a button showing "recording" over a dead engine.
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Offered only when switched on AND the model is present AND the agreement is
  // accepted. All three, because this opens a microphone.
  const dictationOn =
    (settings?.dictationEnabled ?? false) && speechAvailable && eula?.accepted === true;

  // A surfaced voice error clears itself after a few seconds.
  useEffect(() => {
    if (!voiceError) return;
    const id = window.setTimeout(() => setVoiceError(null), 6000);
    return () => window.clearTimeout(id);
  }, [voiceError]);

  // Recording must stop if the operator switches it off, revokes the agreement,
  // or the engine becomes unavailable — otherwise the microphone stays open with
  // the record button gone from the toolbar and NOTHING left that can close it.
  // The Settings copy promises "the microphone is open only while recording", so
  // this is the code that keeps that true.
  useEffect(() => {
    if (!dictationOn && dictating) void dictationStop().catch(() => undefined);
  }, [dictationOn, dictating]);

  // The editor's imperative handle — the seam every utterance goes through.
  //
  // ⚠️ It is what makes the DOM the single source of truth, and three separate
  // bugs came from not having it. `state.script` round-trips through the engine,
  // so anything chaining from it loses a second utterance that arrives before
  // the round-trip returns; chaining from dictation's OWN last write instead
  // fixed that and broke two more — text typed by hand mid-recording was
  // overwritten, and opening another script mid-recording wrote the previous
  // script's text over the newly-opened one, which autosave then persisted,
  // destroying the file on disk. Reading the live editor has none of those
  // failure modes, because there is nothing left to keep in step.
  const editor = useRef<CaesuraEditorHandle>(null);

  // One mount-once subscription for the whole feature: the capability read and
  // all three `voice:*` events share a lifetime, so they share an effect.
  //
  // The handle is read at CALL time (`editor.current`), never captured, so this
  // listener registering once is not the stale-closure trap it looks like.
  useEffect(() => {
    speechCapability()
      .then((cap) => setSpeechAvailable(cap.available))
      .catch(() => setSpeechAvailable(false));
    const text = onVoiceDictation((said) => editor.current?.insertText(said));
    const running = onVoiceDictating(setDictating);
    const error = onVoiceError(setVoiceError);
    return () => {
      for (const sub of [text, running, error]) {
        void sub.then((un) => un()).catch(() => undefined);
      }
    };
  }, []);

  // The button carries no text (it is a circle with a glyph), so these two say
  // the same thing in the two places a control can be read: `dictateLabel` is
  // its accessible name and its tooltip, `dictateHint` is the visible line
  // beside it.
  const dictateLabel = dictating ? t("editor-dictate-stop") : t("editor-dictate");
  const dictateHint = dictating ? t("editor-dictate-hint-stop") : t("editor-dictate-hint");

  const toggleDictation = () => {
    if (dictating) {
      void dictationStop().catch(() => undefined);
      return;
    }
    setVoiceError(null);
    dictationStart().catch((err) => setVoiceError(String(err)));
  };
  useEffect(
    () => () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  // Ctrl+F / Cmd+F opens find (FT-M07). On the window rather than on the
  // editor, because the operator reaches for it from wherever they are — and
  // `preventDefault` is what stops the WebView's own find bar opening on top of
  // ours, which would search the rendered page (chips, glyphs and all) instead
  // of the script.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setFindOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  // Read-aloud is the only thing that overrides the shared scroll — it is a
  // preview-local mode, so the projector and the LAN mirror stay on the shared
  // state while it runs. Dictation never touches the scroll at all: it writes
  // text, it does not read.
  const scrollOverride: number | undefined = readAloudMode ? raOffset : undefined;

  const playing = readAloudMode ? speaking : state.playing;

  return chrome(
    <>
      <header className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <button type="button" className={BUTTON} onClick={() => setLibraryOpen(true)}>
          {t("toolbar-library")}
        </button>
        {/* Beside Scripts, because importing is how a script gets INTO the
            library — the two are one task from the operator's side. */}
        <button
          type="button"
          className={BUTTON}
          data-testid="toolbar-import"
          onClick={() => setImportOpen(true)}
        >
          {t("toolbar-import")}
        </button>
        <button
          type="button"
          className={BUTTON}
          data-testid="toolbar-find"
          onClick={() => setFindOpen(true)}
        >
          {t("toolbar-find")}
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
        {/* A voice mic/model failure, surfaced (the backend message) so a failed
            session isn't silently dead behind a lit button. */}
        {voiceError && (
          <span role="alert" data-testid="voice-error" className="text-[11px] text-red-300">
            {voiceError}
          </span>
        )}
      </header>

      <main className="grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-2">
        <section className="flex min-h-0 flex-col gap-2">
          {/* Just the field label. The open script's name is NOT shown here —
              the Scripts dialog marks it, which is where you go to change it
              anyway; on the main surface it was one more thing to read. */}
          <div className="flex items-center gap-2">
            <label id="script-label" className="text-havoc-muted text-[11px]">
              {t("editor-label")}
            </label>
            <div className="flex-1" />
            {/* Record / stop. Present whenever dictation is switched on in
                Settings AND the model is actually installed — the capability
                check means this is never a button that cannot work.

                One button with two states rather than two buttons: it is the
                same microphone either way, and a stop control that appears from
                nowhere is harder to hit than one already under the pointer. */}
            {dictationOn && (
              <>
                {/* The instruction, to the LEFT of the button and outside it.
                    It changes with the state, which is why it cannot live
                    inside a control whose whole point is not to resize. */}
                <span data-testid="dictate-hint" className="text-havoc-muted text-[11px]">
                  {dictateHint}
                </span>
                <button
                  type="button"
                  data-testid="dictate-toggle"
                  className="dictate-btn"
                  aria-pressed={dictating}
                  // A glyph-only control still needs a name. `title` is the
                  // pointer's version of the same string and `aria-label` the
                  // screen reader's; the visible hint beside it is a third
                  // wording of the same thing, for everyone else.
                  title={dictateLabel}
                  aria-label={dictateLabel}
                  onClick={toggleDictation}
                >
                  {/* A square while recording (stop), a circle when idle
                      (record) — the two shapes every recorder uses. Drawn as
                      boxes rather than written as ● and ■: the glyph a font
                      hands back for those varies, and this app renders in 18
                      languages across three platforms' font stacks.
                      `bg-current` is what makes the shape follow the hover
                      colour the stylesheet decides. */}
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 bg-current ${dictating ? "" : "rounded-full"}`}
                  />
                </button>
              </>
            )}
          </div>
          <CaesuraEditor
            ref={editor}
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
            highlight={findOpen ? findMatch : null}
            className="text-havoc-text h-full w-full overflow-y-auto rounded-md border border-white/10 bg-white/5 p-2 font-mono text-xs"
          />
          <div className="text-havoc-muted flex items-center justify-between text-[11px]">
            <span>{t("editor-caesura-hint")}</span>
            <span className="font-mono">{t("editor-est-time", { time: fmtTime(estSecs) })}</span>
          </div>
          {/* Script statistics (FT-M03), on the line under the duration they
              belong with. The counts are of what is PERFORMED — see
              `scriptStats` — so they agree with the estimate beside them
              rather than quietly counting the labels it ignores. */}
          <div
            data-testid="script-stats"
            className="text-havoc-muted flex items-center justify-between gap-2 text-[11px]"
          >
            <span className="font-mono">
              {t("stats-counts", { words: stats.words, chars: stats.chars })}
            </span>
            {stats.longLine && (
              // The accent, not a fixed amber: a warning colour picked for the
              // dark palette is unreadable on the light one, and this is a
              // "worth knowing" rather than an error — `ERROR_LINE`'s red would
              // say something is wrong, and nothing is.
              <span data-testid="stats-long-line" className="text-havoc-accent">
                {t("stats-long-line", {
                  line: stats.longestLineNumber,
                  chars: stats.longestLine,
                })}
              </span>
            )}
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
                min={bpmLimits.min}
                max={bpmLimits.max}
                step={1}
                value={bpmDraft ?? displayBpm}
                onChange={(e) => {
                  const raw = e.target.value;
                  setBpmDraft(raw);
                  // Commit live while in range so the spinner arrows take effect
                  // at once; anything typed out of range is clamped on blur/Enter.
                  const n = Number(raw);
                  if (
                    raw !== "" &&
                    Number.isFinite(n) &&
                    n >= bpmLimits.min &&
                    n <= bpmLimits.max
                  ) {
                    void teleprompterSetSpeed(speedFromBpm(n, charsPerBeat)).catch(() => undefined);
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
              disabled={engaged || rehearsing}
              onChange={(e) => setReadAloudMode(e.target.checked)}
            />
            {/* Disabled while a read is engaged, so it cannot be flipped
                mid-speech; Stop re-enables it.

                ⚠️ And while rehearsing. The exclusion between these two has to
                be stated on BOTH controls or it is not an exclusion: with it
                only on the rehearse box, ticking Rehearse and then Read aloud
                left both on — and the rehearse box, now disabled WHILE
                CHECKED, could not be unticked, so the report could never be
                opened. Read-aloud drives a preview-local offset and leaves the
                shared scroll alone, so the recorder sat there sampling one
                unmoving position and the pace warning climbed forever.

                No emoji here. This label used to lead with a speaker glyph, and
                the Linux CI screenshot showed it as a tofu box: the bundled Noto
                families cover writing systems, not emoji, and a bare Linux box
                has no emoji font either. Bundling ~10 MB of Noto Color Emoji to
                decorate one checkbox is not a trade worth making, and the label
                says what it does without it. */}
            <span className={engaged || rehearsing ? "opacity-40" : undefined}>
              {t("editor-read-aloud")}
            </span>
          </label>

          {/* Rehearsal (FT-N01). A checkbox beside read-aloud because it is the
              same kind of thing — a way of running the script, not a setting.
              Read-aloud drives the scroll itself, so the two are mutually
              exclusive: a rehearsal of the machine reading to itself measures
              nothing about the performer. */}
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                data-testid="rehearse-toggle"
                checked={rehearsing}
                disabled={readAloudMode}
                onChange={(e) => {
                  setRehearsing(e.target.checked);
                  // Leaving rehearsal offers the report; entering never does.
                  // `rehearsal.started` is what tells a real read apart from a
                  // toggle flipped twice by someone exploring the control.
                  if (!e.target.checked && rehearsal.started) setReport(rehearsal.snapshot());
                }}
              />
              <span className={readAloudMode ? "opacity-40" : undefined}>
                {t("editor-rehearse")}
              </span>
            </label>
            {/* The pace warning (FT-N05). Quiet — a line of text that appears,
                not a colour over the script the talent is reading. Its own
                component so its 20Hz clock re-renders one span rather than the
                whole operator window. */}
            {rehearsing && rehearsal.started && (
              <PaceWarning
                state={state}
                caesuras={caesuras}
                elapsedSec={rehearsal.elapsedSec}
                startReadSec={rehearsal.startReadSec}
              />
            )}
          </div>
        </section>

        {/* No "Preview" caption: a black scrolling script beside an editor does
            not need to be labelled as the preview. */}
        <section className="flex min-h-0 flex-col gap-2">
          <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-white/10">
            <TeleprompterScroller state={state} onSeek={seek} overrideOffset={scrollOverride} />
          </div>
          {/* The jump list (FT-M05) and musical time, over the scrubber they
              both refer to. Each appears only when it has something to say —
              markers when the script has any, the tempo readout when the
              operator is working to one. */}
          {(markers.length > 0 || tempoShown) && (
            <div className="flex items-center justify-between gap-2">
              <MarkerJump
                markers={markers}
                state={state}
                caesuras={caesuras}
                overrideOffset={scrollOverride}
                onSeek={seek}
              />
              <div className="flex-1" />
              {tempoShown && (
                <TempoReadout
                  state={state}
                  caesuras={caesuras}
                  bpm={displayBpm}
                  beatsPerBar={beatsPerBar}
                />
              )}
            </div>
          )}
          <TeleprompterSeekBar
            state={state}
            caesuras={caesuras}
            onSeek={seek}
            overrideOffset={scrollOverride}
            bars={tempoShown ? { bpm: displayBpm, beatsPerBar } : undefined}
            markers={markers}
          />
        </section>
      </main>

      {settings && (
        <SettingsDialog
          open={settingsOpen}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onApplied={onApplied}
          // Settings covers the surface the tour talks about, so replaying it
          // closes this dialog first rather than stacking on top of it.
          onReplayTour={() => {
            setSettingsOpen(false);
            setManualTour(true);
          }}
        />
      )}

      {/* Mounted only while open, like the update dialog below — so a replay
          from Settings is a fresh mount that starts at step one, and the app's
          60Hz read-aloud renders do not rebuild a tree nobody can see. */}
      {tourOpen && <TourDialog onClose={closeTour} />}

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

      {/* Document import (FT-M01). Creates a NEW script rather than replacing
          the open one — a file chooser is a mis-click away from destroying
          whatever is on screen, and `scripts_create` refuses to overwrite. */}
      <ImportDocument
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(name) => {
          setCurrentScript(name);
          setSaveError(null);
        }}
      />

      {/* Find & replace (FT-M07). Both edits go through the EDITOR's handle,
          not through `onScriptChange`: that is what puts a replacement on the
          undo stack as one step and lets it reach the engine, the projector and
          autosave by the same path a keystroke takes. */}
      <FindReplace
        open={findOpen}
        script={state.script}
        current={findMatch}
        onCurrent={setFindMatch}
        onReplace={(match, replacement) =>
          editor.current?.replaceRange(match.start, match.end, replacement)
        }
        onReplaceAll={(text) => editor.current?.setText(text)}
        onClose={() => setFindOpen(false)}
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

      <RehearsalReport
        open={report !== null}
        script={state.script}
        samples={report ?? []}
        caesuras={caesuras}
        skipWords={state.skipWords}
        speed={state.speed}
        onClose={() => setReport(null)}
        onApplySpeed={(next) => {
          void teleprompterSetSpeed(next).catch(() => undefined);
          setReport(null);
        }}
      />

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>,
    true,
  );
}
