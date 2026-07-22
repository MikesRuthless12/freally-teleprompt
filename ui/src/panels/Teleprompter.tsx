import { useEffect, useMemo, useRef, useState } from "react";

import type { TeleprompterState } from "../api/types";
import { useT } from "../i18n/t";
import {
  type Caesura,
  liveOffset,
  parseCaesuras,
  timeAtOffset,
  visibleChars,
} from "../lib/caesura";
import { fontStack } from "../lib/fonts";
import { fmtTime } from "../lib/time";

/** The preview and the projector lay text out on a shared fixed-width virtual
 * "stage", then CSS-scale it to their own window — so wrapping is IDENTICAL on
 * both surfaces regardless of each window's monitor. A fixed constant (not
 * `window.screen.width`, which differs per monitor on a dual-screen rig) keeps
 * that invariant. */
const STAGE_WIDTH = 1920;

/** Render a script line as one `data-ch` span per character (no Markdown) so the
 * per-character pace cue aligns 1:1 with the Rust visible-char offset. */
function lineChars(line: string, keyBase: string): React.ReactNode[] {
  // EVERY character is its own data-ch span (no markdown, no word grouping) so
  // the char-based pace cue aligns with the Rust visible-char offset. Wrapping is
  // the container's job (`break-words` / overflow-wrap): normal text breaks at
  // spaces, and a long UNBROKEN string breaks wherever it would overflow.
  return Array.from(line).map((ch, ci) => (
    <span key={`${keyBase}-${ci}`} data-ch="">
      {ch}
    </span>
  ));
}

function renderScript(script: string): React.ReactNode {
  return script.split("\n").map((line, index) => {
    const key = `l${index}`;
    const chars = lineChars(line, key);
    // A blank line keeps its height (so paragraph spacing survives).
    return <div key={key}>{chars.length ? chars : <span> </span>}</div>;
  });
}

/**
 * The scrolling script surface (FT-02, ported from Freally Capture). Reads the
 * shared state and animates the scroll LOCALLY between control changes (rAF),
 * resyncing to `offset` whenever the state updates — so the preview, the
 * projector, and the LAN mirror stay in step without high-frequency polling.
 *
 * Appearance (FT-15) comes from `state.look`, not from props, precisely so the
 * preview and the projector cannot be styled differently by accident.
 */
