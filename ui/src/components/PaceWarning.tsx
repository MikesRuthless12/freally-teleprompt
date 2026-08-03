import type { TeleprompterState } from "../api/types";
import { useT } from "../i18n/t";
import type { Caesura } from "../lib/caesura";
import { PACE_WARN_SEC, paceDrift } from "../lib/rehearsal";
import { fmtTime } from "../lib/time";
import { useReadClock } from "../lib/useReadClock";

/**
 * How far the read has slipped from its plan, while rehearsing (FT-N05).
 *
 * Zero while the scroll simply runs — the wall clock and the script's own clock
 * advance together — so it says nothing at all until a pause, a scrub back, or
 * time spent catching up has opened a gap worth mentioning.
 *
 * Its own component so the 20 Hz clock behind it re-renders one `<span>` rather
 * than the whole operator window, which contains a `contenteditable` the user
 * may be typing into. Mounted only while a rehearsal is actually recording.
 */
export function PaceWarning({
  state,
  caesuras,
  /** Wall-clock seconds since the rehearsal began — pauses included. */
  elapsedSec,
  /** Where the read was, on its own clock, when the rehearsal began. */
  startReadSec,
}: {
  state: TeleprompterState;
  caesuras: Caesura[];
  elapsedSec: number;
  startReadSec: number;
}) {
  const t = useT();
  const readSec = useReadClock(state, caesuras, true);
  // Both measured from the same instant. `elapsedSec` counts from the toggle
  // and the read clock counts from the top of the script, so subtracting one
  // from the other raw is only right when the rehearsal happened to start at
  // the top — otherwise starting one a minute into a take reported "ahead by
  // 1:00" on its very first tick and never recovered.
  const drift = paceDrift(elapsedSec, readSec - startReadSec);

  // Under the threshold there is nothing worth saying, and saying it anyway
  // would flicker on and off over the ordinary slop of a human reading.
  if (Math.abs(drift) < PACE_WARN_SEC) return null;

  return (
    <span
      role="status"
      data-testid="pace-warning"
      className={`font-mono tabular-nums ${drift > 0 ? "text-amber-300" : "text-havoc-muted"}`}
    >
      {drift > 0
        ? t("pace-behind", { time: fmtTime(drift) })
        : t("pace-ahead", { time: fmtTime(-drift) })}
    </span>
  );
}
