/**
 * The binding table — one answer to "what can drive the prompter" (FT-M04,
 * FT-M13, FT-M16).
 *
 * Three roadmap items share this file because they are three consumers of one
 * table, not three features. A rebindable shortcut map whose bindings only work
 * while the window is focused is half a feature; a foot pedal is a third input
 * into the same rows. So: one command vocabulary, one accelerator format, two
 * scopes.
 *
 * # The accelerator format is Tauri's, deliberately
 *
 * An accelerator is a `+`-joined string — `Space`, `Control+Shift+KeyP`,
 * `F13` — and its key part is a **W3C `KeyboardEvent.code`**. That is not a
 * convention invented here: `global-hotkey`'s `parse_key` upper-cases its token
 * and matches `KEYA` / `SPACE` / `ARROWUP` / `PAGEDOWN` / `F13` / `NUMPAD0`,
 * which are exactly the `code` values a browser reports. The same string can
 * therefore be matched against a `keydown` in the webview **and** handed to the
 * OS for a global registration, with nothing translating between them.
 *
 * That is the whole reason this is one table and not two that drift.
 *
 * ⚠️ **`code`, not `key`.** `code` is the physical key: it survives a Dvorak
 * layout, a French keyboard, and — the case that matters here — a foot pedal,
 * which is a keyboard that types one thing forever. Binding `key` would make a
 * pedal's button mean something different the moment the operator's layout
 * changed.
 *
 * # ⚠️ [`SUPPORTED_CODES`] mirrors a table in a crate we do not own
 *
 * Every code here appears in `global-hotkey`'s `parse_key`. A code outside it
 * would bind window-scoped, look fine, and then fail to register globally — a
 * key that works until the operator alt-tabs, which is worse than one that
 * never worked. So capture rejects anything not on the list, and
 * `shortcuts.rs::apply` reports per-accelerator registration failures on top of
 * that: validated on the way in, and never silent on the way out.
 * `src-tauri/src/shortcuts.rs`'s tests parse the shipped defaults through the
 * real parser, so the mirror cannot rot unnoticed.
 */

import type { TeleprompterAction } from "../api/types";

/** Every command an input can drive. Stable ids: they are persisted. */
export type CommandId =
  | "playPause"
  | "stop"
  | "top"
  | "faster"
  | "slower"
  | "stepBack"
  | "stepForward"
  | "nextMarker"
  | "prevMarker"
  | "find";

/** A `+`-joined accelerator — `Space`, `Control+KeyF`, `F13`. */
export type Accelerator = string;

/**
 * One command's two bindings.
 *
 * `window` fires while the app has focus; `global` is registered with the OS
 * and fires wherever the operator is. Separate strings rather than one string
 * and a flag, because the good answer differs per scope: `Space` is right in
 * the window and hostile as a global (it would swallow the space bar in every
 * other app on the machine).
 */
export type Binding = {
  window: Accelerator | null;
  global: Accelerator | null;
};

/** The persisted table: command id → its bindings. */
export type Bindings = Partial<Record<CommandId, Binding>>;

/** What a command is, for the map UI and the dispatcher. */
export type CommandSpec = {
  id: CommandId;
  /** i18n key for its name. */
  label: string;
  /**
   * Whether holding the key should repeat it. True for the ones an operator
   * holds — nudging the speed, stepping through a line — and false for the
   * toggles, where auto-repeat would fire play/pause dozens of times a second
   * for as long as a pedal stayed down.
   */
  repeatable: boolean;
  /**
   * Whether this command can be bound globally at all.
   *
   * False for `find`, which opens a dialog: a global hotkey that opened a
   * dialog in a window the operator cannot see would be a keystroke that
   * appears to do nothing.
   */
  globalCapable: boolean;
  /**
   * The engine action this command **is**, where it is exactly one.
   *
   * Absent for the three that need something only the operator window has:
   * `nextMarker`/`prevMarker` need the marker list and the live offset, and
   * `find` opens a dialog. Present for the rest — which is what lets the
   * projector dispatch from the table instead of keeping its own `switch`, and
   * what stops the two surfaces answering the same key differently. That pair
   * already drifted once in Freally Capture; see `Transport.tsx`.
   */
  action?: TeleprompterAction;
};