export function TeleprompterScroller({
  state,
  fullscreen = false,
  onSeek,
  overrideOffset,
}: {
  state: TeleprompterState;
  fullscreen?: boolean;
  /** Click-to-start: seek to the clicked character (offset in visible chars).
   * When set, the surface is clickable. */
  onSeek?: (offset: number) => void;
  /** Preview-local highlight offset (read-aloud, FT-16): when set, the surface
   * shows THIS visible-char offset instead of the shared scroll state, and does
   * not auto-animate — so the modal can drive the highlight from speech without
   * touching the projector. */
  overrideOffset?: number;
}) {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const look = state.look;
  // Inline ` -- ` caesuras drive the same flat-crawl pauses the Rust state uses.
  const caesuras = useMemo(
    () => parseCaesuras(state.script, state.caesuraSecs),
    [state.script, state.caesuraSecs],
  );
  // The animation anchor: the last known offset + when we received it. `t` is
  // filled by the effect below (calling performance.now() during render is
  // impure); until then playing is false or the effect has already run.
  const anchor = useRef({
    offset: state.offset,
    t: 0,
    playing: state.playing,
    speed: state.speed,
    countdown: state.countdownRemaining,
  });
  useEffect(() => {
    anchor.current = {
      offset: state.offset,
      t: performance.now(),
      playing: state.playing,
      speed: state.speed,
      countdown: state.countdownRemaining,
    };
  }, [state.offset, state.playing, state.speed, state.countdownRemaining]);

  // Preview AND projector lay the script out on ONE fixed-width "stage" at the
  // real font size, then CSS-scale the whole stage to fit their own window. Same
  // stage width + same font => IDENTICAL wrapping, so the preview is a faithful,
  // smaller copy of the projector no matter the window sizes. `dims` is the live
  // viewport (measured below); `scale` fits the stage.
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const stageW = STAGE_WIDTH;
  const scale = dims.w > 0 ? dims.w / stageW : 0.3;
  // The live scroll offset (visible chars) each frame, so click/wheel seeks
  // relative to it; and how many characters are currently lit (delta updates).
  const liveRef = useRef(state.offset);
  const litCountRef = useRef(0);
  // The pre-roll countdown overlay (big number), driven imperatively each frame.
  const countdownRef = useRef<HTMLDivElement>(null);
  // The beam-splitter mirror is only meaningful on the reading surface.
  const mirrored = fullscreen && state.mirror;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Cache the character spans + content height for this script/font (the effect
    // re-runs when they change); start from a clean unlit slate.
    const chars = track.querySelectorAll<HTMLElement>("[data-ch]");
    const total = chars.length;
    for (let i = 0; i < total; i++) chars[i].style.color = "";
    litCountRef.current = 0;
    // The reading guide sits `look.guidePct` down the viewport (FT-15), expressed
    // in the stage's own coordinate system — the stage transform then scales it
    // to the window, so preview and projector place it identically.
    const stageH = scale > 0 ? dims.h / scale : dims.h;
    const padTop = (look.guidePct / 100) * stageH;

    const write = () => {
      const a = anchor.current;
      const raw = a.playing ? (performance.now() - a.t) / 1000 : 0;
      // A start-countdown pre-roll holds the scroll (and shows a big number) for
      // its first `countdown` seconds; the shared clock ignores that lead-in, so
      // the preview and the projector count down and start together.
      const cd = Math.max(0, a.countdown - raw);
      const elapsed = Math.max(0, raw - a.countdown);
      if (countdownRef.current) {
        const show = overrideOffset === undefined && cd > 0;
        countdownRef.current.style.display = show ? "flex" : "none";
        if (show) countdownRef.current.textContent = String(Math.ceil(cd));
      }
      // Read-aloud drives the highlight locally via `overrideOffset`; otherwise
      // it's the shared, time-animated scroll offset.
      const live =
        overrideOffset !== undefined
          ? Math.max(0, Math.min(total, overrideOffset))
          : Math.max(0, Math.min(total, liveOffset(a.offset, elapsed, a.speed, caesuras)));
      liveRef.current = live;
      // Put the CURRENT character's row exactly at the reading guide (measured
      // from its span, interpolated across the row jump) so the highlighted word
      // is ALWAYS on the guide and never scrolls out of view when you seek/scroll
      // fast; at the end the last line sits at the guide, fully lit.
      const i0 = Math.max(0, Math.min(total - 1, Math.floor(live)));
      const y0 = total > 0 ? (chars[i0] as HTMLElement).offsetTop - padTop : 0;
      const y1 = i0 + 1 < total ? (chars[i0 + 1] as HTMLElement).offsetTop - padTop : y0;
      const y = y0 + (live - Math.floor(live)) * (y1 - y0);
      track.style.transform = `translateY(${-y}px)`;
      // Highlight the first round(live) characters GLOBALLY in reading order,
      // updating only the delta from the previous frame.
      const litCount = Math.max(0, Math.min(total, Math.round(live)));
      const from = litCountRef.current;
      if (litCount > from) {
        for (let i = from; i < litCount; i++) chars[i].style.color = "var(--color-havoc-accent)";
      } else if (litCount < from) {
        for (let i = litCount; i < from; i++) chars[i].style.color = "";
      }
      litCountRef.current = litCount;
    };
    // Override mode (read-aloud) writes once per offset change; only the shared,
    // playing scroll animates every frame.
    const animating = overrideOffset === undefined && state.playing;
    if (!animating) {
      write();
      return;
    }
    let raf = 0;
    const step = () => {
      write();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [
    state.playing,
    state.offset,
    state.countdownRemaining,
    caesuras,
    dims.w,
    dims.h,
    scale,
    state.fontSize,
    state.script,
    overrideOffset,
    // The appearance changes where the guide sits and how tall a row is, so a
    // stale frame would park the highlight off the line until the next event.
    look.guidePct,
    look.lineHeight,
    look.marginPct,
    look.fontFamily,
    look.fontWeight,
  ]);

  // Re-parse the script only when its text changes (not on every speed/font tick).
  const body = useMemo(() => renderScript(state.script), [state.script]);

  // Click-to-start: map a click to a character offset and seek there, so a side
  // note at the top can be skipped by clicking the word to begin on.
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !state.script.trim()) return;
    const track = trackRef.current;
    if (!track) return;
    const all = Array.from(track.querySelectorAll<HTMLElement>("[data-ch]"));
    // Clicking a character seeks right to it; a click in a gap estimates from row.
    const span = (e.target as HTMLElement).closest<HTMLElement>("[data-ch]");
    if (span) {
      const idx = all.indexOf(span);
      if (idx >= 0) onSeek(idx);
      return;
    }
    // Gap click (not on a character): estimate the char from the click's Y in
    // stage coordinates (getBoundingClientRect is post-transform, so undo scale).
    const rect = track.getBoundingClientRect();
    const stageY = (e.clientY - rect.top) / Math.max(scale, 0.0001);
    const h = Math.max(1, track.scrollHeight);
    onSeek(Math.max(0, Math.min(all.length, (stageY / h) * all.length)));
  };

  // Mousewheel scrubbing: a native non-passive listener so preventDefault stops
  // the page scrolling and stopPropagation stops an outer wheel handler
  // double-firing. ~1 line per notch.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onSeek) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSeek(Math.max(0, liveRef.current + e.deltaY / 8));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onSeek]);

  // Measure the viewport (BOTH views) so the stage can scale to fit it.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => setDims({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      data-testid="teleprompter-scroller"
      className="relative h-full w-full overflow-hidden bg-black"
      style={{
        transform: mirrored ? "scaleX(-1)" : undefined,
        cursor: onSeek ? "pointer" : undefined,
        // Unread script takes the operator's chosen colour; the sweep overrides
        // each character to the accent as it is read.
        color: look.textColor,
      }}
      onClick={onSeek ? handleClick : undefined}
    >
      {state.script.trim() ? (
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: stageW, transform: `scale(${scale})` }}
        >
          <div
            ref={trackRef}
            className="break-words will-change-transform"
            style={{
              fontSize: state.fontSize,
              fontFamily: fontStack(look.fontFamily),
              lineHeight: look.lineHeight,
              fontWeight: look.fontWeight,
              paddingLeft: `${look.marginPct}%`,
              paddingRight: `${look.marginPct}%`,
            }}
          >
            {body}
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/50">
          {t("teleprompter-empty")}
        </div>
      )}
      {/* Start-countdown pre-roll — a big number over the script until scrolling
          begins; updated imperatively by the frame loop above. */}
      <div
        ref={countdownRef}
        aria-hidden="true"
        className="text-havoc-accent pointer-events-none absolute inset-0 items-center justify-center font-bold"
        style={{
          display: "none",
          fontSize: Math.max(24, Math.min(dims.w || 1, dims.h || 1) * 0.4),
          textShadow: "0 2px 24px rgba(0,0,0,0.6)",
        }}
      />
      {/* Reading line — where the talent's eyes rest. */}
      <div
        className="border-havoc-accent/50 pointer-events-none absolute inset-x-0 border-t"
        style={{ top: `${look.guidePct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * A YouTube-style seek bar (FT-13): a scrubber with elapsed / total read time
 * (caesura pauses counted), hover-to-preview the words at any point, and
 * click / drag to jump there. Times come from the shared caesura-aware timing,
 * so the numbers move with speed and seeks.
 */
export function TeleprompterSeekBar({
  state,
  caesuras,
  onSeek,
  overrideOffset,
  onDark = false,
}: {
  state: TeleprompterState;
  caesuras: Caesura[];
  onSeek: (offset: number) => void;
  /** Read-aloud: track this offset instead of the shared scroll (so the scrubber
   * shows where the reading is, not where the shared scroll is). */
  overrideOffset?: number;
  /** True on the projector, whose chrome is black in both themes. */
  onDark?: boolean;
}) {
  const t = useT();
  const total = Math.max(1, visibleChars(state.script));
  const speed = state.speed > 0 ? state.speed : 1;
  const vis = useMemo(
    () => Array.from(state.script).filter((c) => c.charCodeAt(0) !== 10),
    [state.script],
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const anchor = useRef({
    offset: state.offset,
    t: 0,
    playing: state.playing,
    speed: state.speed,
    countdown: state.countdownRemaining,
  });
  const [live, setLive] = useState(state.offset);
  const [hoverFrac, setHoverFrac] = useState<number | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    anchor.current = {
      offset: state.offset,
      t: performance.now(),
      playing: state.playing,
      speed: state.speed,
      countdown: state.countdownRemaining,
    };
  }, [state.offset, state.playing, state.speed, state.countdownRemaining]);

  // Advance the scrubber smoothly while playing; a single write while paused.
  // In read-aloud mode the scrubber just follows the reading offset (no anim).
  useEffect(() => {
    let raf = 0;
    if (overrideOffset !== undefined) {
      raf = requestAnimationFrame(() => setLive(overrideOffset));
      return () => cancelAnimationFrame(raf);
    }
    // Drive the scrubber from the animation frame (never a synchronous setState in
    // the effect body): one write when paused, a loop while playing.
    const run = () => {
      const a = anchor.current;
      // Honour the start-countdown pre-roll: the scrubber holds until it elapses.
      const elapsed = Math.max(0, (a.playing ? (performance.now() - a.t) / 1000 : 0) - a.countdown);
      // Clamp at the end (liveOffset itself is unbounded) so the elapsed read-time
      // never climbs past the total once the scroll has reached the last line.
      setLive(Math.min(total, liveOffset(a.offset, elapsed, a.speed, caesuras)));
      if (state.playing) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [
    state.playing,
    state.offset,
    state.speed,
    state.countdownRemaining,
    caesuras,
    overrideOffset,
    total,
  ]);

  const fracFromX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
  };
  const seekFrac = (frac: number) => onSeek(frac * total);

  const progress = Math.max(0, Math.min(1, live / total));
  // At the hovered seek time, show ~80 characters around that point with the
  // highlight up to it (a "what would be lit here at this time" preview).
  const hoverChar = hoverFrac === null ? 0 : Math.floor(hoverFrac * total);
  const snipStart = Math.max(0, hoverChar - 40);
  const snippet = hoverFrac === null ? "" : vis.slice(snipStart, snipStart + 80).join("");
  const snipLit = Math.max(0, Math.min(snippet.length, hoverChar - snipStart));

  // On the projector the chrome sits on black in both themes, so the muted
  // colour and the track have to come from outside the theme's re-tints.
  const label = onDark ? "text-white/70" : "text-havoc-muted";

  return (
    <div className="flex items-center gap-3" data-testid="teleprompter-seek">
      <span className={`${label} w-11 shrink-0 text-right font-mono text-xs tabular-nums`}>
        {fmtTime(timeAtOffset(live, speed, caesuras))}
      </span>
      <div className="relative flex-1">
        {hoverFrac !== null && (
          <div
            // Deliberately dark in both themes: it is a preview of the reading
            // surface, which is black whatever the app's palette.
            className="border-havoc-accent/25 pointer-events-none absolute bottom-full mb-3 w-64 max-w-[70vw] -translate-x-1/2 rounded-md border bg-black/90 p-2 text-left shadow-lg"
            style={{ left: `${Math.max(6, Math.min(94, hoverFrac * 100))}%` }}
          >
            <div className="text-havoc-accent mb-1 font-mono text-[11px]">
              {fmtTime(timeAtOffset(hoverFrac * total, speed, caesuras))}
            </div>
            <div className="text-[11px] leading-snug break-words text-white/80">
              <span style={{ color: "var(--color-havoc-accent)" }}>
                {snippet.slice(0, snipLit)}
              </span>
              <span>{snippet.slice(snipLit)}</span>
            </div>
          </div>
        )}
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={t("transport-seek")}
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(live)}
          className={`relative h-2.5 cursor-pointer rounded-full ${onDark ? "proj-track" : "bg-white/10"}`}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            seekFrac(fracFromX(e.clientX));
          }}
          onPointerMove={(e) => {
            const frac = fracFromX(e.clientX);
            setHoverFrac(frac);
            if (dragging.current) seekFrac(frac);
          }}
          onPointerUp={(e) => {
            dragging.current = false;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerLeave={() => {
            if (!dragging.current) setHoverFrac(null);
          }}
          onKeyDown={(e) => {
            // A slider that only responds to a pointer is not a slider. One
            // character per press, a screenful per PageUp/Down.
            const step = e.key === "PageUp" || e.key === "PageDown" ? Math.max(1, total / 20) : 1;
            if (e.key === "ArrowLeft" || e.key === "PageDown") {
              e.preventDefault();
              onSeek(Math.max(0, live - step));
            } else if (e.key === "ArrowRight" || e.key === "PageUp") {
              e.preventDefault();
              onSeek(Math.min(total, live + step));
            } else if (e.key === "Home") {
              e.preventDefault();
              onSeek(0);
            } else if (e.key === "End") {
              e.preventDefault();
              onSeek(total);
            }
          }}
        >
          <div
            className="bg-havoc-accent absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="bg-havoc-accent absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow"
            style={{ left: `${progress * 100}%` }}
          />
        </div>
      </div>
      <span className={`${label} w-11 shrink-0 font-mono text-xs tabular-nums`}>
        {fmtTime(timeAtOffset(total, speed, caesuras))}
      </span>
    </div>
  );
}
