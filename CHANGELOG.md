# Changelog

All notable changes to **Freally Teleprompt** are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The
pre-1.0 releases used a phase-based ladder (`0.100.0` → `0.200.0` → `0.300.0` →
`1.0.0`); from 1.0.0 on it is ordinary semver. Every release updates this file
and `docs/changelog.html` together — they are two renderings of the same history.

## [Unreleased]

_Nothing yet._

## [1.3.0] — 2026-08-03

Reading to time — and the words that shouldn't count.

### Added

- **Tap a tempo, and the app learns yours.** BPM has always been turned into a
  reading speed with one number: how many characters you get through in a beat.
  It used to be a guess — the same guess for a balladeer and a rapper, who are
  an order of magnitude apart. **Settings → Timing** now lets you tap along at
  the tempo you actually perform at, and measures that number against your own
  reading speed instead of assuming it.
  - A calibration that puts part of the musical range out of the engine's reach
    **narrows the range the BPM box offers** rather than showing you numbers it
    would quietly change underneath you.
- **A metronome.** An optional click on every beat while the script scrolls,
  accented on the first beat of the bar, with the start countdown doubling as
  its count-in. The app synthesises it — there is no audio file in the
  installer and nothing is fetched. It is scheduled against the audio clock
  from each beat's index, so it does not drift against the scroll: measured
  over a ten-minute read at the fastest tempo the app offers, the last click is
  still exact.
- **A bar and beat counter**, beside the reading surface, with **bar lines
  ruled on the seek bar** — so "sixteen bars" is something you can see rather
  than something you count in your head. Both appear only when you are working
  to a tempo.
- **Rehearsal mode, with a timing report.** Read the script through and the app
  tells you, section by section, what it should have taken against what it did,
  and offers the pace you actually delivered it at. It records **timings and
  nothing else** — there is no microphone in it and no audio path at all, which
  is asserted by a test rather than only promised here.
- **A quiet pace warning** while rehearsing, once the read has slipped more than
  a few seconds from its plan — so an over-running section is visible before the
  end rather than after it.
- **Words you read but do not perform.** Put "Chorus", "Verse" or "Bridge" in
  **Settings → Timing** and a line that is nothing but one of them — `Chorus`,
  `[Verse 1]`, `## Bridge` — **costs no time at all**, so your lyrics still land
  on the bar you wrote them for. The same word inside a real line skips only
  itself, so "back to the chorus now" keeps its timing. They stay on screen,
  dimmed, and read-aloud never says them.

## [1.2.0] — 2026-08-02

The record button, and what happens to the words after you say them.

### Changed

- **The record button is a button, not a sentence.** It is now a circle with a
  glyph in it — **●** to record, **■** to stop — with the instruction beside it
  rather than inside it, so the control stops changing width as you use it. Its
  colour follows your pointer as well as its state: hover the record button and
  it turns green, and while it is recording, hovering it turns it red. Moving
  away puts it back without changing what it will do.
- **Dictated words now go through the editor**, which is where they always
  should have gone. Three things follow from that, and each of them was a real
  fault before:
  - **Undo takes back one thing you said**, not the whole session. Ctrl+Z used
    to jump past everything you had dictated in a single step.
  - **Text you type while recording is kept.** The next thing you said used to
    overwrite it.
  - **Words land where your cursor is**, not always at the end of the script.

### Fixed

- Dictation reported itself ready when the speech-model **folder** existed,
  even if the model inside it was missing or half-copied — which put a record
  button on screen that could only fail when pressed. It now checks the one
  file the recogniser cannot start without.
- On an install under a **drive-letterless volume** (a folder-mounted drive),
  the model path handed to the recogniser was turned into one that named
  nothing at all. It now names the model. Whether the recogniser then loads it
  is untested on such a setup — but a failure there says which model it could
  not open, instead of quietly looking somewhere else entirely.
- Text inserted with the cursor at the **very top** of the script could land at
  the bottom instead. The editor could not read a cursor position sitting on
  the script as a whole rather than inside a line of it, and answered with the
  length of everything — so a paste, or a dictated line, went to the end.
