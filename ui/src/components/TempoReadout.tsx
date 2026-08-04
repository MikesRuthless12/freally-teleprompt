import type { TeleprompterState } from "../api/types";
import { useT } from "../i18n/t";
import type { Caesura } from "../lib/caesura";
import { barBeat } from "../lib/tempo";
import { useReadClock } from "../lib/useReadClock";

/**
 * The bar and beat the read is currently on (FT-N04).
 *
 * Sits beside the reading surface, because that is where the eye already is
 * while the script moves — "sixteen bars" becomes something you can see rather
 * than something you count in your head.
 *
 * Mounted only when the operator is actually working to a tempo (BPM mode, or
 * the click switched on). A bar number over a script being read at 12 characters
 * a second is a number with no meaning attached, and the toolbar has enough in
 * it already.
 *
 * **The 20 Hz clock lives HERE, not in the shell.** It is a `setState` several
 * times a second, and in `App` it re-rendered the whole operator window —
 * including the chip editor, which is a `contenteditable` the user may be
 * typing into. Down here the same tick re-renders one `<span>`.
 *
 * During the start-countdown pre-roll it shows the **count-in** instead —
 * 4, 3, 2, 1 down to the downbeat — which is the same information a musician
 * would expect from the same four clicks.
 */
export function TempoReadout({
  state,
  caesuras,
  bpm,
  beatsPerBar,
}: {
  state: TeleprompterState;
  caesuras: Caesura[];
  bpm: number;
  beatsPerBar: number;
}) {
  const t = useT();
  const readSec = useReadClock(state, caesuras, true);
  const { bar, beat, countIn } = barBeat(readSec, bpm, beatsPerBar);

  return (
    <span
      data-testid="tempo-readout"
      // `tabular-nums` so the row does not twitch sideways as the beat counts:
      // this sits next to a scrolling script and is read at a glance.
      className="text-havoc-muted font-mono text-[11px] tabular-nums"
      // A number that changes several times a second is noise to a screen
      // reader, and the same position is already announced by the seek bar's
      // own value. Deliberately not `aria-live`.
    >
      {countIn > 0 ? t("tempo-count-in", { count: countIn }) : t("tempo-bar-beat", { bar, beat })}
    </span>
  );
}
