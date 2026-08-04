import type { TeleprompterState } from "../api/types";
import { useT } from "../i18n/t";
import type { Caesura } from "../lib/caesura";
import { type Marker, adjacentMarker, currentMarker } from "../lib/markers";
import { useLiveOffset } from "../lib/useReadClock";

/**
 * The marker jump list and its next/previous controls (FT-M05).
 *
 * Renders **nothing at all** when the script has no markers. A prompter's
 * operator surface is already dense, and a permanently-disabled control that
 * says "no markers" teaches nobody how to make one — the documentation does
 * that. The controls appearing the moment a `#` line or a label exists is
 * itself the affordance.
 *
 * A native `<select>` rather than a popover: it is the one list control that is
 * already keyboard-navigable, already type-ahead searchable, and already
 * rendered by the OS at the OS's own size — which on a shoot, on somebody
 * else's laptop, at somebody else's DPI, is worth more than matching the app's
 * chrome exactly.
 *
 * # It owns a clock, and that is why it is a component
 *
 * "Next" and "previous" are relative to where the read is **now**, and
 * `state.offset` is only where the last broadcast put it — see `useLiveOffset`.
 * Running that clock here rather than in the shell is deliberate: it ticks 20
 * times a second, and in `App` it would re-render the whole operator window at
 * that rate. `PaceWarning` is its own component for the same reason.
 */
export function MarkerJump({
  markers,
  state,
  caesuras,
  overrideOffset,
  onSeek,
}: {
  markers: readonly Marker[];
  state: TeleprompterState;
  caesuras: Caesura[];
  /** Read-aloud's preview-local offset, when that mode is driving instead of
   * the shared scroll — the same override every other surface takes. */
  overrideOffset?: number;
  onSeek: (offset: number) => void;
}) {
  const t = useT();
  // Before the early return: a hook cannot be called conditionally, and the
  // `active` flag is what stops the timer running for a script with no markers.
  const live = useLiveOffset(state, caesuras, markers.length > 0 && overrideOffset === undefined);
  const offset = overrideOffset ?? live;
  if (markers.length === 0) return null;

  const here = currentMarker(markers, offset);
  const previous = adjacentMarker(markers, offset, -1);
  const next = adjacentMarker(markers, offset, 1);
  const jump = (marker: Marker | null) => {
    if (marker) onSeek(marker.offset);
  };

  return (
    <div className="flex items-center gap-1.5" data-testid="marker-jump">
      <button
        type="button"
        className="marker-step"
        data-testid="marker-previous"
        // Disabled rather than hidden: a transport control that vanishes at the
        // top of the script moves the two beside it under the operator's hand.
        disabled={previous === null}
        title={t("marker-previous")}
        aria-label={t("marker-previous")}
        onClick={() => jump(previous)}
      >
        <span aria-hidden="true">◀</span>
      </button>
      <select
        className="marker-select"
        data-testid="marker-list"
        aria-label={t("marker-list")}
        // `here` is null above the first marker, and an empty value is how a
        // <select> shows "none of these" without inventing a placeholder row
        // that could be chosen.
        value={here ? String(here.index) : ""}
        onChange={(e) => {
          const chosen = markers[Number(e.target.value)];
          if (chosen) onSeek(chosen.offset);
        }}
      >
        {here === null && <option value="">{t("marker-none-yet")}</option>}
        {markers.map((marker) => (
          <option key={marker.index} value={String(marker.index)}>
            {marker.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="marker-step"
        data-testid="marker-next"
        disabled={next === null}
        title={t("marker-next")}
        aria-label={t("marker-next")}
        onClick={() => jump(next)}
      >
        <span aria-hidden="true">▶</span>
      </button>
    </div>
  );
}