- Dictation could report itself **unavailable while a perfectly good model was
  installed**: a stray or half-copied `vosk-model-en` in your data folder was
  preferred over the one inside the app, and then rejected for being
  incomplete. The app now passes over an unusable folder and uses the model it
  shipped with.

### Added

- `npm run dev:vosk` for contributors — a development run that can actually
  dictate. Dictation is release-only otherwise, which made it awkward to work on.

### Documentation

- The docs site's search finds **dictation** — the feature shipped in 1.1.0 and
  was not in the index, so searching for it returned nothing. In the other
  direction, search results that could only ever 404 are gone: the shared index
  listed five Freally apps that have no site yet, which was 39 of its 109
  entries.
- `THIRD-PARTY.md` records **Vosk** (engine, model, and the Windows MinGW
  runtime) alongside the fonts; `NOTICE` now carries the pointers to that
  runtime's corresponding source. Both files ship inside the installer.
- The Settings note for dictation says what happens when the **LAN mirror** is
  on: dictated text reaches its viewers as it is written, the same as typing.

## [1.1.0] — 2026-08-02

One way to use your voice, and it works the moment you switch it on.

### Added

- **Write your script by speaking** (FT-33) — turn on **Dictation** in
  Settings → Voice and a record button appears above the script. Press it and
  what you say is written in; press it again to stop.

  It needs no training and no setup: the speech model ships inside the
  installer, so it works the moment you switch it on. Nothing is downloaded at
  runtime and nothing is sent anywhere — the recogniser and its model are on
  your machine, and that stays true offline. The microphone is open only while
  recording, and nothing you say is written to a file but the text itself.

### Removed

- **Voice commands are gone.** They required you to record every command —
  play, pause, faster, slower, next pause, back to top — in your own voice
  before any of them did anything, and then to hold a button down while
  speaking. Until you had done that recording, holding the button opened the
  microphone and achieved nothing at all, with no way to tell that from a
  fault. Dictation covers the same ground with nothing to train.
- **"Follow my reading" is gone** for the same reason: one clear way to use
  your voice is better than three that overlap. The alignment work behind it
  still exists as a library and may return in a different shape.

  The installers are correspondingly larger than 1.0.0's — the speech model is
  about 40 MB, and it now ships whether or not you use it.

## [1.0.0] — 2026-08-02

The first published release: everything from Phase 3 (hands-free voice control)
and Phase 5's polish pass, cut as signed installers for Windows, macOS and Linux.

### Added

- **A one-minute welcome tour** (FT-50) — the first time you open the app, four
  short steps introduce the editor and its pause marks, the pace controls, and
  the projector. Skip it at any point, and run it again whenever you like from
  **Settings → General → Show the tour again**.
- **A theme that follows your system** (FT-50) — alongside Dark and Light there
  is now **Same as my system**, which switches with your OS and repaints
  immediately when your machine changes at sunset. Dark is still the default.
- **Voice commands** (FT-30, FT-31) — train **play, pause, faster, slower, next
  pause, back to top** in your own voice (a few takes each) and drive the
  prompter hands-free. A visible **● Listening** indicator shows whenever the
  microphone is open; choose **push-to-talk** (mic open only while you hold a
  button) or **always-listening**. **Off by default.** Model-free: matched by
  classic signal processing against your own recordings, on-device.
- **Voice-following** (FT-32, FT-34, FT-35) — an **opt-in** mode that scrolls the
  script to keep up as you read it aloud, recognising the script's own words with
  a bundled Apache-2.0 Vosk model. It **steps aside to manual** the moment it
  loses your place (so it never scrolls somewhere wrong) and drives only the
  operator preview, never the projector. **Off by default**, and greyed out with
  a reason where the model isn't installed. The deterministic alignment layer
  that decides where in the script you are is fully owned and unit-tested.

