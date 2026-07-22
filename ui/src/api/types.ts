/**
 * The DTOs the Rust side serialises. Each mirrors a `#[derive(Serialize)]`
 * struct with `#[serde(rename_all = "camelCase")]`, so the field names here are
 * the camelCase ones that actually cross the IPC boundary.
 */

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
