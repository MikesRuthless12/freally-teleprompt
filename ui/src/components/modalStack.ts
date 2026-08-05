/**
 * How many dialogs are open, app-wide.
 *
 * Its own module rather than a second export from `ModalShell.tsx` because a
 * component file that also exports a plain function breaks React Fast Refresh —
 * and this is read from `App.tsx`, not just from the shell.
 *
 * Deliberately NOT the same structure as `ModalShell`'s Escape stack. That one
 * holds only shells that can be *dismissed*, because only they may answer
 * Escape; this counts every open shell, including the modal-only EULA gate.
 */
let openShells = 0;

/** Register an open shell. Returns the matching release. */
export function pushModal(): () => void {
  openShells += 1;
  let released = false;
  return () => {
    // Guarded so a double-release (StrictMode's mount/unmount/remount) cannot
    // drive the count negative and make a real dialog look absent.
    if (released) return;
    released = true;
    openShells -= 1;
  };
}

/**
 * Is any dialog open right now?
 *
 * The shell's window-level key dispatcher (FT-M16) asks before acting: a modal
 * owns the keyboard while it is up. Without this, a bare `Space`, `ArrowUp` or
 * `PageDown` bound to the transport still reached `window` from inside a
 * dialog — so arrowing through Settings' category list re-paced the talent's
 * scroll mid-shoot, and `preventDefault` on Space stopped every focused button
 * in the app from activating, including the shortcut map's own rebind buttons.
 */
export function anyModalOpen(): boolean {
  return openShells > 0;
}