- **Installers, signed and self-updating** (FT-51, FT-52) — Windows (`.exe` and
  `.msi`), a macOS universal `.dmg`, and Linux AppImage and `.deb`, all built
  from one tagged commit. The in-app updater checks the releases page, and every
  update is verified against a signing key the app carries — an update that
  cannot be verified is refused rather than installed.

### Changed

- **Keyboard and screen-reader accessibility pass** (FT-50) — every focusable
  control now shows a clear focus ring; **Tab** stays inside an open dialog
  instead of wandering onto the window behind it; closing a dialog hands focus
  back to the button that opened it; and the Settings category list now reports
  the pane you are actually looking at, even while a search is filtering it.
  The app also honours **reduce motion** throughout. The script's own scroll is
  deliberately untouched by that setting — it is the thing the app is for, and
  you already control its speed directly.

### Privacy

- **No network, ever.** Voice commands never touch the network or disk — audio is
  matched in memory against your own recordings, and nothing you say is written
  to a file. Voice-following runs the recogniser entirely on-device; the model
  ships in the installer and downloads nothing at runtime.

_**Voice-following is not usable in this build.** The recogniser needs a speech
model, and this release does not yet bundle one — the feature detects that and
reports itself unavailable with a reason, rather than failing when you turn it
on. Voice **commands** are unaffected: they need no model and work here. The
alignment and grammar layers underneath are complete and tested._

## [0.300.0] — 2026-07-22

Offline autocomplete in the script editor: it suggests the rest of the word as
you type, in any of the 18 languages, from word lists that ship inside the app.

### Added

- **Ghost-text autocomplete** (FT-20, FT-21) — start a word and the rest of it
  appears dimmed ahead of the cursor. **Tab** accepts it, **Esc** dismisses it,
  and typing straight past it ignores it. It completes whole common phrases too,
  once you finish a word and press space.
- **Autocomplete settings** — a new **Editor** pane with an on/off switch and its
  own **suggestion language**, separate from the app's language, because writing
  a script in one language while running the app in another is normal.
- **Word and phrase tables for all 18 languages** (FT-22) — roughly 464,000 words
  and 345,000 phrases in total, bundled in the installer. Only the language you
  are actually using is loaded, so this costs the app about 0.5 MB of memory at a
  time rather than all 12 MB.

### Changed

- **The language picker now starts with English and then runs alphabetically by
  each language's own name** — Deutsch, Español, Français, and so on — and stays
  in that order whichever language the app is in. It previously followed the
  English names, so the order shifted depending on what you had selected.

### Privacy

- **Autocomplete never touches the network.** It is a lookup against tables
  inside the installer — no model, no service, no telemetry. Nothing you type is
  sent anywhere, and the feature works with the machine offline.

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

- **Every language now renders, on every machine.** The app bundles the Noto
  fonts for all 18 languages it ships in — Latin, Greek, Cyrillic, Vietnamese,
  Arabic, Devanagari, Japanese, Korean and Simplified Chinese. Switching to
  Japanese on a machine with no Japanese font installed used to show boxes
  instead of the interface; now the app carries what it needs. Only the character
  subsets a chosen language actually uses are ever loaded, and the fonts back
  every reading typeface too, so picking "Serif" can never make a language
  unreadable. The fonts are under the SIL Open Font License; the notice ships
  with the app as `THIRD-PARTY.md`.

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
- **Every language is checked for legibility, not just for strings.** A test
  switches the app into each of the 18 locales and proves every character of its
  own interface is covered by a bundled font. A missing script renders as boxes,
  which looks like working text to a screenshot and to every other check — so
  Arabic, Hindi, Japanese, Korean and Chinese could each have broken silently,
  and only for the people who read them.
- **A translation that quietly fell back to English now fails the build.** Bulk
  translation passes leave English behind for anything they cannot translate, and
  the result parses and ships looking finished. Genuine exceptions — "OK",
  "Port", proper nouns — are listed with a reason.
- **Linux rendering is now proven, not assumed.** The CI screenshot runs in a
  container with a software renderer, because GitHub's bare Linux runner has no
  working GL and produced an empty window whether or not the app was healthy — a
  check that could not fail was telling us nothing.
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
