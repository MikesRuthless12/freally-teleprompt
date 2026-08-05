import { describe, expect, it } from "vitest";

import {
  COMMANDS,
  DEFAULT_BINDINGS,
  type Binding,
  type CommandId,
  acceleratorFor,
  commandFor,
  conflicts,
  firesInTextEntry,
  formatAccelerator,
  isAccelerator,
  isTextEntry,
  matchesAccelerator,
  parseAccelerator,
  resolveBindings,
} from "../bindings";

/** A `keydown` as the dispatcher reads one. */
function press(
  code: string,
  mods: Partial<{
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
    repeat: boolean;
    target: unknown;
  }> = {},
) {
  return {
    code,
    ctrlKey: mods.ctrl ?? false,
    altKey: mods.alt ?? false,
    shiftKey: mods.shift ?? false,
    metaKey: mods.meta ?? false,
    repeat: mods.repeat ?? false,
    target: mods.target,
  };
}

/** The binding table (FT-M04 / FT-M13 / FT-M16). */
describe("accelerators", () => {
  it("reads a keystroke as a Tauri accelerator", () => {
    expect(acceleratorFor(press("KeyF", { ctrl: true }))).toBe("Control+KeyF");
    expect(acceleratorFor(press("Space"))).toBe("Space");
    expect(acceleratorFor(press("F13"))).toBe("F13");
    expect(acceleratorFor(press("ArrowUp", { shift: true, alt: true }))).toBe("Alt+Shift+ArrowUp");
  });

  /** Canonical order, so the same combination is one string however it was
   * typed — otherwise conflict detection compares two spellings of one key and
   * finds no conflict. */
  it("always writes modifiers in the same order", () => {
    const all = acceleratorFor(press("KeyP", { meta: true, shift: true, alt: true, ctrl: true }));
    expect(all).toBe("Control+Alt+Shift+Super+KeyP");
  });

  /**
   * ⚠️ A modifier on its own is not a binding. Capturing one would bind the
   * instant the operator reached for a combination — they press Control, and
   * the map has already recorded "Control" and stopped listening.
   */
  it("refuses a modifier pressed on its own", () => {
    expect(acceleratorFor(press("ControlLeft", { ctrl: true }))).toBeNull();
    expect(acceleratorFor(press("ShiftRight", { shift: true }))).toBeNull();
    expect(acceleratorFor(press("MetaLeft", { meta: true }))).toBeNull();
  });

  /** A synthetic or IME-path event can carry no `code` at all. */
  it("refuses a keystroke with no physical key", () => {
    expect(acceleratorFor(press(""))).toBeNull();
  });

  /**
   * ⚠️ The mirror of `global-hotkey`'s `parse_key`. A code outside it would
   * bind window-scoped, look fine, and fail to register globally — a key that
   * stops working the moment the operator alt-tabs.
   */
  it("refuses a key the OS registration could not take", () => {
    expect(acceleratorFor(press("ContextMenu"))).toBeNull();
    expect(acceleratorFor(press("IntlBackslash"))).toBeNull();
    expect(acceleratorFor(press("Lang1"))).toBeNull();
  });

  it("parses and rejects", () => {
    expect(parseAccelerator("Control+Shift+KeyP")).toEqual({
      mods: ["Control", "Shift"],
      code: "KeyP",
    });
    expect(parseAccelerator("Space")).toEqual({ mods: [], code: "Space" });
    // No key at all, two keys, a repeat, the wrong order, an empty token.
    expect(parseAccelerator("Control")).toBeNull();
    expect(parseAccelerator("Control+KeyA+KeyB")).toBeNull();
    expect(parseAccelerator("Shift+Shift+KeyA")).toBeNull();
    expect(parseAccelerator("KeyA+Control")).toBeNull();
    expect(parseAccelerator("Control++KeyA")).toBeNull();
    expect(parseAccelerator("")).toBeNull();
    // `Control` and `CommandOrControl` are the same key off macOS.
    expect(parseAccelerator("Control+CommandOrControl+KeyA")).toBeNull();
  });

  /** Modifiers match exactly: a bare binding must not swallow every
   * combination built on top of it. */
  it("matches modifiers exactly", () => {
    expect(matchesAccelerator(press("Space"), "Space", false)).toBe(true);
    expect(matchesAccelerator(press("Space", { ctrl: true }), "Space", false)).toBe(false);
    expect(matchesAccelerator(press("KeyF", { ctrl: true }), "Control+KeyF", false)).toBe(true);
    expect(
      matchesAccelerator(press("KeyF", { ctrl: true, shift: true }), "Control+KeyF", false),
    ).toBe(false);
  });

  /**
   * `CommandOrControl` resolves to Command on macOS and Control elsewhere —
   * the same compile-time resolution `global-hotkey` makes, which is what keeps
   * the window scope and the global scope answering the same key.
   */
  it("resolves CommandOrControl per platform", () => {
    expect(matchesAccelerator(press("KeyF", { ctrl: true }), "CommandOrControl+KeyF", false)).toBe(
      true,
    );
    expect(matchesAccelerator(press("KeyF", { meta: true }), "CommandOrControl+KeyF", false)).toBe(
      false,
    );
    expect(matchesAccelerator(press("KeyF", { meta: true }), "CommandOrControl+KeyF", true)).toBe(
      true,
    );
    expect(matchesAccelerator(press("KeyF", { ctrl: true }), "CommandOrControl+KeyF", true)).toBe(
      false,
    );
  });

  /**
   * ⚠️ A letter binding follows the LETTER, not the key position.
   *
   * On Dvorak the key that types "f" reports `code: "KeyY"`. Matching on code
   * alone meant Ctrl+F never matched, so Find did not open — and because
   * `preventDefault` runs only after a match, the WebView's own find bar opened
   * over the app and searched the rendered page instead.
   */
  it("matches a letter binding by the letter on non-QWERTY layouts", () => {
    const dvorakF = { ...press("KeyY", { ctrl: true }), key: "f" };
    expect(matchesAccelerator(dvorakF, "CommandOrControl+KeyF", false)).toBe(true);
    expect(commandFor(dvorakF, resolveBindings(null), { mac: false })).toBe("find");

    // The letter still has to be the right one.
    expect(
      matchesAccelerator({ ...press("KeyY", { ctrl: true }), key: "y" }, "Control+KeyF", false),
    ).toBe(false);
  });

  /** But a PEDAL is matched by position — that is the whole reason accelerators
   * are keyed on `code`, and a layout must never move a pedal's button. */
  it("does not let the letter rule touch non-letter keys", () => {
    // A numpad key reporting a letter-ish `key` must not answer a letter
    // binding, and F13 must answer only F13.
    expect(matchesAccelerator({ ...press("Numpad1"), key: "f" }, "Control+KeyF", false)).toBe(
      false,
    );
    expect(matchesAccelerator({ ...press("F13"), key: "F13" }, "F13", false)).toBe(true);
    expect(matchesAccelerator({ ...press("Digit1"), key: "!" }, "Digit1", false)).toBe(true);
  });

  it("shows a key by the name printed on it", () => {
    expect(formatAccelerator("Control+Shift+KeyP", false)).toBe("Ctrl + Shift + P");
    expect(formatAccelerator("CommandOrControl+KeyF", true)).toBe("⌘ + F");
    expect(formatAccelerator("ArrowUp", false)).toBe("↑");
    expect(formatAccelerator("Numpad5", false)).toBe("Num 5");
    expect(formatAccelerator("PageDown", false)).toBe("Page Down");
    expect(formatAccelerator("F13", false)).toBe("F13");
    // An unparseable stored value is shown as itself rather than as nothing.
    expect(formatAccelerator("Nonsense", false)).toBe("Nonsense");
  });
});

