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
  /** Offer ghost-text autocomplete while editing (FT-20/FT-21). On by default —
   * it is a lookup against bundled tables, never a network call. */
  autocomplete: boolean;
  /** Which language's table the editor completes against: a BCP-47 tag, or
   * `"auto"` to follow the UI language. Deliberately separate from `language`;
   * operators often run the app in one language and write in another. */
  autocompleteLanguage: string;
  /** Hands-free voice commands (FT-31). Off by default; the mic opens only while
   * listening. This is a normal preference — unlike `recentScripts`, the Settings
   * draft MUST round-trip it, or an Apply resets it. */
  voiceEnabled: boolean;
  /** When the app listens: `"push_to_talk"` (only while the talk button is held)
   * or `"always"` (continuously while enabled). */
  voiceMode: "push_to_talk" | "always";
  /** Voice-following (FT-35): auto-scroll by recognising the script's own words.
   * Off by default; only usable when the Vosk model is present (see
   * `speechCapability`). A normal preference — the Settings draft must round-trip
   * it. */
  voiceFollowEnabled: boolean;
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
  /** Halt AND rewind to the top — what a Stop button means. Distinct from
   * `pause`, which freezes in place. */
  | "stop"
  | "toggle"
  | "faster"
  | "slower"
  | "setSpeed"
  | "stepBack"
  | "stepForward"
  | "seek"
  | "top";

/** Mirror of `voice::CommandInfo` — one trained command and its take count. */
export type VoiceCommandInfo = {
  /** The command id (also the transport action it fires). */
  id: string;
  /** How many recordings of it the model holds. */
  takes: number;
};

/** Mirror of `voice::VoiceSummary` — the trained model as the UI sees it. */
export type VoiceSummary = {
  commands: VoiceCommandInfo[];
  /** Whether the microphone is currently open. */
  listening: boolean;
};

/** Payload of the `voice:command` event — a recognised command. */
export type VoiceCommandEvent = {
  /** The recognised command id (a transport action). */
  commandId: string;
  /** Match confidence in `[0, 1]`. */
  confidence: number;
};

/** Mirror of `speech::SpeechCapabilityDto` — whether voice-following can run. */
export type SpeechCapability = {
  /** Usable right now: the Vosk engine is built in AND its model is installed. */
  available: boolean;
  /** The engine name (`"vosk"`, or `"none"` when not built in). */
  engine: string;
  /** A human-readable reason, shown when unavailable. */
  detail: string;
};

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