/**
 * The command vocabulary, in the order the map lists them — transport first,
 * because that is what a pedal is for.
 */
export const COMMANDS: readonly CommandSpec[] = [
  // `playPause` is the one non-identity mapping: the engine calls it `toggle`.
  {
    id: "playPause",
    label: "cmd-play-pause",
    repeatable: false,
    globalCapable: true,
    action: "toggle",
  },
  { id: "stop", label: "cmd-stop", repeatable: false, globalCapable: true, action: "stop" },
  { id: "top", label: "cmd-top", repeatable: false, globalCapable: true, action: "top" },
  { id: "faster", label: "cmd-faster", repeatable: true, globalCapable: true, action: "faster" },
  { id: "slower", label: "cmd-slower", repeatable: true, globalCapable: true, action: "slower" },
  {
    id: "stepBack",
    label: "cmd-step-back",
    repeatable: true,
    globalCapable: true,
    action: "stepBack",
  },
  {
    id: "stepForward",
    label: "cmd-step-forward",
    repeatable: true,
    globalCapable: true,
    action: "stepForward",
  },
  // No `action`: these three need the marker list, the live offset, or a dialog.
  { id: "nextMarker", label: "cmd-next-marker", repeatable: false, globalCapable: true },
  { id: "prevMarker", label: "cmd-prev-marker", repeatable: false, globalCapable: true },
  { id: "find", label: "cmd-find", repeatable: false, globalCapable: false },
];

/** The commands that are exactly one engine action — what a surface with no
 * marker list and no dialogs (the projector) can answer. */
export const ENGINE_COMMANDS: readonly CommandId[] = COMMANDS.filter((spec) => spec.action).map(
  (spec) => spec.id,
);

/**
 * The legal command ids, for checking a value that crossed a process boundary.
 * A global hotkey's payload comes from Rust, so it is validated rather than
 * cast — a registration left over from an older build would otherwise walk
 * straight into the dispatcher.
 */
export const COMMAND_IDS: ReadonlySet<string> = new Set(COMMANDS.map((spec) => spec.id));

/** By id, for the dispatcher's per-event lookup. */
const SPEC = new Map(COMMANDS.map((spec) => [spec.id, spec]));

export function commandSpec(id: CommandId): CommandSpec | undefined {
  return SPEC.get(id);
}

/**
 * The shipped bindings.
 *
 * ⚠️ **Every `global` is null, and that is the default on purpose.** Registering
 * an OS-level hotkey takes that key away from every other application on the
 * machine; an app that did so uninvited on first run would be a bug report. The
 * map (FT-M16) is where an operator opts in, one command at a time.
 *
 * The window bindings are the keys the projector already answered to before
 * this table existed, so an operator's hands do not have to relearn anything —
 * `Projector.tsx` used to hold them as a hard-coded `switch`.
 */
export const DEFAULT_BINDINGS: Readonly<Record<CommandId, Binding>> = {
  playPause: { window: "Space", global: null },
  stop: { window: "CommandOrControl+Period", global: null },
  top: { window: "Home", global: null },
  faster: { window: "ArrowUp", global: null },
  slower: { window: "ArrowDown", global: null },
  stepBack: { window: "ArrowLeft", global: null },
  stepForward: { window: "ArrowRight", global: null },
  nextMarker: { window: "PageDown", global: null },
  prevMarker: { window: "PageUp", global: null },
  find: { window: "CommandOrControl+KeyF", global: null },
};

/**
 * The physical keys that can be bound — the mirror of `global-hotkey`'s
 * `parse_key`, as W3C `code` values. See the module note.
 */
