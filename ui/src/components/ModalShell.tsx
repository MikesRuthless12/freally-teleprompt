import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

import { pushModal } from "./modalStack";

/**
 * Open shells, oldest first — the last entry is the topmost dialog and the only
 * one Escape may close. Module-level because the shells are siblings in the
 * tree with no shared ancestor to hold it.
 */
const ESC_STACK: object[] = [];

/**
 * What counts as a tab stop, for both the initial focus and the trap below.
 * One string, because the two must agree: a dialog whose first tab stop is not
 * the element that was focused on open would jump backwards on the first Tab.
 *
 * ⚠️ Keep in step with the `:focus-visible` floor in `styles/global.css`, which
 * spells out the same set in CSS — that decides what shows a focus ring, this
 * decides what Tab can reach, and a control in one list but not the other
 * either gets a ring it cannot be tabbed to or is tabbable with nothing to show
 * for it. The two cannot share a string across CSS and TS, so the coupling is
 * a comment in both directions and nothing more.
 */
const FOCUSABLE =
  "button, [href], input, select, textarea, [contenteditable], [tabindex]:not([tabindex='-1'])";

/** The tab stops actually reachable right now — disabled and display:none
 * elements are in the DOM but are not stops, and treating them as the first or
 * last one sends focus somewhere that cannot take it. */
function tabStops(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && (el.offsetWidth > 0 || el.offsetHeight > 0),
  );
}

/**
 * The shared modal shell (SR-1, Havoc-suite-wide).
 *
 * Every dialog in the app renders through this — never a bespoke overlay —
 * because the background blur is a standing UI requirement and re-implementing
 * it per dialog is how it drifts. The backdrop softly blurs AND dims whatever is
 * behind it while the dialog itself stays crisp.
 *
 * Two things the CSS side owns (see `styles/global.css`, `.modal-backdrop`):
 *
 *   * `prefers-reduced-motion` — the blur is never animated in.
 *   * `@supports not (backdrop-filter: blur(1px))` and
 *     `prefers-reduced-transparency` — fall back to a plain, heavier dim, so a
 *     browser or user that refuses the blur still gets the separation.
 *
 * Stacking: a companion dialog opened ABOVE another modal passes
 * `stacked` — it dims without re-blurring, so the modal underneath stays crisp
 * instead of being smeared by a second blur pass.
 *
 * Focus is owned here too (FT-50), for the same "once, not per dialog" reason:
 * opening moves the caret to the first tab stop, Tab and Shift+Tab wrap inside
 * the panel rather than walking out onto the blurred page behind it, and
 * closing hands focus back to whatever opened the dialog.
 */
