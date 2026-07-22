import type { Page } from "@playwright/test";

/**
 * The mocked Tauri IPC bridge for the visual gallery (SR-2).
 *
 * The gallery loads the REAL built UI in Chromium, where there is no Tauri host,
 * so `window.__TAURI_INTERNALS__.invoke` — the single function every
 * `@tauri-apps/api` call funnels through — is stubbed before any app code runs.
 * That keeps the mock at one seam: panels, `api/commands.ts`, and the event
 * bridge all work unchanged.
 *
 * The stub also RECORDS every call on `window.__ipcCalls`, so a spec can assert
 * what the UI actually asked the backend to do. That is what makes it possible
 * to test the script library and the projector without a Rust process: the
 * feature under test is the UI's half of the contract, and the Rust half has its
 * own tests in `src-tauri`.
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
  /** The locale the app boots in (`settings.language`); defaults to English. */
  language?: string;
  /** The reading appearance the engine reports (FT-15). */
  look?: Partial<Look>;
  /** Ghost-text autocomplete (FT-20); on by default, as the app ships. */
  autocomplete?: boolean;
  /** Which table the editor completes against (FT-20); `"auto"` follows the UI
   * language. Set it explicitly to test a script written in another language. */
  autocompleteLanguage?: string;
  /** The library listing `scripts_list` returns (FT-10). */
  scripts?: { name: string; bytes: number; modifiedMs: number }[];
  /** Which script is open (`recentScripts[0]`). */
  currentScript?: string;
  /** The displays `list_displays` returns (FT-12). */
  displays?: { index: number; name: string; width: number; height: number; primary: boolean }[];
  /** The LAN mirror's reported state (FT-12). */
  mirror?: { running: boolean; url: string | null; error: string | null };
  /**
   * The Tauri window label this page believes it is (FT-12). `main.tsx` routes
   * on it, so `"projector"` renders the talent surface instead of the operator
   * shell. Omitted means no metadata at all — which is what a plain browser
   * looks like, and what every other spec wants.
   */
  windowLabel?: string;
};

type Look = {
  fontFamily: string;
  fontWeight: number;
  textColor: string;
  marginPct: number;
  lineHeight: number;
  guidePct: number;
};

/** One recorded IPC call, for assertions. */
export type IpcCall = { cmd: string; args: Record<string, unknown> };

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

const DEFAULT_LOOK: Look = {
  fontFamily: "system",
  fontWeight: 500,
  textColor: "#ffffff",
  marginPct: 8,
  lineHeight: 1.5,
  guidePct: 12,
};

/**
 * Install the stub. Must be called BEFORE `page.goto` — it runs as an init
 * script so it is in place before the bundle boots.
 *
 * Everything the page function needs is passed through its ONE serialisable
 * argument: `addInitScript` ships the function's source to the browser and does
 * NOT capture surrounding closure variables.
 */
