import { defineConfig, devices } from "@playwright/test";

// Visual-smoke "gallery" (SR-2): loads the REAL built UI in Chromium with a
// mocked Tauri IPC and screenshots every feature panel. UI-render coverage only
// — the backend is covered by the per-OS `cargo test` suite.
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.output",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  // Above Playwright's 30s default. The language and font specs fetch Noto
  // subsets over the preview server, and the first read of a subset on a cold
  // machine is slow — a locally-observed run took minutes when the font files
  // were newly written. Every CI runner is cold by definition, and the suite
  // now runs on Windows and macOS too. A genuinely hung test still fails here;
  // it just gets long enough not to fail for being on a slow disk.
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `preview` serves the built `dist` — run `npm run build` first.
    command: "npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