describe("the shipped defaults", () => {
  it("binds every command and are all legal accelerators", () => {
    for (const spec of COMMANDS) {
      const binding = DEFAULT_BINDINGS[spec.id];
      expect(binding, spec.id).toBeDefined();
      expect(binding.window && isAccelerator(binding.window), spec.id).toBe(true);
    }
  });

  /**
   * ⚠️ Nothing is registered with the OS until the operator asks. An app that
   * took a global hotkey away from every other program on first run would be a
   * bug report, so `global` ships null and FT-M16's map is the opt-in.
   */
  it("registers no global hotkey out of the box", () => {
    for (const spec of COMMANDS) {
      expect(DEFAULT_BINDINGS[spec.id].global, spec.id).toBeNull();
    }
  });

  it("has no conflicts of its own", () => {
    const resolved = resolveBindings(null);
    expect(conflicts(resolved, "window")).toEqual({});
    expect(conflicts(resolved, "global")).toEqual({});
  });
});

describe("resolveBindings", () => {
  it("lays the operator's overrides over the defaults", () => {
    const resolved = resolveBindings({ playPause: { window: "F13", global: "F14" } });
    expect(resolved.playPause).toEqual({ window: "F13", global: "F14" });
    // Untouched commands keep theirs.
    expect(resolved.top.window).toBe(DEFAULT_BINDINGS.top.window);
  });

  /**
   * ⚠️ `null` is a real stored value — it is how the map records "unbound" —
   * so it must not fall back to the default. Only an absent key does.
   */
  it("keeps a deliberately cleared binding cleared", () => {
    const resolved = resolveBindings({ playPause: { window: null, global: null } });
    expect(resolved.playPause.window).toBeNull();
  });

  it("drops an unparseable stored binding rather than reinstating a default", () => {
    const resolved = resolveBindings({
      playPause: { window: "Ctrl+Nonsense", global: null },
    } as never);
    expect(resolved.playPause.window).toBeNull();
  });

  /** `find` opens a dialog, so a global binding for it could only be a
   * keystroke that appears to do nothing. */
  it("refuses a global binding for a command that cannot have one", () => {
    const resolved = resolveBindings({ find: { window: null, global: "F13" } });
    expect(resolved.find.global).toBeNull();
  });
});

