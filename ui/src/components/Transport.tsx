import { useEffect, useRef } from "react";

import { useT } from "../i18n/t";
import {
  PauseIcon,
  PlayIcon,
  RestartIcon,
  StepBackIcon,
  StepForwardIcon,
  StopIcon,
} from "./TeleprompterIcons";

/**
 * The transport (FT-13): real SVG buttons — back to top, rewind, slower,
 * play/pause, stop, faster, fast-forward — with **hold-to-repeat** on the two
 * step buttons.
 *
 * One component for both surfaces. The operator panel and the projector had
 * separate copies in Freally Capture and drifted immediately: the projector
 * grew hold-to-repeat and the panel never did, so the same button behaved
 * differently depending on which window you pressed it in.
 *
 * The caller supplies the actions rather than calling the engine directly,
 * because in read-aloud mode (FT-16) the same buttons drive the *speech* instead
 * of the shared scroll.
 */
export function Transport({
  playing,
  onTop,
  onStepBack,
  onStepForward,
  onSlower,
  onFaster,
  onPlayPause,
  onStop,
  onDark = false,
}: {
  playing: boolean;
  onTop: () => void;
  /** `step` is in visible characters; omitted means the engine's default nudge. */
  onStepBack: (step?: number) => void;
  onStepForward: (step?: number) => void;
  onSlower: () => void;
  onFaster: () => void;
  onPlayPause: () => void;
  onStop: () => void;
  /** True on the projector, where the surface is black in both themes. */
  onDark?: boolean;
}) {
  const t = useT();

  // Hold a step button to keep rewinding / fast-forwarding, accelerating the
  // longer it is held; the highlight follows each step. Release stops it, and a
  // quick tap is just the one immediate call.
  const holdTimer = useRef<number | null>(null);
  const stopHold = () => {
    if (holdTimer.current !== null) {
      window.clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  };
  const startHold = (step: (by?: number) => void) => {
    step();
    let by = 0.5;
    holdTimer.current = window.setInterval(() => {
      step(by);
      by = Math.min(by * 1.25, 6);
    }, 80);
  };
  // A pointer released outside the button, or a window that loses focus
  // mid-hold, must not leave the interval running forever.
  useEffect(() => stopHold, []);

  // `proj-btn` lives in global.css rather than being built from utilities: the
  // projector surface is black in BOTH themes, so the light theme's white-alpha
  // re-tints would paint these controls black-on-black. See the CSS for the rule.
  const base = onDark
    ? "proj-btn"
    : "flex h-8 w-8 items-center justify-center rounded-md border border-white/10 " +
      "text-havoc-text hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-havoc-accent/60";
  const icon = onDark ? "h-5 w-5" : "h-4 w-4";

  const hold = (step: (by?: number) => void) => ({
    onPointerDown: () => startHold(step),
    onPointerUp: stopHold,
    onPointerLeave: stopHold,
    onPointerCancel: stopHold,
  });

  return (
    <div className="flex items-center justify-center gap-1.5" data-testid="transport">
      <button
        type="button"
        className={base}
        onClick={onTop}
        title={t("transport-restart")}
        aria-label={t("transport-restart")}
      >
        <RestartIcon className={icon} />
      </button>
      <button
        type="button"
        className={base}
        {...hold(onStepBack)}
        title={t("transport-rewind")}
        aria-label={t("transport-rewind")}
      >
        <StepBackIcon className={icon} />
      </button>
      <button
        type="button"
        className={base}
        onClick={onSlower}
        title={t("transport-slower")}
        aria-label={t("transport-slower")}
      >
        −
      </button>
      <button
        type="button"
        className={`${base} ${playing && !onDark ? "border-havoc-accent text-havoc-accent" : ""}`}
        data-active={playing ? "true" : undefined}
        onClick={onPlayPause}
        title={playing ? t("transport-pause") : t("transport-play")}
        aria-label={playing ? t("transport-pause") : t("transport-play")}
      >
        {playing ? <PauseIcon className={icon} /> : <PlayIcon className={icon} />}
      </button>
      <button
        type="button"
        className={base}
        onClick={onStop}
        title={t("transport-stop")}
        aria-label={t("transport-stop")}
      >
        <StopIcon className={icon} />
      </button>
      <button
        type="button"
        className={base}
        onClick={onFaster}
        title={t("transport-faster")}
        aria-label={t("transport-faster")}
      >
        +
      </button>
      <button
        type="button"
        className={base}
        {...hold(onStepForward)}
        title={t("transport-forward")}
        aria-label={t("transport-forward")}
      >
        <StepForwardIcon className={icon} />
      </button>
    </div>
  );
}
