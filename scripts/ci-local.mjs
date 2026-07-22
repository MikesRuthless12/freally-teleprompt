#!/usr/bin/env node
// Local CI — run the SAME checks as .github/workflows/ci.yml before pushing.
//
// Mirrors the CI jobs (this repo is an npm workspace: the root package.json
// proxies every UI script to the `ui` workspace, so all UI commands run from
// the repo root — no cd into ui/):
//   Rust: cargo fmt --check · clippy -D warnings · test  (+ cargo-deny /
//         cargo-audit when installed)
//   UI:   prettier (format:check) · eslint · i18n:lint · theme:lint · vitest
//         (test:ui) · build (tsc --noEmit && vite build) · Playwright e2e
//   Tauri: debug compile smoke  (npm run tauri -- build --debug --no-bundle)
//
// Unlike CI (which stops a job at the first failing step), this runs EVERY check
// and prints one summary at the end, so a single pass surfaces all problems. It
// exits non-zero if anything failed, so it's safe to gate a push on it.
//
// Usage:  node scripts/ci-local.mjs [--no-e2e] [--no-tauri-build] [--rust-only] [--ui-only] [--install]
//   --no-e2e         skip the Playwright e2e step (fast inner-loop)
//   --no-tauri-build skip the Tauri debug compile (slow; ~cargo build of the app)
//   --rust-only      run only the Rust + Tauri-build checks
//   --ui-only        run only the UI checks
//   --install        (re)install deps first: npm ci + playwright chromium
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const uiDir = join(repoRoot, "ui");

const args = new Set(process.argv.slice(2));
const noE2e = args.has("--no-e2e");
const noTauriBuild = args.has("--no-tauri-build");
const rustOnly = args.has("--rust-only");
const uiOnly = args.has("--ui-only");
const doInstall = args.has("--install");

// Pass the whole probe as one shell string (not an args array) — with shell:true
// an args array triggers a Node deprecation warning and isn't escaped anyway.
function have(commandLine) {
  return spawnSync(commandLine, { stdio: "ignore", shell: true }).status === 0;
}

const steps = [];
function step(name, cmd, cwd) {
  steps.push({ name, cmd, cwd });
}

// Rust lives in a Cargo workspace at the repo root; the UI is the `ui` workspace.
const hasRust =
  existsSync(join(repoRoot, "Cargo.toml")) || existsSync(join(repoRoot, "src-tauri", "Cargo.toml"));
const hasUi = existsSync(join(uiDir, "package.json"));

if (doInstall && hasUi) {
  // CI installs from the workspace root, then Playwright chromium from ui/.
  step("deps: npm ci", "npm ci", repoRoot);
  step("deps: playwright chromium", "npx playwright install --with-deps chromium", uiDir);
}

if (!uiOnly && hasRust) {
  // fmt / cargo-deny / cargo-audit / clippy+test are separate CI jobs.
  step("rust: fmt", "cargo fmt --all -- --check", repoRoot);
  // cargo-deny runs in CI via EmbarkStudios/cargo-deny-action (deny.toml present).
  if (existsSync(join(repoRoot, "deny.toml")) && have("cargo deny --version")) {
    step("rust: cargo-deny", "cargo deny check", repoRoot);
  } else {
    console.log("• note: cargo-deny not installed (or no deny.toml) — skipping (CI runs it on Linux).");
  }
  if (have("cargo audit --version")) {
    step("rust: cargo-audit", "cargo audit", repoRoot);
  } else {
    console.log("• note: cargo-audit not installed — skipping (CI runs it on Linux).");
  }
  step("rust: clippy", "cargo clippy --workspace --all-targets -- -D warnings", repoRoot);
  step("rust: test", "cargo test --workspace", repoRoot);
}

if (!rustOnly && hasUi) {
  // The `ui` CI job, in order. All scripts proxy to the ui workspace from root.
  step("ui: format:check", "npm run format:check", repoRoot);
  step("ui: lint", "npm run lint", repoRoot);
  step("ui: i18n:lint", "npm run i18n:lint", repoRoot);
  step("ui: theme:lint", "npm run theme:lint", repoRoot);
  // build runs `tsc --noEmit` first, so there's no separate typecheck (as in CI).
  step("ui: test:ui", "npm run test:ui", repoRoot);
  step("ui: build", "npm run build", repoRoot);
  if (!noE2e) {
    step("ui: e2e", "npm run test:e2e", repoRoot);
  } else {
    console.log("• note: --no-e2e — skipping Playwright e2e (CI runs it).");
  }
}

// Tauri debug compile smoke — a Rust build of the app, needs the UI (build) too.
// Runs in full and --rust-only modes; skip under --ui-only or --no-tauri-build.
if (!uiOnly && hasRust && hasUi) {
  if (!noTauriBuild) {
    step("tauri: debug build", "npm run tauri -- build --debug --no-bundle", repoRoot);
  } else {
    console.log("• note: --no-tauri-build — skipping Tauri debug compile (CI runs it per-OS).");
  }
}

if (steps.length === 0) {
  console.error("ci-local: nothing to run (no Rust/UI detected, or filtered out).");
  process.exit(1);
}

const results = [];
for (const s of steps) {
  const bar = "─".repeat(Math.max(0, 56 - s.name.length));
  console.log(`\n▶ ${s.name} ${bar}`);
  console.log(`  $ ${s.cmd}  (in ${s.cwd === repoRoot ? "." : "ui"})`);
  const started = process.hrtime.bigint();
  const r = spawnSync(s.cmd, { cwd: s.cwd, stdio: "inherit", shell: true });
  const secs = Number((process.hrtime.bigint() - started) / 1_000_000n) / 1000;
  const ok = r.status === 0;
  results.push({ name: s.name, ok, secs });
}

console.log("\n" + "═".repeat(64));
console.log("  Local CI summary");
console.log("═".repeat(64));
let failed = 0;
for (const r of results) {
  const mark = r.ok ? "✓ pass" : "✗ FAIL";
  console.log(`  ${mark}  ${r.name.padEnd(24)} ${r.secs.toFixed(1)}s`);
  if (!r.ok) failed++;
}
console.log("═".repeat(64));

if (failed > 0) {
  console.error(`\n✗ ${failed} check(s) failed — fix before pushing.`);
  process.exit(1);
}
console.log("\n✓ All checks passed — matches CI. Safe to push.");