export const SUPPORTED_CODES: ReadonlySet<string> = new Set([
  // Punctuation and the character rows.
  "Backquote",
  "Backslash",
  "BracketLeft",
  "BracketRight",
  "Comma",
  "Equal",
  "Minus",
  "Period",
  "Quote",
  "Semicolon",
  "Slash",
  ...Array.from({ length: 10 }, (_, i) => `Digit${i}`),
  ...Array.from({ length: 26 }, (_, i) => `Key${String.fromCharCode(65 + i)}`),
  // Editing and navigation.
  "Backspace",
  "CapsLock",
  "Delete",
  "End",
  "Enter",
  "Home",
  "Insert",
  "PageDown",
  "PageUp",
  "Pause",
  "PrintScreen",
  "ScrollLock",
  "Space",
  "Tab",
  // ⚠️ `Escape` is deliberately ABSENT, and this is a subtraction from the
  // mirror rather than an omission from it — `global-hotkey` parses it happily.
  // Escape is the app's universal "get me out of here": `ModalShell` closes the
  // topmost dialog with it, the projector closes its window with it, and the
  // capture in `Shortcuts.tsx` cancels with it. Leaving it bindable meant a
  // hand-edited settings file could put a transport command on it, and the two
  // windows would then DISAGREE — the operator window would fire the command
  // while the projector returned early and closed instead. Keeping it out of
  // the vocabulary is what makes the carve-out a property of the table rather
  // than an `if` each consumer has to remember. Do not "restore" it.
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  // The numeric keypad — a pedal or remote often reports as one.
  "NumLock",
  ...Array.from({ length: 10 }, (_, i) => `Numpad${i}`),
  "NumpadAdd",
  "NumpadDecimal",
  "NumpadDivide",
  "NumpadEnter",
  "NumpadEqual",
  "NumpadMultiply",
  "NumpadSubtract",
  // F1–F24. F13 and up matter more than they look: they are what a presenter
  // remote or a programmable pedal is usually set to send, precisely because
  // nothing else on the machine uses them.
  ...Array.from({ length: 24 }, (_, i) => `F${i + 1}`),
  // Media keys, which is what some Bluetooth remotes actually emit.
  "AudioVolumeDown",
  "AudioVolumeMute",
  "AudioVolumeUp",
  "MediaPlayPause",
  "MediaStop",
  "MediaTrackNext",
  "MediaTrackPrevious",
]);

/** Modifier tokens, in the one order a canonical accelerator writes them. */
const MOD_ORDER = ["CommandOrControl", "Control", "Alt", "Shift", "Super"] as const;
type Mod = (typeof MOD_ORDER)[number];

/** Is this browser on a Mac? `CommandOrControl` resolves against it. */
export function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/** An accelerator split into its parts, or null if it is not one. */
export type ParsedAccelerator = { mods: Mod[]; code: string };

/** Lowercased modifier names, so the parse below compares against constants
 * rather than re-lowercasing five compile-time strings per token. */
const MOD_LOWER = MOD_ORDER.map((mod) => mod.toLowerCase());

/**
 * Every accelerator ever parsed, by its exact text.
 *
 * `commandFor` runs on **every keydown**, including every character typed into
 * the script, and walks the command list re-parsing each binding until one
 * matches — then `matchesAccelerator` and `firesInTextEntry` each parse the
 * winner again. The set of distinct strings is tiny and bounded (ten commands,
 * two scopes), so caching the parse turns ~11 string-splitting passes per
 * keystroke into eleven map lookups.
 *
 * Unbounded growth is not a risk: the only strings reaching here come from the
 * command table and from `settings.bindings`, which Rust caps at 64 entries.
 */
const PARSE_CACHE = new Map<string, ParsedAccelerator | null>();

/**
 * Parse an accelerator. Null for anything malformed — an unknown modifier, an
 * unsupported key, no key at all, or two keys.
 *
 * Deliberately strict: this is what stands between a hand-edited settings file
 * and a binding the OS will refuse.
 */
export function parseAccelerator(accel: string): ParsedAccelerator | null {
  if (typeof accel !== "string" || accel.length === 0) return null;
  const cached = PARSE_CACHE.get(accel);
  // `undefined` is "not seen yet"; a cached `null` is a real answer, so the
  // `has` check matters — otherwise every malformed string re-parses forever.
  if (cached !== undefined || PARSE_CACHE.has(accel)) return cached ?? null;
  const parsed = parseUncached(accel);
  PARSE_CACHE.set(accel, parsed);
  return parsed;
}

