import { useEffect, useRef, type ReactNode } from "react";

/**
 * Open shells, oldest first — the last entry is the topmost dialog and the only
 * one Escape may close. Module-level because the shells are siblings in the
 * tree with no shared ancestor to hold it.
 */
const ESC_STACK: object[] = [];

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

  // Esc closes — but only the TOPMOST dialog.
  //
  // Every shell binds to the same node (`document`), where `stopPropagation` is
  // useless: it stops the event travelling to *other* nodes, not to sibling
  // listeners on this one. So two open dialogs both used to close on one Esc,
  // and `stopImmediatePropagation` would not have saved it either — listeners
  // fire in registration order, so the BOTTOM dialog would have won. Hence an
  // explicit stack: whoever registered last is on top, and only they respond.
  useEffect(() => {
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

  // Move focus into the dialog so the keyboard doesn't stay on the page behind.
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    first?.focus();
  }, [open]);

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
        className="modal-panel"
      >
        {children}
      </div>
    </div>
  );
}
