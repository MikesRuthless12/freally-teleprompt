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
};

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
        if (alive) setState(snapshot);
      })
      .catch(() => {
        // No backend (a unit test, or a webview that lost its host): keep the
        // empty state rather than tearing the surface down.
      });

    const pending = listen<TeleprompterState>("teleprompter", (event) => {
      if (alive) setState(event.payload);
    });
    return () => {
      alive = false;
      void pending.then((unlisten) => unlisten()).catch(() => {});
    };
  }, []);

  return state;
}
