/**
 * The shared chrome class strings every dialog and toolbar draws from.
 *
 * These live in one module for the same reason the modal backdrop does (SR-1,
 * see `ModalShell.tsx`): copies drift. Before this file existed the button
 * string was pasted into four panels under three different names, and the
 * primary button had **already** split into two hover behaviours — the EULA
 * gate's "I Agree" brightened on hover while Settings' "Apply", Updates' "Yes",
 * and the bug reporter's "Open GitHub" did not.
 *
 * There is a second, quieter reason to keep them here. The light theme re-tints
 * these **exact** utility class names in `styles/global.css`, and
 * `scripts/theme-lint.mjs` can only check that each utility has *an* override —
 * it cannot see that four copies exist. Retinting one copy while another drifts
 * would fail silently, in one dialog only.
 */

/** Shape only — no colour. Both button variants build on this. */
const BUTTON_BASE = "rounded-md border px-3 py-1.5 text-xs";

/** The default button: quiet, white-alpha hover. */
export const BUTTON = `${BUTTON_BASE} border-white/10 text-havoc-text hover:bg-white/10`;

/**
 * The confirming action — Apply, I Agree, Yes/update now, Open GitHub issue.
 *
 * Deliberately NOT `${BUTTON} + accent`: both variants set a hover background,
 * and stacking them would leave the winner to CSS source order rather than to
 * the class list, which is exactly the kind of thing that looks fine until it
 * doesn't. Building both from `BUTTON_BASE` keeps the two hovers exclusive.
 */
export const PRIMARY =
  `${BUTTON_BASE} border-havoc-accent/60 bg-havoc-accent/15 font-semibold ` +
  `text-havoc-text hover:bg-havoc-accent/25 disabled:opacity-40`;

/** A single-line text input / select. */
export const FIELD =
  "w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-havoc-text";

/** A multi-line editable textarea. */
export const TEXTAREA = `${FIELD} resize-none`;

/** A read-only monospace textarea — crash-report previews, release notes. */
export const READONLY_FIELD =
  "w-full resize-none rounded-md border border-white/10 bg-white/5 px-2 py-1.5 " +
  "font-mono text-[10px] leading-snug text-havoc-muted";

/** A dialog's inner body. Callers add their own width. */
export const DIALOG_BODY = "flex max-w-full flex-col gap-4 p-5";

/** A dialog's heading. Its `id` must match the `labelledBy` passed to ModalShell. */
export const DIALOG_TITLE = "m-0 text-sm font-bold tracking-wide";

/** A dialog's action row, ruled off from the body above it. */
export const DIALOG_FOOTER = "flex justify-end gap-2 border-t border-white/10 pt-3";

/**
 * An inline error line. `role="alert"` is an accessibility contract, so the
 * class string and the role belong together rather than being re-typed per
 * panel — they had already begun to diverge.
 */
export const ERROR_LINE = "m-0 text-[11px] text-red-300";
