import { ModalShell } from "../components/ModalShell";
import { BUTTON, DIALOG_BODY, DIALOG_FOOTER, DIALOG_TITLE, PRIMARY } from "../components/styles";
import { useT } from "../i18n/t";
import type { Caesura } from "../lib/caesura";
import {
  type Sample,
  type SectionTiming,
  sections,
  suggestedSpeed,
  timings,
} from "../lib/rehearsal";
import { fmtTime } from "../lib/time";

/**
 * The rehearsal timing report (FT-N01).
 *
 * One row per section: what the script said it would take, what it actually
 * took, and the difference. The difference is the column the reader is here
 * for, so it is the one that carries the colour.
 *
 * A section the read never finished is shown as unmeasured rather than as zero
 * or omitted — "you stopped here" is information, and dropping the row would
 * make the report look like a script with fewer sections than it has.
 */
export function RehearsalReport({
  open,
  script,
  samples,
  caesuras,
  skipWords,
  speed,
  onClose,
  onApplySpeed,
}: {
  open: boolean;
  script: string;
  /** The recording, read exactly once — here. */
  samples: readonly Sample[];
  caesuras: readonly Caesura[];
  /** The keyword list (FT-M02): where a script uses labels, they are also where
   * its sections begin. */
  skipWords: readonly string[];
  /** The speed the read was planned at, for the suggestion's before/after. */
  speed: number;
  onClose: () => void;
  onApplySpeed: (next: number) => void;
}) {
  const t = useT();

  // Built here rather than in the shell, and only when the dialog is actually
  // on screen. `timings` is O(sections × samples), and its inputs change four
  // times a second for the whole length of a rehearsal — in the shell it ran
  // continuously to produce a table nobody was looking at. `ModalShell` renders
  // nothing when closed, so this early return is the same condition stated
  // where the work is.
  if (!open) return null;
  const rows: SectionTiming[] = timings(sections(script, skipWords), samples, speed, caesuras);
  const suggested = suggestedSpeed(rows, speed);
  const anyMeasured = rows.some((row) => row.actualSec !== null);

  return (
    <ModalShell open={open} onClose={onClose} labelledBy="rehearsal-title">
      <div data-testid="rehearsal-report" className={`w-[34rem] max-w-[90vw] ${DIALOG_BODY}`}>
        <h2 id="rehearsal-title" className={DIALOG_TITLE}>
          {t("rehearsal-title")}
        </h2>

        {!anyMeasured ? (
          <p className="text-havoc-muted m-0 text-[11px] leading-snug">{t("rehearsal-empty")}</p>
        ) : (
          <>
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="text-havoc-muted text-left">
                    <th className="py-1 pr-2 font-normal">{t("rehearsal-col-section")}</th>
                    <th className="py-1 pr-2 text-right font-normal">
                      {t("rehearsal-col-planned")}
                    </th>
                    <th className="py-1 pr-2 text-right font-normal">
                      {t("rehearsal-col-actual")}
                    </th>
                    <th className="py-1 text-right font-normal">{t("rehearsal-col-delta")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    // `null` means the read stopped inside this section, so
                    // there is no duration to compare — said plainly rather
                    // than shown as a zero that would read as "instant".
                    const delta = row.actualSec === null ? null : row.actualSec - row.estSec;
                    return (
                      <tr
                        key={row.section.index}
                        data-testid="rehearsal-row"
                        className="border-t border-white/10"
                      >
                        <td className="max-w-0 truncate py-1 pr-2" title={row.section.label}>
                          {row.section.label}
                        </td>
                        <td className="py-1 pr-2 text-right font-mono tabular-nums">
                          {fmtTime(row.estSec)}
                        </td>
                        <td className="py-1 pr-2 text-right font-mono tabular-nums">
                          {row.actualSec === null ? "—" : fmtTime(row.actualSec)}
                        </td>
                        <td
                          data-testid="rehearsal-delta"
                          className={`py-1 text-right font-mono tabular-nums ${
                            delta !== null && delta > 0 ? "text-amber-300" : "text-havoc-muted"
                          }`}
                        >
                          {delta === null
                            ? t("rehearsal-unfinished")
                            : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${fmtTime(Math.abs(delta))}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {suggested !== null && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-2">
                <span className="text-[11px] leading-snug">
                  {t("rehearsal-suggest", {
                    from: speed.toFixed(1),
                    to: suggested.toFixed(1),
                  })}
                </span>
                <button
                  type="button"
                  data-testid="rehearsal-apply-speed"
                  className={`${BUTTON} shrink-0`}
                  onClick={() => onApplySpeed(suggested)}
                >
                  {t("rehearsal-suggest-apply")}
                </button>
              </div>
            )}
          </>
        )}

        <div className={DIALOG_FOOTER}>
          <button type="button" data-testid="rehearsal-close" className={PRIMARY} onClick={onClose}>
            {t("rehearsal-close")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
