import { invoke } from "@tauri-apps/api/core";

import type {
  BugReport,
  BugReportTarget,
  DisplayInfo,
  EulaStatus,
  MirrorStatus,
  ScriptInfo,
  Settings,
  TeleprompterAction,
  TeleprompterState,
} from "./types";

/**
 * Every Tauri command the UI calls, in one typed place — so a renamed command
 * is one compile error here instead of a runtime failure in whichever panel
 * happened to call it.
 *
 * The Playwright gallery stubs `window.__TAURI_INTERNALS__.invoke`, which is
 * what `invoke` calls underneath, so these all work unchanged in the visual
 * smoke without a mock layer of their own.
 */

export const settingsGet = (): Promise<Settings> => invoke("settings_get");

/** Apply a settings draft. `acceptedEulaVersion` is ignored by the backend. */
export const settingsSet = (next: Settings): Promise<void> => invoke("settings_set", { next });

export const eulaStatus = (): Promise<EulaStatus> => invoke("eula_status");

export const eulaAccept = (): Promise<void> => invoke("eula_accept");

export const teleprompterGet = (): Promise<TeleprompterState> => invoke("teleprompter_get");

export const teleprompterSetScript = (text: string): Promise<void> =>
  invoke("teleprompter_set_script", { text });

export const teleprompterSetSpeed = (speed: number): Promise<void> =>
  invoke("teleprompter_set_speed", { speed });

export const teleprompterSetFont = (size: number): Promise<void> =>
  invoke("teleprompter_set_font", { size });

export const teleprompterSetMirror = (mirror: boolean): Promise<void> =>
  invoke("teleprompter_set_mirror", { mirror });

export const teleprompterSetCaesura = (secs: number): Promise<void> =>
  invoke("teleprompter_set_caesura", { secs });

export const teleprompterSetCountdown = (secs: number): Promise<void> =>
  invoke("teleprompter_set_countdown", { secs });

export const teleprompterControl = (action: TeleprompterAction, value?: number): Promise<void> =>
  invoke("teleprompter_control", { action, value });

// -- the script library (FT-10) ----------------------------------------------

export const scriptsList = (): Promise<ScriptInfo[]> => invoke("scripts_list");

/**
 * Open a script: Rust reads it, loads it into the shared engine, and marks it
 * as current — one command, because those three have to happen together.
 * Resolves with the script's text.
 */
export const scriptsOpen = (name: string): Promise<string> => invoke("scripts_open", { name });

/** Autosave: write the editor's text into the named script file. */
export const scriptsSave = (name: string, text: string): Promise<void> =>
  invoke("scripts_save", { name, text });

export const scriptsCreate = (name: string): Promise<void> => invoke("scripts_create", { name });

export const scriptsRename = (from: string, to: string): Promise<void> =>
  invoke("scripts_rename", { from, to });

export const scriptsDelete = (name: string): Promise<void> => invoke("scripts_delete", { name });

// -- the projector + LAN mirror (FT-12) --------------------------------------

export const listDisplays = (): Promise<DisplayInfo[]> => invoke("list_displays");

/** Open (or focus) the projector window. `display` indexes `listDisplays()`;
 * `fill` covers that monitor edge to edge. */
export const projectorOpen = (
  title: string,
  display: number | null,
  fill: boolean,
): Promise<void> => invoke("projector_open", { title, display, fill });

export const projectorClose = (): Promise<void> => invoke("projector_close");

export const lanMirrorStatus = (): Promise<MirrorStatus> => invoke("lan_mirror_status");

/**
 * Open the mirror in this machine's browser. Takes no argument on purpose —
 * Rust rebuilds the URL from the running listener, so `openUrl`'s
 * https/mailto allowlist (which exists to distrust URLs from the webview) does
 * not need widening to plain `http:`.
 */
export const lanMirrorOpen = (): Promise<void> => invoke("lan_mirror_open");

// -- read-aloud (FT-16) ------------------------------------------------------

/**
 * The Linux speech fallback. Windows and macOS speak through the WebView's own
 * `speechSynthesis`; this rejects everywhere but Linux on purpose, so a caller
 * that reached it by mistake falls back rather than going silently quiet.
 */
export const ttsSpeakNative = (text: string, rate: number): Promise<void> =>
  invoke("tts_speak", { text, rate });

export const ttsStopNative = (): Promise<void> => invoke("tts_stop");

/** The scrubbed crash report from the previous run, or `null` after a clean one. */
export const bugReportPending = (): Promise<string | null> => invoke("bug_report_pending");

/**
 * Build the report for one target. Builds only — opening the returned URL is a
 * second, explicit step, so nothing can leave the machine by accident.
 */
export const bugReportBuild = (target: BugReportTarget, description: string): Promise<BugReport> =>
  invoke("bug_report_build", { target, description });

/** Delete the pending crash report(s) — the user dismissed or sent them. */
export const bugReportClearCrash = (): Promise<void> => invoke("bug_report_clear_crash");

/**
 * Hand a URL to the OS default handler. Rust allowlists `https:`/`mailto:` and
 * refuses control characters; the webview never opens a link by itself.
 */
export const openUrl = (url: string): Promise<void> => invoke("open_url", { url });
