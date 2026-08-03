import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * Backend → UI events (FT-33). The recogniser runs on a background thread and
 * pushes results here rather than being polled.
 *
 * The `voice:` prefix predates dictation — it was shared with voice commands and
 * voice-following, both since removed. Kept because it is the wire contract
 * between Rust and this file, and renaming it would buy nothing.
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

/** A completed dictated utterance, already trimmed — insert it into the script. */
export const onVoiceDictation = (handler: (text: string) => void): Promise<UnlistenFn> =>
  listenSafe("voice:dictation", handler);

/** Whether dictation is running; drives its indicator and the toggle's state. */
export const onVoiceDictating = (handler: (on: boolean) => void): Promise<UnlistenFn> =>
  listenSafe("voice:dictating", handler);

/** A voice error (mic could not open, model could not load) — surface it so a
 * failed session does not leave a toggle showing "on" over a dead engine. */
export const onVoiceError = (handler: (message: string) => void): Promise<UnlistenFn> =>
  listenSafe("voice:error", handler);