function parseUncached(accel: string): ParsedAccelerator | null {
  const mods: Mod[] = [];
  let code: string | null = null;
  for (const raw of accel.split("+")) {
    const token = raw.trim();
    if (token.length === 0) return null;
    const lower = token.toLowerCase();
    const mod = MOD_ORDER[MOD_LOWER.indexOf(lower)];
    if (mod) {
      // A modifier after the key is the wrong order, and a repeat is a typo.
      if (code !== null || mods.includes(mod)) return null;
      mods.push(mod);
      continue;
    }
    if (code !== null) return null;
    if (!SUPPORTED_CODES.has(token)) return null;
    code = token;
  }
  if (code === null) return null;
  // `Control` and `CommandOrControl` are the same physical key off macOS, so an
  // accelerator naming both is not something any capture can produce and not
  // something the OS could match.
  if (mods.includes("Control") && mods.includes("CommandOrControl")) return null;
  return { mods: MOD_ORDER.filter((m) => mods.includes(m)), code };
}

/** Whether a string is a legal accelerator. */
export function isAccelerator(accel: string): boolean {
  return parseAccelerator(accel) !== null;
}

/** Canonical text for parsed parts — modifiers in [`MOD_ORDER`], then the key. */
function join(parsed: ParsedAccelerator): Accelerator {
  return [...parsed.mods, parsed.code].join("+");
}

/**
 * The physical keystroke an accelerator names, as a comparable string.
 *
 * `CommandOrControl` is resolved against the platform, so the two spellings of
 * one keystroke — the shipped defaults' portable form and the concrete form a
 * capture produces — compare equal. Two accelerators are the same key if and
 * only if this is the same string.
 */
function physicalKey(accel: string, mac: boolean): string {
  const parsed = parseAccelerator(accel);
  if (!parsed) return accel;
  const mods = new Set<string>();
  for (const mod of parsed.mods) {
    if (mod === "CommandOrControl") mods.add(mac ? "Super" : "Control");
    else mods.add(mod);
  }
  return [...MOD_ORDER.filter((m) => mods.has(m)), parsed.code].join("+");
}

/**
 * The accelerator a keystroke represents, or null if it cannot be one.
 *
 * This is the whole of "learn a button" (FT-M04): a pedal is a keyboard, so
 * pressing it lands here like any other key and its accelerator falls out.
 *
 * Null when:
 * - the key is only a modifier (`Control` on its own is not a binding, and a
 *   capture that accepted it would bind the instant the operator reached for a
 *   combination);
 * - the browser reports no `code` (synthetic events, and some IME paths);
 * - the key is not one the OS registration can take — see [`SUPPORTED_CODES`].
 */
export function acceleratorFor(event: {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}): Accelerator | null {
  const code = event.code;
  if (!code || !SUPPORTED_CODES.has(code)) return null;
  const mods: Mod[] = [];
  if (event.ctrlKey) mods.push("Control");
  if (event.altKey) mods.push("Alt");
  if (event.shiftKey) mods.push("Shift");
  if (event.metaKey) mods.push("Super");
  // Already pushed in `MOD_ORDER` order, so no re-sort is needed here — unlike
  // `parseAccelerator`, which accepts whatever order the text was written in.
  return join({ mods, code });
}

/**
 * Does this keystroke match `accel`?
 *
 * Modifiers must match **exactly** — `Space` does not fire on `Ctrl+Space`.
 * Anything looser and a binding would swallow every combination built on top
 * of it, including ones another surface has claimed.
 */
export function matchesAccelerator(
  event: {
    code: string;
    key?: string;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
  },
  accel: string,
  mac = isMac(),
): boolean {
  const parsed = parseAccelerator(accel);
  if (!parsed || !sameKey(parsed.code, event)) return false;
  // `CommandOrControl` is Command on macOS and Control everywhere else — the
  // same resolution `global-hotkey` compiles in, so the two scopes agree.
  const wantCtrl =
    parsed.mods.includes("Control") || (!mac && parsed.mods.includes("CommandOrControl"));
  const wantSuper =
    parsed.mods.includes("Super") || (mac && parsed.mods.includes("CommandOrControl"));
  return (
    wantCtrl === event.ctrlKey &&
    wantSuper === event.metaKey &&
    parsed.mods.includes("Alt") === event.altKey &&
    parsed.mods.includes("Shift") === event.shiftKey
  );
}

