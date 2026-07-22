/**
 * The DTOs the Rust side serialises. Each mirrors a `#[derive(Serialize)]`
 * struct with `#[serde(rename_all = "camelCase")]`, so the field names here are
 * the camelCase ones that actually cross the IPC boundary.
 */

/** The reading typefaces the operator may pick (mirror of Rust `FONT_FAMILIES`).
 * Rust validates membership; `lib/fonts.ts` maps each id to a CSS stack. */
export type FontFamilyId = "system" | "sans" | "serif" | "mono" | "rounded" | "slab";

/** Mirror of `teleprompter::Look` — the reading appearance every surface shares. */
export type Look = {
  fontFamily: FontFamilyId;
  fontWeight: number;
  /** `#rrggbb` — the colour of script text that has not been read yet. */
  textColor: string;
  /** Horizontal margin per side, as a percentage of the stage width. */
  marginPct: number;
  lineHeight: number;
  /** Reading-guide position, as a percentage down the reading surface. */
  guidePct: number;
};

/** Mirror of `settings::Settings`. */
export type Settings = {
  /** BCP-47 tag, or `"auto"` to follow the OS. */
  language: string;
  theme: "dark" | "light";
  /** Scroll speed in visible characters per second. */
  speed: number;
  /** Reading font size in px. */
  fontSize: number;
  /** The default pause (seconds) a bare ` -- ` caesura uses. */
  caesuraSecs: number;
  /** Start-countdown pre-roll (seconds) before scrolling; 0 = off. */
  countdownSecs: number;
  /** Mirror the projector horizontally (beam-splitter glass). */
  mirror: boolean;
  /** Reading appearance (FT-15). */
  look: Look;
  /** Minimise to the system tray instead of the taskbar. Off by default; while
   * it is off no tray icon exists at all. */
  minimizeToTray: boolean;
  /** Serve the read-only LAN mirror (FT-12). Off by default. */
  lanEnabled: boolean;
  /** Bind the mirror to every interface instead of loopback only. */
  lanAllInterfaces: boolean;
  lanPort: number;
  /**
   * Recently-opened scripts (FT-10), most recent first; `[0]` is the script
   * currently open. Read-only from the UI's point of view for the same reason
   * as `acceptedEulaVersion` — Rust's `settings_set` preserves it, so a stale
   * draft cannot rewrite the library's history.
   */
  recentScripts: string[];
  /**
   * The EULA version the user accepted, if any. Read-only from the UI's point
   * of view: Rust's `settings_set` ignores whatever is sent here, so a stale
   * draft can never wipe acceptance. `eulaAccept()` is the only way to set it.
   */
  acceptedEulaVersion: string | null;
};

/** Mirror of `eula::EulaStatus`. */
export type EulaStatus = {
  version: string;
  /** The full agreement text (markdown). */
  text: string;
  /** Whether the user has already accepted this exact version. */
  accepted: boolean;
};

/** Mirror of `teleprompter::TeleprompterDto` — the shared scroll snapshot. */
export type TeleprompterState = {
  script: string;
  speed: number;
  fontSize: number;
  /** The shared reading appearance (FT-15). */
  look: Look;
  mirror: boolean;
  /** Current scroll offset in visible characters. */
  offset: number;
  playing: boolean;
  caesuraSecs: number;
  countdownSecs: number;
  /** Seconds remaining in the current start countdown (0 when not counting). */
  countdownRemaining: number;
};

/** Mirror of `bugreport::BugReport` — one target's report, built by Rust. */
export type BugReport = {
  /**
   * The report as plain text: exactly what the dialog shows and what "Copy
   * report" copies. The GitHub URL carries the same content as Markdown.
   */
  text: string;
  /**
   * The pre-filled URL that opens the report, already bounded for its target.
   * Opening it only fills a window in — the user still has to press send.
   */
  url: string;
};

/** Where a report is submitted. Each opens a pre-filled window, never sends. */
export type BugReportTarget = "github" | "gmail" | "email";

/** The actions `teleprompter_control` accepts. */
export type TeleprompterAction =
  | "play"
  | "pause"
  | "toggle"
  | "faster"
  | "slower"
  | "setSpeed"
  | "stepBack"
  | "stepForward"
  | "seek"
  | "top";

/** Mirror of `scripts::ScriptInfo` — one entry in the library (FT-10). */
export type ScriptInfo = {
  name: string;
  /** Size on disk in bytes (a file listing, not a character count). */
  bytes: number;
  /** Last-modified time in ms since the Unix epoch, or 0 if unknown. */
  modifiedMs: number;
};

/** Mirror of `projector::DisplayInfo` — one connected monitor (FT-12). */
export type DisplayInfo = {
  index: number;
  name: string;
  width: number;
  height: number;
  primary: boolean;
};

/** Mirror of `lanmirror::MirrorStatus` — what the LAN mirror is doing (FT-12). */
export type MirrorStatus = {
  running: boolean;
  /** The full URL to open (session key included), or null while it is off. */
  url: string | null;
  /** Why it is not running, when the user asked for it to be. */
  error: string | null;
};
