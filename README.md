# Freally Teleprompt

> **Look confident. Stay on script.** — a local-first teleprompter that reads at a real human
> pace (characters per second **or BPM**), marks your pauses with inline caesura chips, and keeps the
> operator preview, the talent projector, and LAN mirrors in step from one character-based engine.
>
> **No AI, no accounts, no cloud, no subscription.**

**Status: in development (0.100.0).** Freally Teleprompt is the standalone grow-out of the
teleprompter that ships inside
[Freally Capture](https://github.com/MikesRuthless12/freally-capture) (0.910.0's Teleprompter
Rework). Platforms: **Windows / macOS / Linux** (Tauri v2 — Rust core + React/TypeScript UI).

- **Website & documentation:** https://mikesruthless12.github.io/freally-teleprompt/
- **Part of the Freally family:** local-first, no account, no telemetry — your scripts stay on
  your device.

## Build & run

Prerequisites: **Node 22.12+**, the Rust toolchain (pinned by `rust-toolchain.toml`, installed with
`rustup toolchain install`), and the [Tauri v2 system
dependencies](https://tauri.app/start/prerequisites/) for your OS.

```bash
npm install          # installs the ui workspace too
npm run tauri dev    # run the app
npm run ci:local     # the full gate — run this before every push
```

`npm run ci:local` mirrors `.github/workflows/ci.yml` exactly and runs **every** check even past a
failure, so one pass surfaces all problems:

| | |
|---|---|
| **Rust** | `cargo fmt --check` · `cargo deny check` · `cargo audit` · `clippy -D warnings` · `cargo test --workspace` |
| **UI** | prettier · eslint · `i18n:lint` · `theme:lint` · vitest · `tsc --noEmit` + `vite build` · Playwright gallery |
| **Smoke** | `tauri build --debug --no-bundle` |

Useful flags: `--no-e2e`, `--no-tauri-build`, `--rust-only`, `--ui-only`.

## Layout

```
src-tauri/     Rust: the scroll engine, settings, EULA gate, problem reporter
ui/            React + TypeScript: panels, 18-locale Fluent i18n, Playwright gallery
docs/          the GitHub Pages site (plain static HTML — no build step)
scripts/       ci-local.mjs (the gate) · make-icons.py (the icon sets)
```

### Two invariants worth knowing before you edit

1. **The scroll engine is mirrored in two languages.** `src-tauri/src/teleprompter.rs` and
   `ui/src/lib/caesura.ts` implement the same parser and the same `offset(elapsed)` function — that
   equivalence is why the preview and the projector never drift. **Change one, change the other,**
   and re-run both test suites.
2. **EULA acceptance is not a preference.** `settings_set` deliberately cannot write
   `accepted_eula_version`; `accept_eula` is its only writer. A settings dialog opened before
   acceptance carries a stale value, and letting it through re-shows the gate on the next launch —
   a bug that shipped in Freally Capture. There is a regression test; keep it.

> The product-planning documents (roadmap, build-prompts guide, to-do list) are maintained
> privately and are not published in this repository.

© 2026 Mike Weaver — All Rights Reserved.