describe("conflicts", () => {
  it("reports each side of a collision", () => {
    const table = resolveBindings({
      playPause: { window: "F13", global: null },
      stop: { window: "F13", global: null },
    });
    const found = conflicts(table, "window");
    expect(found.playPause).toEqual(["stop"]);
    expect(found.stop).toEqual(["playPause"]);
    expect(found.top).toBeUndefined();
  });

  /** The two scopes are independent: a key can be the window binding for one
   * command and the global binding for another without either being wrong. */
  it("does not cross the two scopes", () => {
    const table = resolveBindings({
      playPause: { window: "F13", global: null },
      stop: { window: null, global: "F13" },
    });
    expect(conflicts(table, "window")).toEqual({});
    expect(conflicts(table, "global")).toEqual({});
  });

  /**
   * ⚠️ The same physical keystroke written two ways.
   *
   * A capture stores the concrete `Control+KeyF`; the shipped default says the
   * portable `CommandOrControl+KeyF`. Comparing the TEXT found no collision, so
   * rebinding Stop to Ctrl+F raised no warning, both rows displayed "Ctrl + F",
   * and `commandFor` handed the key to whichever came first in the table —
   * making Find unreachable with nothing on screen saying why.
   */
  it("sees through CommandOrControl to the physical key", () => {
    const table = resolveBindings({ stop: { window: "Control+KeyF", global: null } });
    const off = conflicts(table, "window", false);
    expect(off.stop).toEqual(["find"]);
    expect(off.find).toEqual(["stop"]);

    // And on macOS it is Command that collides, not Control.
    const mac = resolveBindings({ stop: { window: "Super+KeyF", global: null } });
    expect(conflicts(mac, "window", true).stop).toEqual(["find"]);
    expect(conflicts(mac, "window", false).stop).toBeUndefined();
  });

  it("ignores unbound commands", () => {
    const table = resolveBindings({
      playPause: { window: null, global: null },
      stop: { window: null, global: null },
    });
    expect(conflicts(table, "window")).toEqual({});
  });
});