export function ModalShell({
  open,
  onClose,
  labelledBy,
  stacked = false,
  children,
}: {
  open: boolean;
  /** Esc and a backdrop click both call this. Omit to make the dialog modal-only. */
  onClose?: () => void;
  /** `id` of the element naming this dialog, for `aria-labelledby`. */
  labelledBy?: string;
  /** True when this dialog sits above another modal (see the class docs). */
  stacked?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Did the press that began this click land on the backdrop? See the handler.
  const pressedBackdrop = useRef(false);

  // Openness is tracked for EVERY shell, dismissible or not — see
  // `modalStack.ts`. A layout effect for the same reason the Escape stack is
  // one: the window-level key dispatcher must not treat a painted dialog as
  // absent, or a bare Space bound to the transport fires from inside it.
  useLayoutEffect(() => {
    if (!open) return;
    return pushModal();
  }, [open]);

  // Esc closes — but only the TOPMOST dialog.
  //
  // Every shell binds to the same node (`document`), where `stopPropagation` is
  // useless: it stops the event travelling to *other* nodes, not to sibling
  // listeners on this one. So two open dialogs both used to close on one Esc,
  // and `stopImmediatePropagation` would not have saved it either — listeners
  // fire in registration order, so the BOTTOM dialog would have won. Hence an
  // explicit stack: whoever registered last is on top, and only they respond.
  //
  // A LAYOUT effect, not a passive one, and that is load-bearing rather than a
  // preference. A passive effect runs after the browser has painted, so there
  // is a window — one frame, longer on a loaded machine — where the dialog is
  // on screen and Esc does nothing at all. Every other dialog hid it, because
  // the user has to click something to open one and that click outlasts the
  // gap; the tour is the only dialog mounted ALREADY OPEN, so its first
  // keystroke can be the one that lands in the window. macOS CI failed exactly
  // there, deterministically, while Windows and Linux won the race. Registering
  // before paint makes "visible" and "dismissible" the same instant.
  useLayoutEffect(() => {
    if (!open || !onClose) return;
    const token = {};
    ESC_STACK.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (ESC_STACK[ESC_STACK.length - 1] !== token) return;
      e.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const at = ESC_STACK.indexOf(token);
      if (at >= 0) ESC_STACK.splice(at, 1);
    };
  }, [open, onClose]);

  // Move focus into the dialog so the keyboard doesn't stay on the page behind,
  // and give it back to whatever had it when the dialog closes.
  //
  // The hand-back is the half that is easy to forget and obvious once it is
  // missing: closing Settings with Esc used to drop focus onto `<body>`, so the
  // next Tab restarted from the top of the window rather than from the gear the
  // user had just pressed. A dialog that swallows the caret is a dialog a
  // keyboard user has to climb out of every time.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const opener = document.activeElement as HTMLElement | null;
    // Only ever capture an opener from OUTSIDE the panel. React StrictMode
    // invokes an effect twice in development, and the second pass would
    // otherwise capture the very button the first pass had just focused — so
    // on close the caret would be handed to one of this dialog's own dead
    // nodes. The tour is the dialog that exposed it: it is the only one
    // mounted already open.
    const previous = opener && !panel?.contains(opener) ? opener : null;
    // The first tab stop, or the PANEL itself when there is none yet. The
    // update dialog opens in its "checking" phase with no buttons at all, so
    // `[0]?.focus()` was a no-op there: focus stayed on the toolbar button
    // behind the backdrop, the panel-bound trap below therefore never saw a
    // keystroke, and Tab walked the page behind the modal for the dialog's
    // entire lifetime — including after its buttons appeared.
    if (panel) (tabStops(panel)[0] ?? panel).focus();
    return () => {
      // Hand the caret back — but only when nothing else has deliberately
      // taken it (a stacked dialog, most of all). "Nothing else" means the
      // focus has fallen to `<body>`, to nowhere, or onto a node that has just
      // been detached, which is what a backdrop click leaves behind.
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body || !active.isConnected) previous?.focus?.();
    };
  }, [open]);

  // Pull focus back when it escapes the panel altogether.
  //
  // The trap below is panel-bound, so it only fires while focus is INSIDE the
  // dialog. A control that becomes `disabled` while focused is blurred by the
  // browser to `<body>` — which is outside — and from there the trap can never
  // fire again: Tab walks straight onto the toolbar behind the open modal, and
  // Enter activates it. Two real cases: the tour's **Back** disabling itself on
  // step one, and Settings' **Apply** disabling itself the moment it is pressed.
  //
  // A post-render check rather than a blur handler, deliberately: Chromium does
  // NOT fire a bubbling `focusout` when the focused element becomes `disabled`
  // — it moves focus to `<body>` silently — so a handler never sees the one
  // case this exists for. (Written as one first, and the regression test stayed
  // red.) Anything that can disable a control re-renders to do it, which is
  // exactly when this runs. No dep array on purpose.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const active = document.activeElement;
    // Only when focus is genuinely LOST. If it sits on a live element outside
    // this panel then something took it deliberately — a dialog stacked above,
    // most of all — and snatching it back would be the worse bug.
    if (active && active !== document.body && active.isConnected) return;
    (tabStops(panel)[0] ?? panel).focus();
  });

  // Keep Tab inside the dialog. `aria-modal` tells a screen reader the rest of
  // the page is inert; it does nothing at all to the tab order, so without this
  // three Tabs walked out of the dialog and onto the toolbar behind it — which
  // is still visible through the SR-1 blur, so it reads as a bug rather than as
  // a feature.
  //
  // Bound to the PANEL, not to `document`: the event bubbles from whatever is
  // focused, so only the dialog that actually holds focus ever sees it. Two
  // stacked dialogs therefore need no stack of their own here, unlike Esc.
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const stops = tabStops(panel);
    if (stops.length === 0) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  return (
    <div
      className={`modal-backdrop ${stacked ? "modal-backdrop-stacked" : ""}`}
      // A click on the backdrop itself (not on the dialog) dismisses — but the
      // press must have STARTED there too.
      //
      // Checking only the click target loses work: a `click` whose mousedown and
      // mouseup have different targets is dispatched on their common ancestor,
      // which for "pressed inside the panel, released outside it" is the
      // backdrop. So drag-selecting the crash-report preview, or grabbing the
      // dialog and sweeping past its edge, silently discarded a Settings draft.
      onMouseDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        // `-1` so `panel.focus()` above can land here when the dialog has no
        // tab stop of its own, without the panel itself becoming one.
        tabIndex={-1}
        onKeyDown={onPanelKeyDown}
        className="modal-panel"
      >
        {children}
      </div>
    </div>
  );
}
