import type { Page } from "@playwright/test";

/**
 * The mocked Tauri IPC bridge for the visual gallery (SR-2).
 *
 * The gallery loads the REAL built UI in Chromium, where there is no Tauri host,
 * so `window.__TAURI_INTERNALS__.invoke` — the single function every
 * `@tauri-apps/api` call funnels through — is stubbed before any app code runs.
 * That keeps the mock at one seam: panels, `api/commands.ts`, and the event
 * bridge all work unchanged.
 */

export type MockState = {
  /** Set false to render the first-run EULA gate instead of the app shell. */
  eulaAccepted?: boolean;
  /**
   * Serve an agreement long enough to actually overflow its scroll box.
   * The short sample lets the gate enable **I Agree** immediately (it measures
   * "nothing to scroll"), which is a real behaviour — but it also meant the
   * scroll-to-accept requirement had no coverage at all: deleting the
   * `disabled` prop entirely kept every test green.
   */
  longEula?: boolean;
  /** The script the prompter shows. */
  script?: string;
  playing?: boolean;
  offset?: number;
  theme?: "dark" | "light";
};

const DEFAULT_SCRIPT = [
  "Welcome to Freally Teleprompt.",
  "",
  "This line scrolls at a real reading pace -- and pauses here.",
  "You can hold longer with a numbered pause --2 like that one.",
  "",
  "The lit word always sits on the reading guide.",
].join("\n");

const SAMPLE_EULA = [
  "# Freally Teleprompt — End User License Agreement (EULA)",
  "",
  '**Software:** Freally Teleprompt ("the Software")',
  "",
  "## 1. License grant",
  "The Software is **proprietary** and **All Rights Reserved**. Subject to this",
  "Agreement, the Licensor grants you a personal, non-exclusive licence to use it.",
  "",
  "## 5. No artificial intelligence; system components",
  "The Software contains **no artificial-intelligence or machine-learning**",
  "components, downloads no models, and sends no text to any external service.",
].join("\n");

/** A agreement that genuinely overflows the gate's scroll box. */
const LONG_EULA = [
  "# Freally Teleprompt — End User License Agreement (EULA)",
  "",
  ...Array.from(
    { length: 120 },
    (_, i) =>
      `${i + 1}. This clause exists to make the agreement long enough that the ` +
      "gate's scroll box actually overflows, so the scroll-to-accept rule is tested.",
  ),
].join("\n");

/**
 * Install the stub. Must be called BEFORE `page.goto` — it runs as an init
 * script so it is in place before the bundle boots.
 *
 * Everything the page function needs is passed through its ONE serialisable
 * argument: `addInitScript` ships the function's source to the browser and does
 * NOT capture surrounding closure variables.
 */
export async function mockTauri(page: Page, state: MockState = {}): Promise<void> {
  const payload = {
    settings: {
      language: "en",
      theme: state.theme ?? "dark",
      speed: 12,
      fontSize: 48,
      caesuraSecs: 0.75,
      countdownSecs: 0,
      mirror: false,
      acceptedEulaVersion: state.eulaAccepted === false ? null : "2026-07-21",
    },
    eula: {
      version: "2026-07-21",
      text: state.longEula ? LONG_EULA : SAMPLE_EULA,
      accepted: state.eulaAccepted !== false,
    },
    teleprompter: {
      script: state.script ?? DEFAULT_SCRIPT,
      speed: 12,
      fontSize: 48,
      mirror: false,
      offset: state.offset ?? 0,
      playing: state.playing ?? false,
      caesuraSecs: 0.75,
      countdownSecs: 0,
      countdownRemaining: 0,
    },
  };

  await page.addInitScript((data: typeof payload) => {
    const responses: Record<string, unknown> = {
      settings_get: data.settings,
      settings_set: null,
      eula_status: data.eula,
      eula_accept: null,
      teleprompter_get: data.teleprompter,
    };

    // Tauri routes event subscriptions through a command too; returning an
    // unlisten id is enough because the gallery never emits.
    const eventCommands = ["plugin:event|listen", "plugin:event|unlisten"];

    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {
      invoke: (cmd: string) => {
        if (eventCommands.includes(cmd)) return Promise.resolve(0);
        if (cmd in responses) return Promise.resolve(responses[cmd]);
        // An unmocked command must not reject: a panel that catches and hides
        // itself would silently produce an empty screenshot, which reads as a
        // pass. Resolve null and let the panel render its empty state.
        return Promise.resolve(null);
      },
      transformCallback: (cb: unknown) => cb,
    };
  }, payload);
}
