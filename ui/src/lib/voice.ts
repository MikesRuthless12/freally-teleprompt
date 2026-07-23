// Voice-command → transport mapping (FT-31b). Pure logic, unit-tested; the
// event wiring lives in App.tsx.
//
// A trained command's id IS the transport action it fires. Most map straight to
// an existing `teleprompter_control` action; "nextMarker" is computed here from
// the script's caesuras, since the engine has no "jump to next pause" command.

import type { TeleprompterAction } from "../api/types";
import type { Caesura } from "./caesura";

/** The commands the operator can train and bind, in the order the pane lists
 * them. Each id doubles as the action the voice event dispatches. */
export const VOICE_COMMAND_IDS = [
  "play",
  "pause",
  "faster",
  "slower",
  "nextMarker",
  "top",
] as const;

export type VoiceCommandId = (typeof VOICE_COMMAND_IDS)[number];

/** The i18n key labelling each command. Most reuse the transport labels — the
 * word is the same whether you click it or say it — so only "nextMarker" needs
 * a voice-specific string. */
export const VOICE_COMMAND_LABEL: Record<VoiceCommandId, string> = {
  play: "transport-play",
  pause: "transport-pause",
  faster: "transport-faster",
  slower: "transport-slower",
  nextMarker: "voice-cmd-next",
  top: "transport-restart",
};

/** The transport call a voice command maps to. */
export type VoiceControl = { action: TeleprompterAction; value?: number };

/**
 * The transport action a recognised command fires, or `null` when it should do
 * nothing — an unknown id, or "next pause" with no pause ahead.
 *
 * The whole mapping (ids, labels, and now behaviour) lives in this one module,
 * so it is unit-testable without a browser and cannot drift from the id list the
 * Settings pane trains against.
 */
export function voiceCommandToControl(
  id: string,
  ctx: { caesuras: Caesura[]; offset: number },
): VoiceControl | null {
  switch (id) {
    case "play":
    case "pause":
    case "faster":
    case "slower":
    case "top":
      return { action: id };
    case "nextMarker": {
      const pos = nextCaesuraPos(ctx.caesuras, ctx.offset);
      return pos === null ? null : { action: "seek", value: pos };
    }
    default:
      return null;
  }
}

/**
 * The visible-char offset of the first caesura strictly after `offset`, or
 * `null` when the reader is already past the last one. The small epsilon stops a
 * caesura the scroll is sitting exactly on from matching itself.
 */
export function nextCaesuraPos(caesuras: Caesura[], offset: number): number | null {
  for (const caesura of caesuras) {
    if (caesura.pos > offset + 1e-6) return caesura.pos;
  }
  return null;
}
