import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { windowMinimize } from "../api/commands";
import { useT } from "../i18n/t";
import { GearIcon, InfoIcon } from "./Icons";

/**
 * The custom title bar (the app ships `decorations: false`).
 *
 * Turning the OS decorations off means we owe the user everything they gave up:
 * a drag region, minimise / maximise-restore / close, double-click-to-maximise,
 * and — the one that is easy to forget — **resizable edges**, which is what
 * `ResizeEdges` below exists for.
 *
 * The title is centred on the WINDOW, not in the leftover space between the
 * controls, which is why it is absolutely positioned rather than being a flex
 * child: a flex layout would shift it left by half the width of the button
 * cluster, and it would drift again the moment a button was added.
 */

/** Everything the window buttons need, in one place. Outside Tauri (the
 * Playwright gallery, a dev server) `getCurrentWindow()` throws, and a title bar
 * that crashes the app is worse than one that does nothing. */
function windowAction(run: (win: ReturnType<typeof getCurrentWindow>) => Promise<unknown>) {
  return () => {
    try {
      void run(getCurrentWindow()).catch(() => undefined);
    } catch {
      // No Tauri host.
    }
  };
}

const BTN =
  "flex h-8 w-11 items-center justify-center text-havoc-muted transition-colors " +
  "hover:bg-white/10 hover:text-havoc-text focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-havoc-accent/60";

export function TitleBar({
  onSettings,
  onAbout,
}: {
  /** Omitted before the agreement is accepted — there is nothing to configure
   * yet, and the gate is deliberately the only thing on screen. */
  onSettings?: () => void;
  onAbout?: () => void;
}) {
  const t = useT();
  const [maximized, setMaximized] = useState(false);

  // Keep the maximise/restore icon honest — the window can also be maximised by
  // double-clicking the drag region or by the OS (Win+Up, a snap gesture), none
  // of which come through our buttons.
  useEffect(() => {
    let win: ReturnType<typeof getCurrentWindow>;
    try {
      win = getCurrentWindow();
    } catch {
      return; // no Tauri host
    }
    let alive = true;
    const sync = () => {
      void win
        .isMaximized()
        .then((is) => {
          if (alive) setMaximized(is);
        })
        .catch(() => undefined);
    };
    sync();
    const pending = win.onResized(sync);
    return () => {
      alive = false;
      void pending.then((unlisten) => unlisten()).catch(() => undefined);
    };
  }, []);

  return (
    <div
      // `data-tauri-drag-region` is what makes the bar draggable; Tauri also
      // gives it double-click-to-maximise for free, which is the behaviour
      // people reach for without thinking about it.
      data-tauri-drag-region
      data-testid="titlebar"
      className="relative flex h-8 shrink-0 items-center justify-end border-b border-white/10 bg-white/[0.03] select-none"
    >
      <span
        data-tauri-drag-region
        className="from-havoc-accent to-havoc-accent-2 pointer-events-none absolute left-1/2 -translate-x-1/2 bg-gradient-to-r bg-clip-text text-xs font-bold tracking-wide text-transparent"
      >
        {t("app-name")}
      </span>

      {/* Settings and About sit here, left of the window buttons — the same
          place Freally Player puts them, so the suite's windows read alike. */}
      {onSettings && (
        <button
          type="button"
          data-testid="titlebar-settings"
          className={BTN}
          onClick={onSettings}
          aria-label={t("toolbar-settings")}
          title={t("toolbar-settings")}
        >
          <GearIcon className="h-4 w-4" />
        </button>
      )}
      {onAbout && (
        <button
          type="button"
          className={BTN}
          onClick={onAbout}
          aria-label={t("toolbar-about")}
          title={t("toolbar-about")}
        >
          <InfoIcon className="h-4 w-4" />
        </button>
      )}

      <button
        type="button"
        className={BTN}
        // Rust decides minimise-vs-hide, because Rust owns the
        // `minimizeToTray` setting — see `tray.rs`.
        onClick={() => void windowMinimize().catch(() => undefined)}
        aria-label={t("window-minimize")}
        title={t("window-minimize")}
      >
        {/* A single rule, drawn rather than typed: an en dash glyph sits at a
            different height in every font, and these three must line up. */}
        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
          <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
        </svg>
      </button>

      <button
        type="button"
        className={BTN}
        onClick={windowAction((win) => win.toggleMaximize())}
        aria-label={maximized ? t("window-restore") : t("window-maximize")}
        title={maximized ? t("window-restore") : t("window-maximize")}
      >
        {maximized ? (
          // Restore: two offset outlines, the way every desktop draws it.
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
            <path
              d="M2.5 0.5h7v7h-2M0.5 2.5h7v7h-7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
            <rect
              x="0.5"
              y="0.5"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>
        )}
      </button>

      <button
        type="button"
        // Red on hover is the one universal affordance for "this closes things",
        // and it is a literal colour rather than a theme token because it must
        // read the same in both palettes.
        className={`${BTN} hover:!bg-red-600 hover:!text-white`}
        onClick={windowAction((win) => win.close())}
        aria-label={t("window-close")}
        title={t("window-close")}
      >
        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden="true">
          <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  );
}

/** The eight drag targets an undecorated window has to grow back.
 *
 * Without OS decorations there is no resize border, so these invisible strips
 * sit over the window edges and hand the drag to the OS. They are 4px, which is
 * about what a native border gives you, and `pointer-events` only where they
 * actually are — nothing underneath loses a click. */
export function ResizeEdges() {
  const grip = (
    direction: Parameters<ReturnType<typeof getCurrentWindow>["startResizeDragging"]>[0],
  ) => windowAction((win) => win.startResizeDragging(direction));

  // [class, direction, cursor]
  const edges = [
    ["top-0 right-0 left-0 h-1 cursor-ns-resize", "North"],
    ["right-0 bottom-0 left-0 h-1 cursor-ns-resize", "South"],
    ["top-0 bottom-0 left-0 w-1 cursor-ew-resize", "West"],
    ["top-0 right-0 bottom-0 w-1 cursor-ew-resize", "East"],
    ["top-0 left-0 h-2.5 w-2.5 cursor-nwse-resize", "NorthWest"],
    ["top-0 right-0 h-2.5 w-2.5 cursor-nesw-resize", "NorthEast"],
    ["bottom-0 left-0 h-2.5 w-2.5 cursor-nesw-resize", "SouthWest"],
    ["right-0 bottom-0 h-2.5 w-2.5 cursor-nwse-resize", "SouthEast"],
  ] as const;

  return (
    <div data-testid="resize-edges" aria-hidden="true">
      {edges.map(([className, direction]) => (
        <div
          key={direction}
          data-resize={direction}
          className={`fixed z-50 ${className}`}
          onMouseDown={grip(direction)}
        />
      ))}
    </div>
  );
}
