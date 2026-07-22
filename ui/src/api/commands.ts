import { invoke } from "@tauri-apps/api/core";

import type {
  BugReport,
  BugReportTarget,
  EulaStatus,
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
