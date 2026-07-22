import { useEffect, useMemo, useRef, useState } from "react";

import type { TeleprompterState } from "../api/types";
import { useT } from "../i18n/t";
import { liveOffset, parseCaesuras } from "../lib/caesura";

/** Line-height multiple used everywhere, so an offset maps to pixels the same
 * way on every surface (bigger font → bigger pixels, same reading pace). */
const LINE_HEIGHT = 1.5;

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
    // Reading guide at 12% down the viewport, expressed in the stage's own
    // coordinate system (the stage transform then scales it to the window).
    const stageH = scale > 0 ? dims.h / scale : dims.h;
    const padTop = 0.12 * stageH;

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
      className="relative h-full w-full overflow-hidden bg-black text-white"
      style={{
        transform: mirrored ? "scaleX(-1)" : undefined,
        cursor: onSeek ? "pointer" : undefined,
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
            className="px-[8%] break-words will-change-transform"
            style={{
              fontSize: state.fontSize,
              lineHeight: LINE_HEIGHT,
              fontWeight: 500,
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
        style={{ top: "12%" }}
        aria-hidden="true"
      />
    </div>
  );
}