export async function mockTauri(page: Page, state: MockState = {}): Promise<void> {
  const look = { ...DEFAULT_LOOK, ...(state.look ?? {}) };
  const payload = {
    settings: {
      language: state.language ?? "en",
      theme: state.theme ?? "dark",
      speed: 12,
      fontSize: 48,
      caesuraSecs: 0.75,
      countdownSecs: 0,
      mirror: false,
      look,
      lanEnabled: state.mirror !== undefined,
      lanAllInterfaces: false,
      lanPort: 7346,
      autocomplete: state.autocomplete ?? true,
      autocompleteLanguage: state.autocompleteLanguage ?? "auto",
      recentScripts: state.currentScript ? [state.currentScript] : [],
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
      look,
      mirror: false,
      offset: state.offset ?? 0,
      playing: state.playing ?? false,
      caesuraSecs: 0.75,
      countdownSecs: 0,
      countdownRemaining: 0,
    },
    scripts: state.scripts ?? [],
    displays: state.displays ?? [],
    mirrorStatus: state.mirror ?? { running: false, url: null, error: null },
    windowLabel: state.windowLabel ?? null,
  };

  await page.addInitScript((data: typeof payload) => {
    const calls: IpcCall[] = [];
    (window as unknown as Record<string, unknown>).__ipcCalls = calls;

    // A tiny stand-in for the Rust engine. It exists so the UI's own feedback
    // loop actually closes: the editor is a CONTROLLED surface over
    // engine-authoritative text, so without a broadcast coming back, typing
    // would be reverted on the next render and no editor test could pass.
    // It models only what the UI observes — never the caesura timing, which has
    // its own tests on both sides of the IPC boundary.
    const engine = { ...data.teleprompter };
    const listeners: ((event: { event: string; payload: unknown }) => void)[] = [];
    const emit = () => {
      const snapshot = { ...engine };
      for (const handler of listeners) handler({ event: "teleprompter", payload: snapshot });
    };

    const responses: Record<string, unknown> = {
      settings_get: data.settings,
      eula_status: data.eula,
      eula_accept: null,
      scripts_list: data.scripts,
      scripts_open: null,
      scripts_save: null,
      scripts_create: null,
      scripts_rename: null,
      scripts_delete: null,
      list_displays: data.displays,
      projector_open: null,
      lan_mirror_status: data.mirrorStatus,
      lan_mirror_open: null,
      tts_speak: null,
      tts_stop: null,
    };

    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {
      // `getCurrentWindow()` reads this synchronously. Present ONLY when a spec
      // asks for a label, so the default stays "no Tauri host", which is what
      // `main.tsx` treats as the operator shell.
      metadata: data.windowLabel ? { currentWindow: { label: data.windowLabel } } : undefined,
      invoke: (cmd: string, args: Record<string, unknown> = {}) => {
        // `listen()` passes the already-transformed callback straight through,
        // because `transformCallback` below is the identity — so the handler
        // arriving here IS the subscriber's function.
        if (cmd === "plugin:event|listen") {
          if (args.event === "teleprompter" && typeof args.handler === "function") {
            listeners.push(args.handler as (event: { event: string; payload: unknown }) => void);
          }
          return Promise.resolve(0);
        }
        if (cmd === "plugin:event|unlisten") return Promise.resolve(0);

        calls.push({ cmd, args });

        switch (cmd) {
          case "teleprompter_get":
            return Promise.resolve({ ...engine });
          case "teleprompter_set_script":
            engine.script = String(args.text ?? "");
            engine.offset = 0;
            emit();
            return Promise.resolve(null);
          case "teleprompter_set_speed":
            engine.speed = Number(args.speed);
            emit();
            return Promise.resolve(null);
          case "teleprompter_set_mirror":
            engine.mirror = Boolean(args.mirror);
            emit();
            return Promise.resolve(null);
          case "teleprompter_control":
            if (args.action === "toggle") engine.playing = !engine.playing;
            if (args.action === "play") engine.playing = true;
            if (args.action === "pause") engine.playing = false;
            // Mirror of `teleprompter.rs`: stop halts AND rewinds, pause holds.
            if (args.action === "stop") {
              engine.playing = false;
              engine.offset = 0;
            }
            if (args.action === "top") engine.offset = 0;
            if (args.action === "seek") engine.offset = Number(args.value ?? 0);
            emit();
            return Promise.resolve(null);
          // Mirror of `settings::settings_set`: it STORES the settings and
          // returns what it stored, and the UI adopts that return value — it is
          // what re-localises the app and re-themes the document. Returning
          // `null` (as this mock used to) made `apply()` throw into its own
          // catch, so every "apply" in a test recorded the right IPC call and
          // then changed nothing on screen.
          case "settings_set":
            Object.assign(data.settings, args.next ?? {});
            return Promise.resolve({ ...data.settings });
          default:
            break;
        }
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

/** Every IPC call the page has made, in order. */
export async function ipcCalls(page: Page): Promise<IpcCall[]> {
  return page.evaluate(() => (window as unknown as { __ipcCalls: IpcCall[] }).__ipcCalls);
}

/** The arguments of the last call to `cmd`, or undefined if it never ran. */
export async function lastCall(
  page: Page,
  cmd: string,
): Promise<Record<string, unknown> | undefined> {
  const calls = await ipcCalls(page);
  return calls.filter((c) => c.cmd === cmd).pop()?.args;
}