/**
 * Does this keystroke press the key `code` names?
 *
 * By physical position, and — for the **letter** keys only — also by the letter
 * printed on it.
 *
 * ⚠️ The dual test is what keeps `Ctrl+F` working on Dvorak and Colemak. A
 * pedal must be matched by position, because it is a keyboard that types one
 * thing forever and the operator's layout must not move it; but a person
 * pressing "Ctrl and the F key" means the key that types **f**, wherever their
 * layout put it. Position-only sent Ctrl+F to `KeyY` on Dvorak, so Find never
 * opened AND `preventDefault` never ran — which let the WebView's own find bar
 * open over the app and search the rendered page instead.
 *
 * Restricted to `Key*` because those are the only codes whose meaning moves
 * with the layout: digits, arrows, F13 and the numpad are the same key
 * everywhere, and matching those on `key` would let Shift+1 answer a `Digit1`
 * binding.
 */
function sameKey(code: string, event: { code: string; key?: string }): boolean {
  if (event.code === code) return true;
  if (!code.startsWith("Key")) return false;
  const letter = code.slice(3).toLowerCase();
  // Only where the event's own code is ALSO a letter key: that keeps a numpad
  // or media key that happens to produce a letter from answering.
  return event.code.startsWith("Key") && event.key?.toLowerCase() === letter;
}

/**
 * Readable text for an accelerator — `Ctrl + Shift + P`, `↑`, `Space`.
 *
 * The key names are not translated, and that is a decision rather than an
 * omission: `F13`, `A` and `↑` are what is printed on the key in every locale
 * this app ships, and a "translated" key name would be a name the operator
 * cannot find on their keyboard. The chrome around the map is localised
 * normally.
 */
export function formatAccelerator(accel: string, mac = isMac()): string {
  const parsed = parseAccelerator(accel);
  if (!parsed) return accel;
  const parts = parsed.mods.map((mod) => {
    switch (mod) {
      case "CommandOrControl":
        return mac ? "⌘" : "Ctrl";
      case "Control":
        return mac ? "⌃" : "Ctrl";
      case "Alt":
        return mac ? "⌥" : "Alt";
      case "Shift":
        return mac ? "⇧" : "Shift";
      case "Super":
        return mac ? "⌘" : "Win";
    }
  });
  return [...parts, formatCode(parsed.code)].join(" + ");
}

/** The readable name of one physical key. */
function formatCode(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6) || "pad"}`;
  const named: Record<string, string> = {
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Backquote: "`",
    Backslash: "\\",
    BracketLeft: "[",
    BracketRight: "]",
    Comma: ",",
    Equal: "=",
    Minus: "-",
    Period: ".",
    Quote: "'",
    Semicolon: ";",
    Slash: "/",
    PageDown: "Page Down",
    PageUp: "Page Up",
    PrintScreen: "Print Screen",
    CapsLock: "Caps Lock",
    NumLock: "Num Lock",
    ScrollLock: "Scroll Lock",
  };
  return named[code] ?? code;
}

/**
 * The table an operator's settings actually produce: the defaults, with their
 * own overrides on top, and anything unparseable dropped.
 *
 * Dropping rather than repairing is the safe direction. A binding that cannot
 * be parsed cannot be matched either, so keeping it would put a row in the map
 * that displays a key which does nothing; falling back to the default at least
 * leaves a working command, and the map shows what it actually is.
 */
export function resolveBindings(
  /** Keyed by string rather than `CommandId`: this is what came off disk, so
   * it may name a command this build does not have. */
  stored: Readonly<Record<string, Binding | undefined>> | null | undefined,
): Record<CommandId, Binding> {
  const out = {} as Record<CommandId, Binding>;
  for (const spec of COMMANDS) {
    const fallback = DEFAULT_BINDINGS[spec.id];
    const override = stored?.[spec.id];
    if (!override) {
      out[spec.id] = { ...fallback };
      continue;
    }
    // `null` is a real value here — it is how the map records "unbound" — so
    // only an *absent* key falls back, and an illegal string is dropped to null
    // rather than quietly reinstating a default the operator had cleared.
    const win = override.window === undefined ? fallback.window : override.window;
    const glob = override.global === undefined ? fallback.global : override.global;
    out[spec.id] = {
      window: win && isAccelerator(win) ? win : null,
      global: spec.globalCapable && glob && isAccelerator(glob) ? glob : null,
    };
  }
  return out;
}

