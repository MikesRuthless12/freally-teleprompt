import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { VoiceCommandEvent } from "./types";

/**
 * Backend → UI events (FT-31 / FT-35). The recogniser and follower run on
 * background threads and push results here rather than being polled.
 *
 * Each helper resolves an unlisten function; on a host without the event bridge
 * (a unit test, a lost webview) it resolves a no-op instead of throwing, so the
 * caller's cleanup path is always safe to run.
 */

const NOOP: UnlistenFn = () => {};

/** Subscribe to `event`, delivering just its payload; safe to call with no host. */
function listenSafe<T>(event: string, handler: (payload: T) => void): Promise<UnlistenFn> {
  try {
    return listen<T>(event, (e) => handler(e.payload)).catch(() => NOOP);
  } catch {
    return Promise.resolve(NOOP);
  }
}

/** A recognised voice command — bind it to the transport (FT-31). */
export const onVoiceCommand = (handler: (event: VoiceCommandEvent) => void): Promise<UnlistenFn> =>
  listenSafe("voice:command", handler);

/** Whether the microphone is open for commands — drives the live indicator (FT-31). */
export const onVoiceListening = (handler: (live: boolean) => void): Promise<UnlistenFn> =>
  listenSafe("voice:listening", handler);

/** The reading position (visible-character offset) while voice-following (FT-35). */
export const onVoiceOffset = (handler: (offset: number) => void): Promise<UnlistenFn> =>
  listenSafe("voice:offset", handler);

/** Whether the follower is confidently tracking the reader; drives the
 * degrade-to-manual fallback and the tracking indicator (FT-35). */
export const onVoiceTracking = (handler: (tracking: boolean) => void): Promise<UnlistenFn> =>
  listenSafe("voice:tracking", handler);

/** A voice error (mic could not open, model could not load) — surface it so a
 * failed session does not leave a toggle showing "on" over a dead engine. */
export const onVoiceError = (handler: (message: string) => void): Promise<UnlistenFn> =>
  listenSafe("voice:error", handler);
