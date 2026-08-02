import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without injected globals, so Testing Library cannot register
// its automatic cleanup hook — do it explicitly.
afterEach(() => {
  cleanup();
});

// jsdom ships no ResizeObserver; the teleprompter scroller measures its
// viewport with one. A no-op stand-in is enough — layout geometry isn't
// asserted in jsdom (the Playwright gallery covers real rendering).
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom ships no `matchMedia` either, and the `"system"` theme (FT-50) asks it
// for `prefers-color-scheme`. A stub that reports "no match" — i.e. a light
// system — with real add/removeEventListener, so a test can drive an OS theme
// change and prove the app repaints. `window.__setSystemDark(true)` flips it.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  // One query is ever asked for — `(prefers-color-scheme: dark)` — so one flag
  // and one listener set is the whole model. Only the three members `t.ts`
  // actually touches are implemented; the legacy `addListener`/`removeListener`
  // pair and `dispatchEvent` would be dead weight that implies a generality
  // this does not have.
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  let dark = false;
  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return dark;
    },
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.delete(fn),
  })) as unknown as typeof window.matchMedia;
  (window as unknown as { __setSystemDark: (on: boolean) => void }).__setSystemDark = (on) => {
    dark = on;
    for (const fn of listeners) fn({ matches: on } as MediaQueryListEvent);
  };
}