/**
 * Which commands share an accelerator, per scope.
 *
 * Returned as a map from command to the *others* it collides with, because that
 * is what a row in the map has to show: this binding is also X's.
 */
export function conflicts(
  bindings: Record<CommandId, Binding>,
  scope: "window" | "global",
  mac = isMac(),
): Partial<Record<CommandId, CommandId[]>> {
  const byAccel = new Map<Accelerator, CommandId[]>();
  for (const spec of COMMANDS) {
    const accel = bindings[spec.id]?.[scope];
    if (!accel) continue;
    // ⚠️ Bucketed by the PHYSICAL keystroke, not by the stored text. A capture
    // writes `Control+KeyF` (or `Super+KeyF` on macOS) while the shipped
    // default says `CommandOrControl+KeyF` — the same keys under the same
    // fingers, and two different strings. Comparing the text meant rebinding
    // Stop to Ctrl+F raised no conflict, both rows displayed "Ctrl + F", and
    // `commandFor` then gave the key to whichever command came first in the
    // table — silently making Find unreachable.
    const list = byAccel.get(physicalKey(accel, mac));
    if (list) list.push(spec.id);
    else byAccel.set(physicalKey(accel, mac), [spec.id]);
  }
  const out: Partial<Record<CommandId, CommandId[]>> = {};
  for (const ids of byAccel.values()) {
    if (ids.length < 2) continue;
    for (const id of ids) out[id] = ids.filter((other) => other !== id);
  }
  return out;
}

/**
 * Is the keystroke going into somewhere text is typed?
 *
 * ⚠️ This is what stops the space bar toggling playback while the operator is
 * writing a script. The editor is a `contenteditable`, so the check has to
 * cover that as well as `<input>` and `<textarea>` — and a bare `Space`,
 * `ArrowUp` or `Home` binding is exactly the shape that would otherwise make
 * the editor unusable.
 *
 * Structural rather than `instanceof HTMLElement`: the same element can come
 * from another realm (an iframe, and jsdom in the unit tests), where the
 * `instanceof` silently answers false and the guard would let every keystroke
 * through.
 *
 * `<button>` is deliberately **outside** the guard, and it was weighed: closing
 * a dialog returns focus to the button that opened it, so treating buttons as
 * text entry would mean a bare Space re-opened that dialog instead of starting
 * the read — the worse outcome for a prompter.
 */
export function isTextEntry(target: unknown): boolean {
  const el = target as { tagName?: unknown; isContentEditable?: unknown } | null;
  if (!el || typeof el.tagName !== "string") return false;
  if (el.isContentEditable === true) return true;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

/**
 * Whether a binding is allowed to fire from inside a text-entry surface.
 *
 * Only combinations carrying a modifier other than Shift: `Ctrl+F` while
 * writing is a find, `Space` while writing is a space, and `Shift+Space` is
 * still a space. Shift does not count because it is how capital letters are
 * typed, so treating it as an escape would take a third of the keyboard away
 * from the editor.
 */
export function firesInTextEntry(accel: string): boolean {
  const parsed = parseAccelerator(accel);
  if (!parsed) return false;
  return parsed.mods.some((mod) => mod !== "Shift");
}

/**
 * The command a keystroke should run, or null.
 *
 * The one place a `keydown` becomes a command, shared by the operator window
 * and the projector so the two can never answer the same key differently.
 */
export function commandFor(
  event: {
    code: string;
    key?: string;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    repeat?: boolean;
    target?: unknown;
  },
  bindings: Record<CommandId, Binding>,
  options: { only?: readonly CommandId[]; mac?: boolean } = {},
): CommandId | null {
  const mac = options.mac ?? isMac();
  const inText = isTextEntry(event.target);
  for (const spec of COMMANDS) {
    if (options.only && !options.only.includes(spec.id)) continue;
    const accel = bindings[spec.id]?.window;
    if (!accel) continue;
    if (!matchesAccelerator(event, accel, mac)) continue;
    if (inText && !firesInTextEntry(accel)) continue;
    if (event.repeat && !spec.repeatable) continue;
    return spec.id;
  }
  return null;
}
