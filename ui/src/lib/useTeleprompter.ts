import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import { teleprompterGet } from "../api/commands";
import type { TeleprompterState } from "../api/types";

/** What a surface renders before the first snapshot arrives. */
const EMPTY: TeleprompterState = {
  script: "",
  speed: 12,
  fontSize: 48,
  // Mirrors Rust's `Look::default()`. A surface renders with these for the one
  // frame before the first snapshot lands, so they must not be blank.
  look: {
    fontFamily: "system",
    fontWeight: 500,
    textColor: "#ffffff",
    marginPct: 8,
    lineHeight: 1.5,
    guidePct: 12,
  },
  mirror: false,
  offset: 0,
  playing: false,
  caesuraSecs: 0.75,
  countdownSecs: 0,
  countdownRemaining: 0,
  skipWords: [],
  // Empty means "the shipped defaults", not "nothing is bound" — see
  // `resolveBindings`. So the one frame before the first snapshot still answers
  // every key it should.
  bindings: {},
};

/**
 * Take the new snapshot, but keep the PREVIOUS `skipWords` array and `bindings`
 * object when their contents have not changed.
 *
 * Every broadcast arrives as freshly-deserialised JSON, so both are a new
 * identity each time even when they are the empty default. Surfaces put them in
 * dependency arrays — so without this, an identity that changes on every event
 * defeats those memos entirely. Broadcasts are not rare: the seek bar fires one
 * per `pointermove` while dragging, and the engine fires one per keystroke of
 * the script.
 *
 * - `skipWords` feeds the memo that parses the script's timing regions, so a
 *   scrub of a long script became a full re-parse per frame, on two surfaces.
 * - `bindings` (FT-M04/M13/M16) feeds `resolveBindings`, and in `Projector.tsx`
 *   that memo's result is also a dependency of the effect owning the window's
 *   `keydown` listener, its `requestAnimationFrame` and its 2.8 s chrome
 *   auto-hide timer. A fresh identity tore that effect down and re-armed it per
 *   broadcast — which re-ran `reveal()` and **un-hid the projector's chrome
 *   over the talent's script on every keystroke the operator typed**. The
 *   re-parse was the cheap half of that bug.
 *
 * Only these two need it. `script` and `look` are compared by the memos that
 * use them (a string and a stable object), and everything else is a number or
 * a boolean.
 */
function adopt(previous: TeleprompterState, next: TeleprompterState): TeleprompterState {
  const before = previous.skipWords;
  const after = next.skipWords;
  const sameWords =
    before.length === after.length && before.every((word, index) => word === after[index]);
  const sameBindings = sameBindingTable(previous.bindings, next.bindings);
  if (sameWords && sameBindings) return { ...next, skipWords: before, bindings: previous.bindings };
  if (sameWords) return { ...next, skipWords: before };
  if (sameBindings) return { ...next, bindings: previous.bindings };
  return next;
}

/** Do two binding tables say the same thing? Compared by value because the
 * identity is worthless — see `adopt`. */
function sameBindingTable(
  before: TeleprompterState["bindings"],
  after: TeleprompterState["bindings"],
): boolean {
  const keys = Object.keys(before);
  if (keys.length !== Object.keys(after).length) return false;
  return keys.every((key) => {
    const a = before[key];
    const b = after[key];
    return b !== undefined && a.window === b.window && a.global === b.global;
  });
}

/**
 * The shared teleprompter snapshot: one initial read plus every `teleprompter`
 * event the Rust side broadcasts on a control change.
 *
 * Deliberately event-driven rather than polled — between control changes each
 * surface animates locally from `offset` + `speed` (see `liveOffset`), so the
 * scroll stays smooth at 60fps while the IPC stays quiet.
 */
export function useTeleprompter(): TeleprompterState {
  const [state, setState] = useState<TeleprompterState>(EMPTY);

  useEffect(() => {
    let alive = true;
    teleprompterGet()
      .then((snapshot) => {
        if (alive) setState((previous) => adopt(previous, snapshot));
      })
      .catch(() => {
        // No backend (a unit test, or a webview that lost its host): keep the
        // empty state rather than tearing the surface down.
      });

    const pending = listen<TeleprompterState>("teleprompter", (event) => {
      if (alive) setState((previous) => adopt(previous, event.payload));
    });
    return () => {
      alive = false;
      void pending.then((unlisten) => unlisten()).catch(() => {});
    };
  }, []);

  return state;
}
