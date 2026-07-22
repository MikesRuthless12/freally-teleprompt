# Changelog

All notable changes to **Freally Teleprompt** are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project uses a phase-based version ladder up to 1.0.0 (`0.100.0` → `0.200.0` →
`0.300.0` → `1.0.0`). Every phase updates this file and `docs/changelog.html`
together — they are two renderings of the same history.

## [0.100.0] — 2026-07-21

The scaffold phase: the app now builds, runs, and gates on the agreement, with
the character-based scroll engine ported over from Freally Capture.

### Added

- **Tauri v2 scaffold** (FT-00) — a Rust workspace (`src-tauri`) plus a
  React/TypeScript UI (`ui`), sharing Freally Capture's tooling shape: `ci.yml`,
  `scripts/ci-local.mjs`, `deny.toml`, and a pinned `rust-toolchain.toml`, so
  `npm run ci:local` runs the full gate from day one.
- **Icon set** (FT-01) — generated from the source artwork by
  `scripts/make-icons.py`, for Windows, macOS and Linux plus the website
  favicons. Sizes at or below 48px use a **glyph-only "F"** variant, because the
  wordmark baked into the artwork is illegible below 64px (measured, not
  guessed).
- **The character-based teleprompter engine** (FT-02) — `teleprompter.rs` and
  its TypeScript twin `ui/src/lib/caesura.ts`, ported from Freally Capture:
  visible-character scroll offsets, inline ` -- ` caesura pauses (` --2 ` for a
  custom hold), seek/step/speed controls, and a start-countdown pre-roll.
  Preview and projector lay text on one fixed-width stage and CSS-scale it, so
  they wrap at the identical column.
- **Single-window app shell** (FT-03) — toolbar, script input, and the live
  prompter surface, with **Settings** on the draft/apply pattern (nothing takes
  effect until Apply; Cancel restores exactly what you had) and an **18-locale**
  Fluent i18n foundation.
- **Docs site + changelog** (FT-04) — the site is served by GitHub Pages from
  `/docs`, matching the other Freally apps.
- **First-run EULA gate** (FT-05) — the app is unusable until the agreement is
  accepted. Acceptance is versioned and **preserved across every settings save**
  (a bug that shipped in Freally Capture; there is now a regression test for it).
- **Problem reporter and update check** — the Havoc-standard crash reporter
  (scrubbed local report, native "stopped unexpectedly" notice, restart, and
  GitHub/Gmail/mail submission you trigger yourself) and a launch-time update
  check that shows the version and real release notes before doing anything.

### Notes

- **No AI, no accounts, no telemetry.** The only outbound request is the update
  check; it sends nothing about you, your machine, or your scripts.
- Download links on the site are placeholders until the release pipeline lands.

[0.100.0]: https://github.com/MikesRuthless12/freally-teleprompt/releases/tag/v0.100.0