describe("the text-entry guard", () => {
  it("knows where text is typed", () => {
    expect(isTextEntry({ tagName: "INPUT" })).toBe(true);
    expect(isTextEntry({ tagName: "TEXTAREA" })).toBe(true);
    expect(isTextEntry({ tagName: "SELECT" })).toBe(true);
    expect(isTextEntry({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isTextEntry({ tagName: "DIV", isContentEditable: false })).toBe(false);
    expect(isTextEntry(null)).toBe(false);
    expect(isTextEntry(undefined)).toBe(false);
    // Structural, not `instanceof`: an element from another realm must still
    // be recognised or the guard silently lets every keystroke through.
    expect(isTextEntry(Object.create(null, { tagName: { value: "INPUT" } }))).toBe(true);
  });

  it("lets a modifier combination through but not a bare key", () => {
    expect(firesInTextEntry("Space")).toBe(false);
    expect(firesInTextEntry("ArrowUp")).toBe(false);
    // Shift is how capitals are typed, so it is not an escape from the editor.
    expect(firesInTextEntry("Shift+Space")).toBe(false);
    expect(firesInTextEntry("Control+KeyF")).toBe(true);
    expect(firesInTextEntry("CommandOrControl+KeyF")).toBe(true);
    expect(firesInTextEntry("Alt+ArrowUp")).toBe(true);
  });
});

describe("commandFor", () => {
  const table = resolveBindings(null);

  it("finds the command a keystroke is bound to", () => {
    expect(commandFor(press("Space"), table, { mac: false })).toBe("playPause");
    expect(commandFor(press("ArrowUp"), table, { mac: false })).toBe("faster");
    expect(commandFor(press("PageDown"), table, { mac: false })).toBe("nextMarker");
    expect(commandFor(press("KeyF", { ctrl: true }), table, { mac: false })).toBe("find");
    expect(commandFor(press("KeyQ"), table, { mac: false })).toBeNull();
  });

  /**
   * ⚠️ The property the whole guard exists for: the space bar has to type a
   * space while the operator is writing the script. `Space` is play/pause on
   * the body and a space in the editor, from ONE table.
   */
  it("never steals a bare key from the editor", () => {
    const editor = { tagName: "DIV", isContentEditable: true };
    expect(commandFor(press("Space", { target: editor }), table, { mac: false })).toBeNull();
    expect(commandFor(press("ArrowUp", { target: editor }), table, { mac: false })).toBeNull();
    expect(commandFor(press("Home", { target: editor }), table, { mac: false })).toBeNull();
    // But Ctrl+F still opens find from inside the editor, which is where an
    // operator reaches for it.
    expect(commandFor(press("KeyF", { ctrl: true, target: editor }), table, { mac: false })).toBe(
      "find",
    );
  });

  /**
   * A held pedal must not fire play/pause dozens of times a second, but holding
   * "faster" to wind the speed up is exactly how the transport already behaves.
   */
  it("repeats the commands that should repeat and no others", () => {
    expect(commandFor(press("ArrowUp", { repeat: true }), table, { mac: false })).toBe("faster");
    expect(commandFor(press("ArrowRight", { repeat: true }), table, { mac: false })).toBe(
      "stepForward",
    );
    expect(commandFor(press("Space", { repeat: true }), table, { mac: false })).toBeNull();
    expect(commandFor(press("PageDown", { repeat: true }), table, { mac: false })).toBeNull();
  });

  /** The projector answers transport keys only — it has no find dialog to
   * open — so it passes the subset it owns. */
  it("honours a caller's subset", () => {
    const only: CommandId[] = ["playPause", "faster"];
    expect(commandFor(press("Space"), table, { only, mac: false })).toBe("playPause");
    expect(commandFor(press("KeyF", { ctrl: true }), table, { only, mac: false })).toBeNull();
  });

  it("answers nothing for an unbound command", () => {
    const cleared: Record<CommandId, Binding> = {
      ...table,
      playPause: { window: null, global: null },
    };
    expect(commandFor(press("Space"), cleared, { mac: false })).toBeNull();
  });
});
