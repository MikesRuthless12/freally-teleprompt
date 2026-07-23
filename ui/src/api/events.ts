import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { VoiceCommandEvent } from "./types";

/**
 * Backend → UI events (FT-31). The recogniser runs on a background thread and
 * pushes results here rather than being polled.
 *
 * Each helper resolves an unlisten function; on a host without the event bridge
 * (a unit test, a lost webview) it resolves a no-op instead of throwing, so the
 * caller's cleanup path is always safe to run.
 */

const NOOP: UnlistenFn = () => {};

/** A recognised voice command — bind it to the transport. */
export function onVoiceCommand(handler: (event: VoiceCommandEvent) => void): Promise<UnlistenFn> {
  try {
    return listen<VoiceCommandEvent>("voice:command", (e) => handler(e.payload)).catch(() => NOOP);
  } catch {
    return Promise.resolve(NOOP);
  }
}

/** Whether the microphone is currently open — drives the live indicator. */
export function onVoiceListening(handler: (live: boolean) => void): Promise<UnlistenFn> {
  try {
    return listen<boolean>("voice:listening", (e) => handler(e.payload)).catch(() => NOOP);
  } catch {
    return Promise.resolve(NOOP);
  }
}
