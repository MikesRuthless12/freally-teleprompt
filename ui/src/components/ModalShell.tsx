import { useEffect, useRef, type ReactNode } from "react";

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

  // Esc closes. Bound on the document so it works before focus lands inside.
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
      // A click on the backdrop itself (not on the dialog) dismisses.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
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
