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
};

/**
 * Take the new snapshot, but keep the PREVIOUS `skipWords` array when its
 * contents have not changed.
 *
 * Every broadcast arrives as freshly-deserialised JSON, so `skipWords` is a new
 * array identity each time even when it is the empty default. Surfaces put it
 * in the dependency array of the memo that parses the script's timing regions —
 * so without this, an identity that changes on every event defeats that memo
 * entirely and re-parses the whole script per broadcast. Broadcasts are not
 * rare: the seek bar fires one per `pointermove` while dragging, which turned
 * a scrub of a long script into a full re-parse per frame, on two surfaces.
 *
 * Only this one field needs it. `script` and `look` are compared by the memos
 * that use them (a string and a stable object), and everything else is a
 * number or a boolean.
 */
function adopt(previous: TeleprompterState, next: TeleprompterState): TeleprompterState {
  const before = previous.skipWords;
  const after = next.skipWords;
  const same =
    before.length === after.length && before.every((word, index) => word === after[index]);
  return same ? { ...next, skipWords: before } : next;
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
