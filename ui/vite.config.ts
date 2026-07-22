/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The dev port is fixed — tauri.conf.json's build.devUrl points at it.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Keep Rust/Tauri compiler output visible alongside Vite's.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    // Vitest owns the src unit tests; the Playwright gallery (e2e/*.spec.ts)
    // runs under `playwright test`, not vitest.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
