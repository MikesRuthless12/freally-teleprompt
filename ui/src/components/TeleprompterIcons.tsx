// Hand-authored inline SVG transport icons (FT-13), replacing the text glyphs
// the Phase 0 toolbar used. No icon library — each is a tiny 24×24
// `currentColor` path, so it inherits the button's colour and needs no
// light-theme override of its own. Sized by the caller via `className`
// (e.g. "h-5 w-5"). This file exports only components, which keeps
// react-refresh happy.

function Svg({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

/** ▶ Play. */
export const PlayIcon = ({ className }: { className?: string }) => (
  <Svg className={className} path="M8 5v14l11-7z" />
);

/** ⏸ Pause. */
export const PauseIcon = ({ className }: { className?: string }) => (
  <Svg className={className} path="M6 5h4v14H6zM14 5h4v14h-4z" />
);

/** ■ Stop. */
export const StopIcon = ({ className }: { className?: string }) => (
  <Svg className={className} path="M6 6h12v12H6z" />
);

/** ⟪ Rewind / step back (double left triangle). */
export const StepBackIcon = ({ className }: { className?: string }) => (
  <Svg className={className} path="M11 6 3 12l8 6zM20 6l-8 6 8 6z" />
);

/** ⟫ Fast-forward / step forward (double right triangle). */
export const StepForwardIcon = ({ className }: { className?: string }) => (
  <Svg className={className} path="M4 6l8 6-8 6zM13 6l8 6-8 6z" />
);

/** ⟲ Restart / to top (skip-to-start: a bar plus a left triangle). */
export const RestartIcon = ({ className }: { className?: string }) => (
  <Svg className={className} path="M6 6h2.4v12H6zM20 6 9.5 12 20 18z" />
);
