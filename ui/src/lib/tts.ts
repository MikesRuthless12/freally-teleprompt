/**
 * Read aloud with per-OS speech synthesis (FT-16).
 *
 * Speaks the script at the pace the scroll is set to, and reports progress so
 * the preview can highlight the word being spoken. **Preview only** — never the
 * projector, and it never touches the shared scroll state.
 *
 * Caesuras become REAL timed pauses of their configured seconds (the default, or
 * a per-caesura ` --2 `): the script is split into speak segments with a silent
 * gap between them, so `--` is never vocalized as "dash dash" and each pause
 * lasts its own duration.
 *
 * Backend is a hybrid: the WebView's `speechSynthesis` (a front end for the OS
 * voices — Windows OneCore/SAPI, macOS AVSpeechSynthesis) wherever it has
 * voices; on Linux (WebKitGTK usually ships none) it falls back to the native
 * `tts_speak` command, which shells out to the user's own Speech Dispatcher /
 * espeak-ng. No engine is bundled, so no GPL engine is redistributed.
 *
 * Highlight sync: where the engine emits word-boundary events (Windows/Chromium)
 * the highlight locks to the spoken word; elsewhere a pace-matched timer at the
 * set chars/sec drives it so it still moves in step.
 *
 * Ported from Freally Capture.
 */
import { ttsSpeakNative, ttsStopNative } from "../api/commands";
import { CAESURA_DEFAULT_SECS, type Caesura } from "./caesura";

// At Web-Speech rate 1.0 a voice utters roughly this many characters per second
// (including spaces). Mapping the teleprompter's chars/sec onto the rate keeps
// the spoken pace in step with the scroll pace.
const BASELINE_CPS = 14;

/** Map the teleprompter pace (visible chars/sec) to a speech-rate multiplier. */
export function paceToRate(charsPerSec: number): number {
  const cps = charsPerSec > 0 ? charsPerSec : 1;
  return Math.min(10, Math.max(0.1, cps / BASELINE_CPS));
}

// A caesura's TWO DASHES (optionally ` --1.5 `) starting at scalar index `i` —
// fenced by a space, newline, or the text edge on BOTH sides, exactly like
// `parseCaesuras`. Returns the dash(+digits) length (visible chars, NOT the
// fencing spaces) or 0. A caesura next to a line break used to be read aloud as
// "dash dash" because the old check demanded a literal space on each side.
function caesuraDashesAt(chars: string[], i: number): number {
  if (chars[i] !== "-" || chars[i + 1] !== "-") return 0;
  const fence = (c: string | undefined) => c === undefined || c === " " || c.charCodeAt(0) === 10;
  if (!fence(chars[i - 1])) return 0;
  let j = i + 2;
  while (j < chars.length && /[0-9.]/.test(chars[j])) j++;
  if (!fence(chars[j])) return 0;
  return j - i;
}

// A run of speech, or a timed silent pause (a caesura). `map` aligns each spoken
// character to its visible-char offset (for the highlight); `offset` is where the
// highlight rests during a pause.
type Chunk =
  { kind: "speak"; text: string; map: number[] } | { kind: "pause"; sec: number; offset: number };

/**
 * Split the script (from `startOffset`) into speak/pause chunks. Caesuras become
 * pause chunks of their configured seconds (from `caesuras`, else the default);
 * newlines become a short spoken pause. Newlines don't count as visible chars.
 */
function buildChunks(
  script: string,
  startOffset: number,
  caesuras: Caesura[],
): { chunks: Chunk[]; total: number } {
  const chars = Array.from(script);
  const total = chars.filter((c) => c.charCodeAt(0) !== 10).length;
  const durByPos = new Map(caesuras.map((c) => [c.pos, c.dur]));
  const start = Math.floor(Math.max(0, startOffset));
  const chunks: Chunk[] = [];
  let text = "";
  let map: number[] = [];
  let vis = 0;
  let i = 0;
  while (i < chars.length && vis < start) {
    if (chars[i].charCodeAt(0) !== 10) vis++;
    i++;
  }
  const flush = () => {
    if (text.length) {
      chunks.push({ kind: "speak", text, map });
      text = "";
      map = [];
    }
  };
  while (i < chars.length) {
    const c = chars[i];
    if (c.charCodeAt(0) === 10) {
      for (const ch of ". ") {
        text += ch;
        map.push(vis);
      }
      i++;
      continue;
    }
    const dlen = caesuraDashesAt(chars, i);
    if (dlen > 0) {
      flush();
      chunks.push({
        kind: "pause",
        sec: durByPos.get(vis) ?? CAESURA_DEFAULT_SECS,
        offset: Math.min(total, vis + dlen),
      });
      vis += dlen;
      i += dlen;
      continue;
    }
    text += c;
    map.push(vis);
    vis++;
    i++;
  }
  flush();
  return { chunks, total };
}

// Voices load asynchronously the first time. Resolve once they're ready, or after
// a short timeout — an empty list then means "no web voices here" (i.e. Linux).
function voicesReady(): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return Promise.resolve(false);
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve(true);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.speechSynthesis.onvoiceschanged = null;
      resolve(window.speechSynthesis.getVoices().length > 0);
    };
    window.speechSynthesis.onvoiceschanged = finish;
    window.setTimeout(finish, 500);
  });
}

