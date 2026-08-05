import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { teleprompterControl } from "../api/commands";
import { Transport } from "../components/Transport";
import { useT } from "../i18n/t";
import { ENGINE_COMMANDS, commandFor, commandSpec, resolveBindings } from "../lib/bindings";
import { timedRegions } from "../lib/caesura";
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

  // Every region that changes the scroll's timing — caesura holds AND the
  // labels a keyword marks as unperformed (FT-M02).
  //
  // `timedRegions`, not `parseCaesuras`: this feeds the projector's own seek
  // bar, and the scroller beside it in the same window computes its timing the
  // same way. Left on `parseCaesuras` the two disagreed by exactly the labels —
  // the script scrolled past them for free while the seek bar's clock charged
  // for them. The keyword list rides on the engine snapshot precisely so this
  // window does not have to read settings of its own to get it right.
  const { regions: caesuras } = useMemo(
    () => timedRegions(state.script, state.caesuraSecs, state.skipWords),
    [state.script, state.caesuraSecs, state.skipWords],
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

  // Keyboard shortcuts (FT-13, rebindable since FT-M16). The talent's hands are
  // not on the operator's machine, so the projector has to be drivable from its
  // own window — through the SAME binding table the operator window uses, so a
  // rebind moves both. The table rides on the engine snapshot rather than being
  // read from settings here; see `TeleprompterDto.bindings`.
  //
  // ⚠️ `ENGINE_COMMANDS` — the commands that ARE exactly one engine action — is
  // what this window answers, and the marker pair is deliberately not among
  // them. Next/previous marker need to know where the read is *now* and need
  // the marker list, and this window has neither; binding them here would mean
  // a second implementation of `lib/markers.ts` on the far side of the IPC
  // boundary. They stay the operator's, which is whose job they are.
  const bindings = useMemo(() => resolveBindings(state.bindings), [state.bindings]);

  // ⚠️ A LAYOUT effect, not a passive one. A passive effect runs *after* the
  // browser paints, so there is a window — one frame, longer on a loaded
  // machine — where the projector is on screen and answers no keys at all.
  // `ModalShell` was fixed at this exact point for this exact reason (its Esc
  // handler had the same gap, and macOS CI failed on it deterministically);
  // the rule generalises, and a prompter window that is visible but not yet
  // drivable is the same defect. It also made an e2e case flaky, because
  // `toBeVisible()` only proves React painted.
  useLayoutEffect(() => {
    // Defer the first reveal a frame — the chrome starts visible anyway, and this
    // only arms the auto-hide without a setState in the effect body.
    const raf = requestAnimationFrame(reveal);
    const onKey = (event: KeyboardEvent) => {
      reveal();
      // Escape closes the window, and is NOT in the binding table: it is window
      // management rather than a transport command, and every dialog in the app
      // already means "get me out of here" by it.
      if (event.key === "Escape") {
        void getCurrentWindow().close();
        return;
      }
      const command = commandFor(event, bindings, { only: ENGINE_COMMANDS });
      const action = command && commandSpec(command)?.action;
      if (!action) return;
      // Only once a binding has matched, so an unbound key still does whatever
      // the window would normally do with it — and a bound Space does not
      // scroll the page under the script.
      event.preventDefault();
      control(action);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", reveal);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", reveal);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, [control, reveal, bindings]);

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
