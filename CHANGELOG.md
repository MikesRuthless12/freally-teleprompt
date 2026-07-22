# Changelog

All notable changes to **Freally Teleprompt** are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project uses a phase-based version ladder up to 1.0.0 (`0.100.0` → `0.200.0` →
`0.300.0` → `1.0.0`). Every phase updates this file and `docs/changelog.html`
together — they are two renderings of the same history.

## [0.200.0] — 2026-07-21

The standalone teleprompter: scripts you can keep, a projector for the talent,
a real transport, and the prompter reading itself aloud.

### Added

- **Script library** (FT-10) — `.ftscript` files you can create, open, rename and
  delete, with a recent list and **autosave** while you type. They are plain
  UTF-8 text in one folder, so a script stays readable, diffable and rescuable in
  any text editor if this app ever goes away. The app reopens whatever you had
  open last.
- **Caesura chips in the editor** (FT-11) — every inline ` -- ` / ` --2 ` renders
  as an atomic pill showing its pause length. The caret can only sit before or
  after one, Backspace/Delete removes the whole token in a single press,
  Shift+Arrow selects it as a unit, copy/cut carry the real ` -- ` text, and a
  pasted script has its sloppy spacing normalised. Typing the second dash expands
  a pause for you.
- **Projector window** (FT-12) — open the reading surface on any connected
  display, filling it edge to edge, with a **mirror flip** for beam-splitter
  prompter glass. It runs off the same scroll state as the operator preview, so
  the two can never disagree about where the read is, and it carries its own
  transport, seek bar and keyboard shortcuts for the person actually reading.
- **LAN mirror** (FT-12) — mirror the scrolling script to a phone, tablet or
  second laptop on your own network, from a link and QR code the app shows you.
  Each device sets its own font size without changing what anyone else sees.
  **Off by default**, loopback-only until you explicitly open it to the network,
  protected by a key generated fresh each launch, and **read-only** — nothing a
  browser sends can change the scroll, the script, or a setting.
- **A real transport** (FT-13) — play / pause / stop / rewind / fast-forward as
  proper SVG buttons with **hold-to-repeat**, a YouTube-style seek bar with
  elapsed and total read time (caesura pauses counted) and hover-to-preview the
  words at any point, click-a-word-to-start, mousewheel scrubbing, and keyboard
  shortcuts on the projector.
- **BPM speed mode** (FT-14) — read the pace as characters per second or as
  **BPM (20–250)** for musical delivery. The engine stays chars/sec throughout;
  BPM is a display and entry mode, and every BPM you can type lands inside the
  engine's own range rather than being silently clamped underneath you.
- **Appearance controls** (FT-15) — typeface, weight, text colour, side margins,
  line spacing, and **where the reading guide sits** on screen. These live in the
  engine rather than in one window's state, so the preview, the projector and the
  LAN mirror always look alike.
- **Read aloud with per-OS speech synthesis** (FT-16) — have the prompter read
  the script to you at the pace you have set, to audition timing before a take.
  The highlight follows the spoken word, caesuras become real silences (`--` is
  never pronounced "dash"), and seeking jumps the speech. It is **preview-only**:
  it never moves the talent's projector. Uses the voices your OS already has
  (Windows OneCore/SAPI, macOS AVSpeechSynthesis, Linux Speech Dispatcher /
  espeak-ng) — no speech engine is bundled.

### Changed

- **The app draws its own window.** No OS title bar: a centred title, with
  Settings, About, and minimise / maximise-restore / close on the right — the
  same arrangement Freally Player uses, so the suite's windows read alike. The
  bar is draggable, double-click still maximises, and the window is still
  resizable from every edge and corner.
- **Settings is now a proper settings dialog**, in the same shape as Freally
  Capture's: a category sidebar (General, Reading, Appearance, Projector,
  Network) with a search box, and an **OK / Cancel / Apply** footer. Apply is
  dead until something actually changes, and a dot marks the categories you have
  edited but not yet applied.
- **Minimize to the system tray** (Settings → General). Off by default. With it
  on, minimising hides the window and puts an icon in the tray; restoring brings
  the window back **and takes the icon away** — the app is in the taskbar or in
  the tray, never both. The tray menu is translated like the rest of the app.
- **The app icon is now the full artwork at every size.** `0.100.0` swapped in a
  cropped, glyph-only "F" for icons of 48px and below, on the grounds that the
  wordmark in the artwork is unreadable that small. One consistent mark turned
  out to matter more than a legible-but-different one, so the crop is gone —
  taskbar, tray and favicon all show the same icon now.

### Fixed

Found by the review pass over this phase, before release:

- **A pause chip could appear where the prompter took no pause.** The editor and
  read-aloud each carried their own copy of the ` -- ` grammar, without the
  bounds the scroll engine applies — so `--2.5.3` was drawn as a pause the
  prompter would skip straight past. All three now share one scanner.
- **Right-clicking the tray icon restored the window** instead of opening the
  menu, which made the tray's own "Quit" unreachable.
- **The first-run agreement's buttons could sit below the bottom of the window**
  now that the app draws its own title bar.
- **Settings could show a value the app was not using.** A number the backend
  clamped (a port below 1024, say) kept displaying as the one that was typed
  until the next restart; the dialog now shows what was actually stored.
- **Searching Settings could leave the wrong panel on screen**, with no
  highlighted category to explain it.
- **Stop is now one action in the engine** rather than a pause-and-rewind pair
  composed by each button, so anything else that stops the scroll behaves the
  same way.

### Testing

- **Playwright now covers every Phase 1 feature it can reach** — the script
  library's whole lifecycle, chip behaviour, the display picker, the transport,
  BPM conversion, the appearance pipeline, and the contract that read-aloud never
  touches the shared scroll. The mocked bridge records IPC calls, so the tests
  assert what the UI actually asked the backend to do.
- **The app is now launched and photographed on Windows, macOS and Linux every
  CI run** (`scripts/app-screenshot.mjs`), failing if it dies on start or paints
  nothing. A compile that succeeds and a webview that renders are different
  things.
- Everything that genuinely cannot be automated — a second monitor, prompter
  glass, audible speech, a phone on your Wi-Fi — now has **step-by-step drills**
  in `Live-To-Do-List.md`.

### Notes

- **Still no AI, no accounts, no telemetry.** The LAN mirror serves your script
  to devices you point at it, on your own network; nothing is uploaded or
  relayed. The only outbound request the app makes remains the update check.

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

### Known limitations

- **There are no installers yet.** `0.100.0` is a source milestone; the signed,
  per-OS release pipeline is a later phase.
- **Automatic updates are not active.** The updater ships without its signing
  public key, so it refuses every package rather than installing an unverified
  one — it fails safe, but it also cannot succeed. "Check for updates" will
  report an error until code signing lands.

[0.200.0]: https://github.com/MikesRuthless12/freally-teleprompt/releases/tag/v0.200.0
[0.100.0]: https://github.com/MikesRuthless12/freally-teleprompt/releases/tag/v0.100.0