type Session = {
  raf: number;
  nativeTimer: number;
  paceStart: number;
  pauseTimer: number;
  native: boolean;
  boundarySeen: boolean;
};
let current: Session | null = null;

function teardown(): void {
  if (!current) return;
  if (current.raf) cancelAnimationFrame(current.raf);
  if (current.nativeTimer) window.clearTimeout(current.nativeTimer);
  if (current.paceStart) window.clearTimeout(current.paceStart);
  if (current.pauseTimer) window.clearTimeout(current.pauseTimer);
  if (current.native) void ttsStopNative().catch(() => undefined);
  current = null;
}

/** Stop any in-progress reading (web or native), without firing `onEnd`. */
export function stopReading(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  teardown();
}

/**
 * Speak the script from `startOffset` at the teleprompter's pace, pausing at each
 * caesura for its configured seconds. `onProgress` reports the visible-char offset
 * of the word being spoken (for the preview highlight); `onEnd` fires when the
 * whole read finishes so the caller can reset.
 */
export async function readAloud(
  script: string,
  charsPerSec: number,
  onEnd: () => void,
  startOffset = 0,
  onProgress?: (visibleOffset: number) => void,
  caesuras: Caesura[] = [],
): Promise<void> {
  stopReading();
  const { chunks, total } = buildChunks(script, startOffset, caesuras);
  if (chunks.length === 0) {
    onEnd();
    return;
  }
  const rate = paceToRate(charsPerSec);
  const session: Session = {
    raf: 0,
    nativeTimer: 0,
    paceStart: 0,
    pauseTimer: 0,
    native: false,
    boundarySeen: false,
  };
  current = session;

  const web = await voicesReady();
  if (current !== session) return; // stopped while awaiting voices

  const finish = () => {
    if (current === session) {
      teardown();
      onEnd();
    }
  };

  // Pace-matched highlight across ONE speak segment [segStart, segEnd] — the sole
  // driver where there are no word boundaries (macOS/Linux); on Windows/Chromium
  // it is delayed so boundaries fire first and preempt it (no forward-then-back).
  const startPace = (segStart: number, segEnd: number) => {
    if (current !== session || session.boundarySeen) return;
    const t0 = performance.now();
    const tick = () => {
      if (current !== session || session.boundarySeen) return;
      const off = Math.min(segEnd, segStart + charsPerSec * ((performance.now() - t0) / 1000));
      onProgress?.(Math.min(total, off));
      session.raf = requestAnimationFrame(tick);
    };
    session.raf = requestAnimationFrame(tick);
  };

  let idx = 0;
  const playNext = () => {
    if (current !== session) return;
    // Stop the previous segment's highlight drivers.
    if (session.raf) {
      cancelAnimationFrame(session.raf);
      session.raf = 0;
    }
    if (session.paceStart) {
      window.clearTimeout(session.paceStart);
      session.paceStart = 0;
    }
    if (idx >= chunks.length) {
      finish();
      return;
    }
    const chunk = chunks[idx++];
    if (chunk.kind === "pause") {
      onProgress?.(chunk.offset); // hold the highlight at the caesura
      session.pauseTimer = window.setTimeout(playNext, chunk.sec * 1000);
      return;
    }
    // Speak chunk.
    session.boundarySeen = false;
    const segStart = chunk.map[0] ?? startOffset;
    const segEnd = (chunk.map[chunk.map.length - 1] ?? segStart) + 1;
    if (web) {
      const u = new SpeechSynthesisUtterance(chunk.text);
      u.rate = rate;
      let advanced = false;
      const cont = () => {
        if (advanced || current !== session) return;
        advanced = true;
        playNext();
      };
      u.onend = cont;
      u.onerror = cont;
      if (onProgress) {
        const prog = onProgress;
        // Delay the pace fallback so boundaries preempt it (anchored to onstart to
        // absorb cold-start latency); a boundary cancels it.
        session.paceStart = window.setTimeout(() => startPace(segStart, segEnd), 1200);
        u.onstart = () => {
          if (current !== session || session.boundarySeen) return;
          if (session.paceStart) window.clearTimeout(session.paceStart);
          session.paceStart = window.setTimeout(() => startPace(segStart, segEnd), 300);
        };
        u.onboundary = (e) => {
          session.boundarySeen = true;
          if (session.paceStart) {
            window.clearTimeout(session.paceStart);
            session.paceStart = 0;
          }
          if (session.raf) {
            cancelAnimationFrame(session.raf);
            session.raf = 0;
          }
          const ci = e.charIndex ?? 0;
          let end = chunk.text.indexOf(" ", ci);
          if (end < 0) end = chunk.text.length;
          const off =
            (chunk.map[Math.min(end, chunk.map.length) - 1] ??
              chunk.map[chunk.map.length - 1] ??
              segStart) + 1;
          prog(Math.min(total, off));
        };
      }
      window.speechSynthesis.speak(u);
      return;
    }
    // Native fallback (Linux): no boundaries or onend; pace-drive the highlight and
    // chain by an estimated segment duration.
    session.native = true;
    void ttsSpeakNative(chunk.text, rate).catch(() => undefined);
    if (onProgress) startPace(segStart, segEnd);
    const secs = chunk.text.length / (rate * BASELINE_CPS);
    session.nativeTimer = window.setTimeout(playNext, secs * 1000 + 150);
  };

  playNext();
}
