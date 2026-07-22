// App-chrome icons — the toolbar's gear and about marks. Hand-authored inline
// SVG on the same terms as `TeleprompterIcons`: a 24×24 `currentColor` path, no
// icon library, sized by the caller through `className`. This file exports only
// components, which keeps react-refresh happy.

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      {children}
    </svg>
  );
}

/** ⚙ Settings. */
export const GearIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path
      fill="currentColor"
      d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm0 5.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
    />
    <path
      fill="currentColor"
      d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1L15 3.5H11l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.3-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5zm-1.9 3.1-1.8-.8-.6.5a6 6 0 0 1-1.7 1l-.7.3-.3 2h-.8l-.3-2-.7-.3a6 6 0 0 1-1.7-1l-.6-.5-1.8.8-.4-.7 1.6-1.2-.1-.8a6 6 0 0 1 0-2l.1-.8-1.6-1.2.4-.7 1.8.8.6-.5a6 6 0 0 1 1.7-1l.7-.3.3-2h.8l.3 2 .7.3a6 6 0 0 1 1.7 1l.6.5 1.8-.8.4.7-1.6 1.2.1.8a6 6 0 0 1 0 2l-.1.8 1.6 1.2z"
    />
  </Svg>
);

/** ⓘ About — the "i" in a circle. */
export const InfoIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="7.8" r="1.1" fill="currentColor" />
    <path
      d="M12 10.8v6.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </Svg>
);
