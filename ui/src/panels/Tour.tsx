import { useState } from "react";

import { ModalShell } from "../components/ModalShell";
import { BUTTON, DIALOG_BODY, DIALOG_FOOTER, DIALOG_TITLE, PRIMARY } from "../components/styles";
import { useT } from "../i18n/t";

/**
 * The onboarding tour's steps, in order (FT-50).
 *
 * Each id names a `tour-<id>-title` / `tour-<id>-body` pair in the catalogs.
 * Exported because `i18n.test.ts` asserts every one of those keys resolves:
 * the keys are BUILT from the id, so `i18n-lint`'s scanner — which only matches
 * a bare string literal in the call — cannot check them, exactly like the
 * typeface picker's `settings-font-${id}`. Without that test a renamed step
 * would ship showing a raw id as its heading.
 *
 * (Do not spell that scanner's pattern out here, either: it reads comments too,
 * and a quoted example inside one is indistinguishable from a real call.)
 */
export const TOUR_STEPS = ["welcome", "write", "read", "show"] as const;

/**
 * The first-run tour: four modal steps over what the app is and where the four
 * things you actually do live.
 *
 * Deliberately **not** a spotlight/coach-mark tour. SR-1 requires every dialog
 * to blur and dim what is behind it, so an overlay that points at a control
 * behind the backdrop would be pointing at something the backdrop has just
 * blurred. Cutting a hole in the shared shell to make that work would mean
 * re-implementing the standing modal behaviour per dialog, which is the exact
 * drift SR-1 exists to prevent. Four plain steps say the same things and stay
 * inside the shell every other dialog uses.
 *
 * It never blocks: Skip, Esc and a backdrop click all leave, and every exit
 * records the tour as seen (`onClose`'s job in the shell) so it does not
 * reappear on the next launch.
 *
 * Mounted only while it is open — the shell renders `{tourOpen && <TourDialog…`
 * the way it already does for `UpdatesDialog`. That is what lets `at` be plain
 * `useState(0)`: a replay from Settings is a fresh mount, so it starts at step
 * one without a re-seed latch, and nothing builds this tree on the renders the
 * read-aloud pace fallback drives at up to 60Hz.
 */
export function TourDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [at, setAt] = useState(0);

  const total = TOUR_STEPS.length;
  const step = TOUR_STEPS[at];
  const last = at === total - 1;

  return (
    <ModalShell open onClose={onClose} labelledBy="tour-title">
      <div data-testid="tour-dialog" className={`${DIALOG_BODY} w-[26rem]`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="tour-title" className={DIALOG_TITLE}>
            {t(`tour-${step}-title`)}
          </h2>
          {/* `role="status"` so a screen reader announces the move between
              steps — the heading and body both change under the same dialog,
              which is otherwise silent. */}
          <span
            role="status"
            data-testid="tour-progress"
            className="text-havoc-muted shrink-0 text-[11px] tabular-nums"
          >
            {t("tour-step", { n: at + 1, total })}
          </span>
        </div>

        <p className="text-havoc-muted m-0 text-xs leading-relaxed">{t(`tour-${step}-body`)}</p>

        <div className={DIALOG_FOOTER}>
          {/* Skip sits apart from Back/Next: it leaves the tour, it does not
              move through it. */}
          <button
            type="button"
            data-testid="tour-skip"
            className={`${BUTTON} mr-auto`}
            onClick={onClose}
          >
            {t("tour-skip")}
          </button>
          <button
            type="button"
            data-testid="tour-back"
            className={BUTTON}
            disabled={at === 0}
            onClick={() => setAt(at - 1)}
          >
            {t("tour-back")}
          </button>
          <button
            type="button"
            data-testid="tour-next"
            className={PRIMARY}
            onClick={() => (last ? onClose() : setAt(at + 1))}
          >
            {last ? t("tour-done") : t("tour-next")}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
