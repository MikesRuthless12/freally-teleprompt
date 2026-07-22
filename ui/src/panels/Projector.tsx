import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { teleprompterControl } from "../api/commands";
import { Transport } from "../components/Transport";
import { useT } from "../i18n/t";
import { parseCaesuras } from "../lib/caesura";
import { useTeleprompter } from "../lib/useTeleprompter";
import { TeleprompterScroller, TeleprompterSeekBar } from "./Teleprompter";

/**
 * The talent projector window (FT-12): the reading surface — big, mirror-able,
 * scrolled by the **shared** state, so it can never disagree with the operator's
 * preview about where the read is.
 *
 * It carries its own transport and seek bar, because the person reading is often
 * the person driving. The chrome fades away while reading and returns on any
 * activity, so it never sits over the script during a take; Esc closes the
 * window.
 *
 * Rendered instead of the app shell when the window's label is `projector` —
 * see `main.tsx`.
 */
export function Projector() {
  const t = useT();
  const state = useTeleprompter();
  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  const caesuras = useMemo(
    () => parseCaesuras(state.script, state.caesuraSecs),
    [state.script, state.caesuraSecs],
  );

  const control = useCallback(
    (action: Parameters<typeof teleprompterControl>[0], value?: number) =>
      void teleprompterControl(action, value).catch(() => undefined),
    [],
  );
  // Stable, so the scroller's native wheel listener is not torn down and
  // re-attached on every engine event.
  const seek = useCallback((offset: number) => control("seek", Math.max(0, offset)), [control]);

  const reveal = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setChromeVisible(false), 2800);
  }, []);

  // Keyboard shortcuts (FT-13). The talent's hands are not on the operator's
  // machine, so the projector has to be drivable from its own window.
  useEffect(() => {
    // Defer the first reveal a frame — the chrome starts visible anyway, and this
    // only arms the auto-hide without a setState in the effect body.
    const raf = requestAnimationFrame(reveal);
    const onKey = (event: KeyboardEvent) => {
      reveal();
      switch (event.key) {
        case "Escape":
          void getCurrentWindow().close();
          break;
        case " ": // Space toggles play/pause without scrolling the page.
          event.preventDefault();
          control("toggle");
          break;
        case "ArrowLeft":
          control("stepBack");
          break;
        case "ArrowRight":
          control("stepForward");
          break;
        case "ArrowUp":
          control("faster");
          break;
        case "ArrowDown":
          control("slower");
          break;
        case "Home":
          control("top");
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", reveal);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", reveal);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, [control, reveal]);

  return (
    <div
      data-testid="projector"
      className="fixed inset-0 bg-black"
      style={{ cursor: chromeVisible ? "default" : "none" }}
    >
      <TeleprompterScroller state={state} fullscreen onSeek={seek} />
      {/* Chrome (seek bar + transport) — fades while reading, back on activity. */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/90 to-transparent px-6 pt-16 pb-5 transition-opacity duration-300 ${
          chromeVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <TeleprompterSeekBar state={state} caesuras={caesuras} onSeek={seek} onDark />
        <div className="flex items-center justify-center gap-2">
          <Transport
            onDark
            playing={state.playing}
            onTop={() => control("top")}
            onStepBack={(step) => control("stepBack", step)}
            onStepForward={(step) => control("stepForward", step)}
            onSlower={() => control("slower")}
            onFaster={() => control("faster")}
            onPlayPause={() => control("toggle")}
            onStop={() => control("stop")}
          />
          <span
            className="ml-2 w-16 text-center font-mono text-xs text-white/60"
            aria-hidden="true"
          >
            {state.speed.toFixed(1)} c/s
          </span>
        </div>
      </div>
      {chromeVisible && (
        <div className="pointer-events-none absolute top-3 right-3 rounded bg-black/60 px-2 py-1 text-xs text-white/60">
          {t("projector-exit-hint")}
        </div>
      )}
    </div>
  );
}
