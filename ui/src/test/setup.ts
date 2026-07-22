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
