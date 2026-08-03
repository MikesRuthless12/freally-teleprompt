# Freally Teleprompt — Handoff

**Written 2026-08-03, after `v1.1.0` — dictation replaces voice control.**
Read this before the next session. It says where things actually stand, the traps this session
paid for, and what is genuinely outstanding.

---

# 🔜 START HERE — the work queue

Everything below is real, scoped, and can be picked up cold. Ordered so that finishing one does not
create rework in the next. **A1 and A2 share a fix and should be done together.**

`v1.1.0` is published and healthy — nothing here is an emergency. Items marked **you only** need a
machine or a microphone I do not have.

---

## A. Do first — the dictate button, and the editor seam underneath it

### A1 · Rebuild the dictate button (specified in full, not started)

**What:** round, glyph-only button with a changing label to its LEFT and hover-driven colour.
The complete spec — states, colours, both glyphs, the label strings — is **Outstanding #4** below.
Do not re-derive it from this summary; the table there is the agreed behaviour.

**Where:** `ui/src/App.tsx` (the `dictate-toggle` button), `ui/src/i18n/locales/*.ftl` (two new label
keys × 18 locales), possibly `ui/src/components/styles.ts` if a round-button class is worth sharing.

**Watch for:**
- `i18n:lint` rejects any value identical to English — all 18 need real translations.
- `theme:lint` fails a white-alpha utility with no light-theme re-tint. If the colours sit outside
  the palette on purpose (like `.proj-btn`), say so in `global.css` where the linter can see it.
- The button loses its visible text, so it needs `title`/`aria-label` — `phase3.spec.ts` finds it by
  `data-testid`, so the tests keep working, but a glyph-only control still needs an accessible name.

**Verify:** `npm run ci:local` green, and the three existing `aria-pressed` / start-stop e2e cases
still pass unchanged.

### A2 · Give `CaesuraEditor` an `insertText` handle — and put dictation through it

**Why this is A2 and not "someday":** dictated text currently bypasses the editor entirely, so the
**first Ctrl+Z after a dictation session throws the whole session away** and jumps back to the last
keystroke. Same root cause: text typed by hand mid-recording is not merged.

**The fix:** `useImperativeHandle` on `CaesuraEditor` exposing `insertText(said)`, doing exactly what
its existing paste path already does — read `serialize(root)`, `snapshot(true)`, `apply(...)`.
Dictation then becomes "a paste from a different source" and gains undo and caret placement for free.

**What it deletes:** the `dictationBase` ref in `App.tsx`, its reset effect, the `?? state.script`
fallback, and the whole "dictation owns the tail" comment block. That machinery exists only to work
around not going through the editor.

**Where:** `ui/src/components/CaesuraEditor.tsx` (the handle, near `onPaste`), `ui/src/App.tsx`
(`dictateInsert`).

**Verify:** the existing e2e cases *must still pass* — especially
`consecutive utterances are separated, and neither is lost` and
`switching scripts mid-recording does not overwrite the new one`. Then add one for undo:
dictate, Ctrl+Z, assert only the last utterance is removed. **Prove it red first** against the
current code, or it is not testing anything.

---

## B. Verification only you can do

### B1 · macOS dictation, end to end — **the one real unknown**

The entitlement (`src-tauri/entitlements.plist`) and usage string (`src-tauri/Info.plist`) are
correct as written, but **nobody has run them**. Under `hardenedRuntime`, getting this wrong means
macOS kills the app on the first press of record.

**Do:** install the `.dmg` from the v1.1.0 release → right-click → Open (it is unsigned, so
Gatekeeper will object) → Settings → Voice → enable → press record.

**Expect:** a macOS microphone-permission prompt quoting the Info.plist string, then dictation works.
**If the app dies instantly instead**, the entitlement is not being applied — check the built
`.app`'s `Contents/Info.plist` actually contains `NSMicrophoneUsageDescription`.

### B2 · Linux dictation from the AppImage and the `.deb`

`libvosk.so` is bundled by linuxdeploy into the AppImage's own `usr/lib`, and `build.rs` sets an
rpath for the `.deb`. Both are correct in principle and **unproven in practice**. Install either,
enable dictation, press record. A failure here looks like "could not load the Vosk model" or a
missing-library error at launch.

### B3 · The Phase 0/1/2 human drills — still none run

`Live-To-Do-List.md` carries them. Unrelated to dictation, still outstanding, and the reason the
"every feature is either covered by Playwright or is a drill" rule currently has a gap.

---

## C. Small, well-understood fixes

Each is self-contained and none needs a release to verify.

### C1 · `npm run dev:vosk` — stop the dev loop being a papercut

A dev build cannot dictate (the feature is release-only), which was reported as a bug twice.
`model_dir`'s user-data fallback exists precisely to solve this. Wrap it:

```
node scripts/fetch-vosk.mjs
copy src-tauri/vendor/vosk/vosk-model-en -> <data dir>/vosk-model-en
PATH += src-tauri/vendor/vosk/lib          # so libvosk.dll/.so resolves
npm run tauri dev -- --features vosk
```

Windows data dir: `%APPDATA%\Freally\Freally Teleprompt\data\`. A small `scripts/dev-vosk.mjs` plus a
`package.json` script. **This makes A1 and A2 far easier to build**, so consider doing it first.

### C2 · `capability()` should check `am/final.mdl`, not just the directory

`freally-speech/src/lib.rs` reports `available: true` when the model *directory* exists. An empty
directory of that name therefore makes the record button appear and then fail on press. Check for the
one file the recogniser cannot start without — `fetch-vosk.mjs` already uses exactly that check.

### C3 · `model_path_for_ffi` and verbatim VOLUME paths

`src-tauri/src/speech.rs` handles `\\?\C:\…` and `\\?\UNC\…`. It does **not** handle
`\\?\Volume{GUID}\…` (an install under a drive-letterless mounted folder) — stripping leaves a
relative path naming nothing. Rare, but the fix is one more branch and a test line beside the two
that already exist.

### C4 · Documentation and attribution loose ends

- `docs/search-index.js` has **no dictation entry** — the feature is unsearchable on the site.
- `THIRD-PARTY.md` has no Vosk entry while `NOTICE` does; both ship side by side in the installer.
- `NOTICE` records the MinGW runtime DLLs as GPL-3.0 WITH GCC-exception-3.1 (correct) but gives no
  upstream source pointer. Adding the mingw-w64/GCC source URL closes the question for free.
- One sentence in the Settings dictation copy noting that, with the LAN mirror on, dictated text
  reaches mirror viewers as it is written — same as typed text, but worth saying.

---

## D. Decisions, not code — do not "just clean these up"

### D1 · Three orphaned bodies of code

`freally-align` has **no consumers at all**. Most of `freally-voice` (the DTW recogniser, MFCC, VAD,
enrolment) and `freally_speech::grammar_window` have none either. All are still compiled, linted and
tested on every gate.

They are kept as library IP and because `freally-align` is a published crate. **Deleting them is a
product decision** — if voice-following or a script-constrained mode may return, they are the head
start. If not, removing them measurably shortens every CI run.

### D2 · The `ship`/`link` duplication on Unix

`fetch-vosk.mjs` copies the same `.so`/`.dylib` into both `lib/` and `link/`, because on Unix the
shared object is both. Deduplicating means changing what `build.rs` puts on the link search path —
**only provable by a release run**, which is why it was left alone. Worth doing next time the release
path is being touched anyway, not on its own.

### D3 · `tauri.vosk.conf.json` duplicates two base-config resources

It re-lists `NOTICE` and `THIRD-PARTY.md`, which `tauri.conf.json` already has. Tauri merges
`--config` with RFC 7396 (object keys merge), so they *should* be redundant — three reviewers agreed,
two verified it in `tauri-utils`' source. Left duplicated anyway because **being wrong ships
installers with no licence files**. To resolve it properly: remove them, build a bundle on one
platform, and confirm both files are still in the app's resources. Until then, keep the two copies in
step.

---

## Where things stand

| | |
|---|---|
| Version | `1.1.0`, **published and Latest**. Ordinary semver from 1.0.0 on — the ×100 phase ladder is over, and it is what walked into the MSI ceiling. |
| Phase 0 / 1 / 2 | ✅ scaffold, teleprompter core, offline autocomplete |
| **Voice** | ✅ **dictation only.** Voice commands and voice-following were REMOVED in 1.1.0 — see below. |
| FT-51 / FT-52 | ✅ signed installers on all three OSes, updater endpoint live and verified. macOS is **unsigned** (no Apple cert): Gatekeeper needs a right-click → Open. |
| Crates | `freally-voice` (capture only now), `freally-align` (no longer used by the app), `freally-speech` |
| Tests | **~121 Rust** · **93 vitest** · **~130 Playwright** · per-OS launch screenshots |
| Next | the dictate button redesign (Outstanding #4 — specified in full), FT-53 (site content) |

### What 1.1.0 changed, and why

**Voice commands are gone.** They required recording every command in your own voice before any of
them did anything, then holding a button while speaking. Until that training was done, holding the
button opened the microphone and achieved nothing — silently, with no error, indistinguishable from
a fault. That is exactly how it was reported.

**Voice-following is gone too**, by the same decision: one clear way to use your voice beats three
overlapping ones.

**Dictation is what replaced them** — press record, talk, press stop, the words land in the script.
No training, no setup, and the bundled model means it works the first time it is switched on.

`freally-voice` **stays** (dictation uses its microphone capture; only the DTW command recogniser
went unused). `freally-align` is no longer an app dependency but remains a crate.

### ⚠️ This machine had NO toolchain

At the start of this session `git`, `node`, `cargo` and the MSVC linker were all absent, and WSL
was broken (`REGDB_E_CLASSNOTREG`). They were installed with winget:

```
winget install Git.Git OpenJS.NodeJS.LTS Rustlang.Rustup
winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
cargo install cargo-deny cargo-audit --locked
```

**They are not on the machine-wide `PATH`.** Every command in this session prefixed it:

```powershell
$env:PATH = "C:\Program Files\Git\cmd;C:\Program Files\nodejs;$env:USERPROFILE\.cargo\bin;$env:PATH"
```

If a future session finds `git` missing again, that is why — add them to the system PATH properly
rather than re-installing.

Also: **local `main` was 5 commits behind `origin/main`** while the working tree already held all
of Phase 0–3 as *untracked* files. `git reset --mixed origin/main` fixed it without touching a
single byte on disk. Check `git log --oneline -1` against `origin/main` before believing a diff.

### Get going

```bash
npm ci
npm run ci:local          # the full gate. RUN IT IN THE FOREGROUND (LNK1123 flake).
```

---

## ⚠️ Read this first: the `vosk` feature is OFF except in a release build

The recogniser links a **native library (`libvosk`)** and needs a **~40 MB model**. Neither is in the
repository, so the **`vosk` Cargo feature is off by default**: the whole gate builds and passes with
no `libvosk`, and dictation reports itself **unavailable** via `speech_capability`. Only
`release.yml` turns it on, after `scripts/fetch-vosk.mjs` pulls both down.

That is why **a dev build cannot dictate** and its Settings toggle is disabled — see Outstanding #5.

Two things now guard the gap that used to make this dangerous:

- `cargo check -p freally-speech --features vosk` runs in `ci.yml` and `ci-local`. **Checking does
  not link**, so it needs no `libvosk`, no model and no download — but it compiles the FFI on every
  PR. Before it existed, `vosk_engine.rs` went two phases without ever being built, and the first
  compile found a broken test.
- `freally-speech/tests/vosk_model.rs` is the drill, as two `#[ignore]`d tests. It has been **run**:
  the model loads, a script grammar installs, and grammar replacement across windows works. Read its
  module docs before running it — `RUSTFLAGS` will not survive a repository path containing a space.

Still linked ONLY in a release build, and so proven by the drill and the release, never by the gate:
`freally-speech/src/vosk_engine.rs` and `src-tauri/src/speech.rs::run_dictation`.

---

## Standing rules (enforced, not suggestions)

1. **`npm run ci:local` green locally BEFORE any push.** If CI fails on something it passed, that is a
   bug in `scripts/ci-local.mjs` — fix it in the same PR.
2. **Playwright covers every feature it can reach; everything else is a step-by-step drill in
   `Live-To-Do-List.md`.** A feature in neither bucket means the phase is not done.
3. **Look at the three `app-running-<os>` CI artifacts after every phase.**
4. **Full DoD every PR** — `/simplify` → `/code-review` → `/security-review` → fix all → green. This
   phase those passes found real bugs (see traps): a mic leak, two cross-platform build gaps, a
   grammar desync. Do not skip them.
5. **All 18 languages stay translated, legible, switchable.** `i18n:lint` rejects English-identical
   values; every new UI string is 18 translations.
6. **Every new check proven to fail.** Break the thing it watches, watch it go red, put it back.
7. **Re-read every data AND model licence at the source, not a summary.** Vosk's code and weights are
   licensed separately (both Apache-2.0 — verified); a permissive engine does not make its models
   permissive.

---

## ⚠️ Outstanding

### 1. Human drills — Phase 0/1/2 still NONE run

`Live-To-Do-List.md` carries the Phase 0/1/2 drills, none of which have been run.

The Phase 3 voice drills are **retired**: the Track A and FT-35 ones describe features that no
longer exist, and the FT-32 one (compile and link the FFI against a real `libvosk`) is **done** —
it now lives as `freally-speech/tests/vosk_model.rs` and has passed.

**Dictation itself is confirmed working end to end** on a real Windows install: model loads,
microphone opens, speech lands in the script. Not yet exercised on macOS or Linux — the AppImage and
`.deb` bundle `libvosk.so` via linuxdeploy, and nobody has installed either.

### 1b. FT-50's three drills (new)

`Live-To-Do-List.md` now has a **Phase 5** section. Three drills, none run: the tour surviving a
real restart (and the Settings-Apply trap against the real backend), the **system** theme
following a real OS appearance switch, and a real screen reader driving the app. Everything else
about FT-50 is covered by `phase5.spec.ts` (21 cases).

### 1c. ✅ RESOLVED — the MSI ceiling, by tagging `1.0.0`

An MSI `ProductVersion` caps **major and minor at 255**, and the phase ladder's minor was
100 / 200 / **300** with `msi` still in `bundle.targets`. `release.yml`'s **preflight** fails fast
on exactly that. Resolved by taking the option the roadmap was heading for anyway: the version is
now **`1.0.0`**, whose minor is 0. `msi` stays a bundle target.

**Do not go back to the ×100 ladder.** `1.1.0`, `1.2.0` … are all fine; a minor above 255 is not.

### 1d. Pre-existing, found by FT-50's review, deliberately NOT fixed here

**The projector window never applies the locale.** `ui/src/main.tsx` renders `<Projector/>` instead
of `<App/>`, and `initLocale` / `applySettingsToDocument` are only ever called from `App.tsx` — so
that window's `<html lang>` and `<html dir>` are never stamped and `t()` runs at the source locale.
`projector-exit-hint` is therefore **always English**, and an Arabic projector is never `dir="rtl"`.

The theme half of the same gap is harmless by design: the projector surface is black in both
themes and `.proj-btn` / `.proj-track` sit outside the palette on purpose.

Untouched because it is outside FT-50 and wants its own test — but it is a real i18n hole in a
window the talent reads, and SR-4 says all 18 languages stay switchable.

### 2. ✅ RESOLVED — the model is bundled and the FFI is proven

`1.0.0` shipped with voice-following dead. It is now wired end to end and **the FFI drill has been
run** — `vosk_engine.rs` compiled, linked and executed against a real `libvosk` and a real model for
the first time. It was correct as written; the only casualty was a test (see the traps).

How it fits together:

- **`scripts/fetch-vosk.mjs`** pulls `libvosk` for the host platform and the model into
  `src-tauri/vendor/` (gitignored, ~115 MB, same rationale as `.dict-cache/`).
- **`src-tauri/build.rs`** points the linker at `vendor/vosk/link/` and sets the runtime rpath —
  `@executable_path/../Resources` on macOS, `$ORIGIN/../lib/freally-teleprompt` on Linux, nothing on
  Windows (its loader already searches the executable's own directory).
- **`src-tauri/tauri.vosk.conf.json`** is an OVERLAY, applied with `--config`, that adds the model
  and the native libraries to the bundle. It is separate because `resources` paths are validated on
  every build, and a default or CI build has no `vendor/` — putting them in the base config breaks
  the whole gate.
- **`release.yml`** fetches, then builds with `--features vosk --config …`.
- **`freally-speech/tests/vosk_model.rs`** is the drill, as two `#[ignore]`d tests. Read its module
  docs before running it.

**Still unverified, and only you can do it:** actual recognition through a microphone, and that the
shipped `.dmg`/`.AppImage`/`.deb` find their bundled library at runtime. Windows is confirmed — the
built bundle puts the DLLs beside the exe and the model in the resource directory.

**Installer cost:** Windows NSIS went 60 MB, MSI 71 MB (model 68 MB + 45 MB of MinGW/Vosk DLLs).

### 2b. The signing key exists exactly once — losing it ends the updater

`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` are set as repo secrets and
**cannot be read back out of GitHub**. The only other copy is the backup folder written when the key
was generated (outside the repo, never committed — `git grep` for key material comes back empty, keep
it that way). If both are lost, every installed copy of the app refuses all future updates, because
they verify against the `pubkey` baked into `tauri.conf.json`. Put the backup somewhere durable.

### 3. ✅ RESOLVED — the two-microphone edge

Voice commands and voice-following could both be on at once, holding two `CpalSource`s. Both
features are gone (see "What 1.1.0 changed"); dictation is the only thing that opens a microphone
and it is a single session.

### 4. 🔜 NEXT UP — the dictate button's redesign (specified, not built)

**Requested directly, and to be built in the next phase.** The current button is a rectangle with a
dot and the word "Dictate". What is wanted instead:

- **Round.** Not square, not a rounded rectangle — a circle.
- **Glyph only. NO text inside the button at all.** A ● record glyph, and a ■ stop glyph once
  recording. The current `editor-dictate` / `editor-dictate-stop` strings move OUT of the button.
- **A label to the LEFT of it**, which changes with the state:
  - idle → **"Press record to start dictation"**
  - recording → **"Press stop to stop dictation"**
- **Colour follows the POINTER, not just the state** (this is the half that was chosen explicitly —
  it was offered as an alternative to "just turn red while recording", and this is the one wanted):

  | state | resting | hovered |
  |---|---|---|
  | idle (● record) | default | **green** |
  | recording (■ stop) | **green** | **red** |

  So: hover the record button and it greens; move away without clicking and it returns to default;
  click and it stays green as it becomes the stop button; hover the stop button and it reds; move
  away and it returns to green; click and it goes back to default.

Notes for whoever builds it:

- Two new i18n keys for the labels, ×18 locales, and the two existing in-button strings become the
  `title`/`aria-label` rather than visible text — a glyph-only control still needs an accessible
  name, and `phase3.spec.ts` finds the button by `data-testid`, not by text.
- The colour rules are hover state, so they belong in CSS (`:hover`), not React state — but the
  **idle vs recording** distinction is React state. Do not try to do all four cells in JS.
- `theme:lint` will want any new colour utilities to have a light-theme re-tint, unless they are
  deliberately outside the palette like `.proj-btn`.
- The three e2e cases that assert `aria-pressed` and the start/stop IPC still apply unchanged; only
  the appearance is moving.

### 4b. Found by the 1.1.0 review passes and deliberately NOT fixed

All of these were raised by `/simplify`, `/code-review` or `/security-review`, judged real, and left
alone on purpose. None is a correctness bug in shipped behaviour.

**This is the detail; the WORK QUEUE at the top of this file is the running order.** Each item below
appears there as A2, C2, C3, D1, D2 or D3 — start from the queue, come here for the reasoning.

- **Dictation bypasses the editor's undo stack.** It calls `onScriptChange` directly rather than the
  editor's `snapshot()`, so the first Ctrl+Z after a session jumps back to the last *keystroke* and
  discards the whole dictation in one step. The deeper fix is an imperative `insertText` handle on
  `CaesuraEditor` (it already does exactly this for paste) — dictation then becomes a paste with a
  different source, and gains caret placement and undo for free. That also removes the
  `dictationBase` ref entirely. Worth doing with the button redesign in #4.
- **Text typed by hand mid-recording is not merged** — the same root cause, same fix. The
  destructive half of this (switching scripts mid-recording overwriting the new file) IS fixed and
  has a test.
- **`ship`/`link` duplicates the shared object on Unix.** The two regexes are identical on macOS and
  Linux, so ~45 MB is copied twice. Fixing it means changing what `build.rs` puts on the link search
  path, which can only be proven by a release run — not worth destabilising a working release path
  for disk space on a build machine.
- **`freally-align` has no consumers at all**, and most of `freally-voice` (the DTW recogniser, MFCC,
  VAD, enrolment) and `freally_speech::grammar_window` have none either. They are still compiled,
  linted and tested on every gate. Kept as library IP, and because deleting a published crate is a
  decision rather than a cleanup.
- **`model_path_for_ffi` mishandles verbatim VOLUME paths** (`\\?\Volume{GUID}\…`, an install under
  a drive-letterless mounted folder) — stripping leaves a relative path. Rare enough that the guard
  would be untestable here; the verbatim-drive and verbatim-UNC cases that do occur are covered.
- **`capability()` checks the model DIRECTORY exists, not `am/final.mdl`.** An empty directory of
  that name makes the record button appear and then fail on press. The user-data escape hatch is the
  only way to create one.
- **`tauri.vosk.conf.json` re-lists `NOTICE` and `THIRD-PARTY.md`**, which the base config already
  has. Tauri merges `--config` with RFC 7396, which merges object keys, so they are redundant — but
  being wrong here means shipping installers with no licence files, and that cannot be verified
  without a full bundle on each platform. Left duplicated on purpose; keep them in step.

### 5. Dictation cannot be exercised in a dev build (a papercut, not a bug)

`--features vosk` is release-only, so `npm run tauri dev` reports the engine absent and disables the
toggle. That is honest, but it makes the feature awkward to iterate on.

**The fallback in `model_dir` exists precisely for this**: a model in the user's data directory wins
over the bundled one. So a dev loop is:

```
node scripts/fetch-vosk.mjs
# copy src-tauri/vendor/vosk/vosk-model-en -> <data dir>/vosk-model-en
npm run tauri dev -- --features vosk
```

On Windows the data dir is `%APPDATA%\Freally\Freally Teleprompt\data\`. `libvosk.dll` must also be
findable — put `src-tauri/vendor/vosk/lib` on `PATH` for that shell. Worth wrapping in an
`npm run dev:vosk` script; it was scoped and not built.

---

## Traps paid by the 1.1.0 review passes (bugs that were SHIPPING)

Four reviewers found these in code that was already released. Every one is now fixed and tested.

- **A background worker that exits on its own wedges the feature permanently.**
  `BackgroundSession::start` returned early whenever the slot was full, and only `stop()` ever
  emptied it — so a worker that ended by itself (microphone already in use, model failed to load,
  device unplugged) left a dead handle behind and **every later start was a silent no-op**. No
  error, no event, nothing to press: dictation was gone until the app restarted. `start` now reaps a
  finished worker first. If you add a second `BackgroundSession` user, this is the property to keep.
- **A ref holding "the script right now" MUST be invalidated when the open script changes.**
  `dictationBase` was cleared only when recording stopped. Open another script mid-recording and the
  next utterance wrote the OLD script's text over the newly-opened one — and autosave then persisted
  it, **destroying the file on disk**. Now keyed on `[dictating, currentScript]`.
- **Gating a control's VISIBILITY is not the same as tearing the feature down.** Turning dictation
  off in Settings while recording removed the button and left the microphone open, with no UI left
  that could close it — directly contradicting "the microphone is open only while recording" in the
  Settings copy. There is now an explicit stop when `dictationOn` goes false. The removed voice-command
  code had exactly this teardown; it was lost in the rewrite.
- **⚠️ Playwright's `page.evaluate` is a yield point, so two `emit()` calls do NOT test a race.**
  The "consecutive utterances" test passed against the very bug it was written for, because React
  flushed between the two round-trips. Anything asserting behaviour BETWEEN renders must fire both
  events inside ONE evaluate — that is what `emitAll` in `phase3.spec.ts` is for. Proven both ways.
- **A mock that returns `null` hides the behaviour it is standing in for.** `scripts_open` in
  `mock-ipc.ts` did nothing, so no spec could tell a real script switch from a no-op — which is why
  the data-loss bug above had no test. It now replaces the engine text like Rust does.
- **An existence check on a directory you created empty is not a check.** `fetch-vosk.mjs` made
  `lib/` and `link/` before copying into them, so a run that matched no files left them behind and
  every later run reported "already present" — masking the failure permanently, and turning
  `build.rs`'s actionable guard into a raw linker error. It now requires them to be non-empty.

## Traps paid shipping dictation and `v1.1.0`

- **A dev build CANNOT dictate, and that is correct.** `--features vosk` is on only for release
  builds, so a `tauri dev` / debug build reports `engine: "none"` and the Settings toggle is
  **disabled** with "Dictation is not available in this build". This was reported as a bug twice.
  It is not one — but if you are testing dictation, build the installer, or see the dev-loop note
  in Outstanding #5.
- **Windows' `\\?\` verbatim path prefix breaks C libraries.** `resource_dir()` is canonicalised,
  and Rust canonicalisation on Windows always produces `\\?\C:\…`. Rust's own `exists()` accepts it,
  so the capability check reported the model present and the record button appeared — then failed on
  press with "could not load the Vosk model at \\?\C:\…", because **libvosk is C** and opens the
  model with plain file calls. `model_path_for_ffi` strips it. **Only a real INSTALL shows this**: a
  dev build's path comes from the manifest directory and has no prefix. Any future native library
  handed a path from `resource_dir()` needs the same treatment.
- **`set_grammar` contradicted its own documented contract.** The trait said an empty window frees
  the vocabulary; the implementation appended `[unk]` unconditionally, so an empty window
  **constrained the recogniser to nothing at all**. Nothing had ever passed an empty slice — only
  dictation does — so the doc comment had been wrong and untested since it was written.
- **`state.script` cannot be appended to twice in a row.** It round-trips through the engine, so two
  utterances arriving before that returns both append to the same base and the first is **silently
  lost**. Dictation chains from its own last write while recording. Caught by an e2e test, not by a
  person, which is the only reason it was caught at all.
- **`tar` is NOT a portable zip reader.** Windows 10+ and macOS ship **bsdtar** as `tar`, which reads
  zip; **Linux ships GNU tar**, which cannot. `fetch-vosk.mjs` worked on the two platforms it was
  written on and could never have worked on the third. It now tries `unzip` first and falls back to
  `tar`.
- **linuxdeploy walks the binary's ELF dependencies, and an unresolvable one kills the AppImage.**
  The app links `libvosk.so`; our copy sits in the Tauri resource directory, which is on no library
  search path, and `build.rs`'s rpath is a **runtime** hint that means nothing to a **build-time**
  dependency walker. `LD_LIBRARY_PATH` in `release.yml` fixes it, and linuxdeploy then bundles the
  library into the AppImage's own `usr/lib`.
- **⚠️ The bundler SWALLOWS its tools' output — always build releases with `--verbose`.** The
  AppImage failure above cost **three runs** reporting only `failed to run linuxdeploy`, with
  nothing from linuxdeploy itself. Two hypotheses (missing FUSE, a failed strip) were spent on
  guesswork and **both were wrong** — tauri already passes `--appimage-extract-and-run` itself.
  Adding `--verbose` produced the real cause in one run. `release.yml` now always passes it. When a
  bundler step fails opaquely, get the log before forming a theory.
- **Re-tagging is the release repair loop.** `gh release delete vX --yes` → delete the remote tag →
  re-tag the fixed commit. Safe only because the release is built as a **draft** and the publish job
  is what makes it visible. `workflow_dispatch` with a `tag` input can also re-run the workflow
  against an existing tag using the workflow file from `main` — useful for diagnostics without
  moving the tag.

## Traps paid bundling the Vosk model (FT-33)

- **A feature nothing compiles is a feature nothing tests.** `vosk_engine.rs` and `speech.rs`'s
  follow loop were invisible to clippy, to `cargo test --workspace` and to CI, because the feature is
  off everywhere. The FFI itself turned out to be correct — but a unit test asserting
  `capability().engine == "none"`, whose own comment claimed it "runs in the default build", had
  never run in any other and went red instantly. `cargo check -p freally-speech --features vosk` is
  now in `ci.yml` and `ci-local`: **checking does not link**, so it costs nothing — no `libvosk`, no
  model, no download — and the gap cannot reopen.
- **`RUSTFLAGS` is split on SPACES.** `-L C:\...\Havoc Software\...` tears in half and rustc dies
  with "multiple input filenames provided", nowhere near anything Vosk-related. Use
  `CARGO_ENCODED_RUSTFLAGS` (unit-separated) — or better, do it from a `build.rs` via
  `CARGO_MANIFEST_DIR`, which is what the app does and why the app never hit this.
- **Resource paths are validated on EVERY build, not just the one that uses them.** Putting the model
  in `tauri.conf.json`'s `resources` breaks the default build and all of CI, where `vendor/` does not
  exist. Hence the `tauri.vosk.conf.json` overlay applied with `--config`.
- **Only the small and `-lgraph` models support dynamic grammar.** `Recognizer::new_with_grammar` on
  a big static-graph model returns a recogniser that silently ignores the vocabulary and decodes
  against the full dictionary — recognition still "works", just much worse, with no error anywhere.
  The whole script-constrained design depends on this, so the drill asserts it.
- **Vosk's own release assets are inconsistent.** `0.3.50` ships no binaries at all and `0.3.45` has
  no macOS build; **`0.3.42` is the newest with all three platforms**, which is why it is pinned. Its
  macOS `.dylib` is a genuine FAT binary (x86_64 + arm64) — check that before assuming a universal
  build can link.
- **Windows libvosk is MinGW-built**, so `libstdc++-6.dll`, `libgcc_s_seh-1.dll` and
  `libwinpthread-1.dll` must ship beside it or the app will not start. They are GPL-3.0 **WITH
  GCC-exception-3.1**, and that exception is precisely what permits shipping them with non-GPL
  software — recorded in `NOTICE` rather than assumed.
- **The 16 MB `libvosk.lib` is an import library and must not ship.** `fetch-vosk.mjs` splits
  `lib/` (ships, copied wholesale) from `link/` (build only), which also spares the bundler any
  per-platform globbing.

## Traps paid by `release.yml`'s FIRST EVER RUN (1.0.0 took five attempts)

The workflow was written end to end and never executed. Every one of these was invisible until a
tag existed. **Preflight caught none of them** — it passed on the first try; all five failures were
downstream.

- **`icons/icon.icns` was listed in `bundle.icon` and did not exist.** Only the `.ico` and the PNG
  set had ever been generated. **Windows built fine** — the `.icns` is read only by the macOS and
  Linux bundlers — so no amount of Windows testing would ever have surfaced it. Generated from the
  existing 512×512 `icons/icon.png` with `tauri icon` into a temp dir, and only the `.icns` copied
  in, so the rest of the icon set stayed untouched.
- **An `env:` key with an empty value still EXISTS.** The mac-signing guard set
  `APPLE_CERTIFICATE: ${{ … || '' }}` when no certificate was configured, and `std::env::var`
  returns `Ok("")` for that — so the bundler decided to codesign, ran `security import` on nothing,
  and failed the whole macOS bundle. The step's own comment described this exact trap while the
  code walked into it. **The only fix is to not write the key at all**: the secrets now go into
  `$GITHUB_ENV` on the branch where they are real. There is no way to conditionally omit a key
  inline.
- **Tauri writes a `latest.json` entry for every bundle it signs**, so the generic `windows-x86_64`
  key — the one the updater actually reads — pointed at the **`.msi`**, and `linux-x86_64-deb` at
  the `.deb`. Neither can be applied in place; the updater downloads them and fails on every
  machine. The publish gate checked for this and nothing had ever been written to satisfy it. A
  rewrite step now repoints the generic keys at NSIS/AppImage/`.app` and drops the `-msi`/`-deb`
  entries. **The `.msi` and `.deb` stay attached as downloads** — the gate still requires them as
  assets. Do not "simplify" this by dropping them from `bundle.targets`.
- **Three platforms cannot upload `latest.json` at once.** Bundle names differ per platform; that
  one filename does not, and the asset API rejects the loser with
  `{"resource":"ReleaseAsset","code":"already_exists"}` — killing a build that had already compiled
  and signed everything. A true race: it never fired on the attempts where jobs finished minutes
  apart, and killed Windows on the one where all three landed inside eleven seconds. Fixed with
  **`max-parallel: 1`**, roughly 2× the wall clock on a workflow that runs once per release.
- **Re-tagging is the normal repair loop here.** Every attempt was `gh release delete v1.0.0 --yes`
  → delete the remote tag → re-tag the fixed commit. That is only safe because the release is built
  as a **draft** and nothing was ever published; once a release is live, move forward to a new
  version instead.

## Traps paid for THIS session — FT-50 (do not re-learn these)

- **A dialog's key handlers must be registered in a LAYOUT effect, not a passive one.** A passive
  effect (`useEffect`) flushes *after* the browser paints, so there is a window — one frame, longer
  on a loaded machine — where the dialog is on screen and Esc does nothing. Every other dialog hides
  it, because opening one takes a click and the click outlasts the gap; **the tour is the only
  dialog mounted already open**, so its first keystroke can land in the window. macOS CI failed
  `leaving by escape records the tour as seen` **twice, deterministically**, while Windows and Linux
  won the race — and it is not a macOS key-delivery quirk, because Settings' own Escape test passes
  on the same runner. The tell: the three sibling exits (done/skip/backdrop) all click something
  first. `toBeVisible()` only proves React **painted**. Fixed at the source in `ModalShell` rather
  than by teaching the test to wait — visible and dismissible should be the same instant.
- **`page.emulateMedia({ colorScheme })` DOES deliver `matchMedia` change events**, but a test
  that "changes" the preference to the value it already held asserts nothing. The first version of
  "stops following the system once a theme is pinned" pinned *to the value the OS was already
  reporting*, so it passed with the unsubscribe deliberately broken. Pin to the **opposite** of
  what the OS says, then move the OS twice. Proven both ways.
- **The i18n lint reads COMMENTS.** Its scanner is a regex for a `t()` call with a string literal,
  and it does not know it is looking at prose — so writing the pattern out inside a doc comment
  fails the build with `has no key in en.ftl`. Describe it; do not quote it.
- **PowerShell 5.1 cannot be trusted to patch a source file.** `Get-Content -Raw | Set-Content`
  silently produced a file where the replacement had not taken, so a "proof that the check fails"
  came back green and looked like a vacuous test. Do every break/restore through **Node**
  (`readFileSync`/`writeFileSync`), which is what `scripts/`-style proofs already do.
- **Playwright serves the BUILT `dist/`.** Every break/restore proof needs `npm run build`
  between the edit and the test run, or it tests the previous bundle. (Carried forward from
  Phase 2, re-learned this session.)
- **`ResizeEdges` sits on top of a modal backdrop.** The eight invisible window-resize grips are
  `fixed z-50` and render after the backdrop, so a Playwright `click({position:{x:4,y:4}})` meant
  for the backdrop lands on the NorthWest grip and times out. That is correct behaviour — an
  undecorated window must stay resizable while a dialog is open — so click well inside instead.
- **`transition: none` and `transition-duration: 0` are not the same reset.** Replacing the
  narrow per-component reduced-motion rules with one app-wide rule needs
  `transition-delay`/`animation-delay` zeroed too; the shorthand had been resetting them for free.
- **An MSI ProductVersion caps major/minor at 255** — see Outstanding #1c. The whole version
  ladder walks into it.

## Traps paid for the PREVIOUS session — Phase 3 (still true)

- **cpal on Linux needs ALSA — in TWO places, and it bit CI twice** (green on Windows/macOS, red on
  Linux only, because they use WASAPI/CoreAudio and need nothing):
  - **Build:** `libasound2-dev` in `.github/actions/linux-deps` (shared by `ci.yml` + `release.yml`),
    or `alsa-sys`'s build script fails `pkg-config --cflags --libs alsa`.
  - **Runtime:** `libasound2-dev` in `scripts/docker/Dockerfile` — the launch-screenshot runs the
    built binary in a container that must load `libasound.so.2`, or the app exits **127** before the
    window opens.
- **The launch screenshot flakes ("exited early, code 0").** A lingering `freally-teleprompt.exe` from
  a prior run, or a transient window race. Kill stray processes and re-run — it is not a code error
  (the identical binary passed moments earlier).
- **Read a native crate's ACTUAL source before writing FFI you can't compile.** `vosk` 0.3:
  `Recognizer` owns a raw pointer with no lifetime (so `Model` + `Recognizer` live in one struct, drop
  order matters); there is **no live `set_grm`** (rebuild via `new_with_grammar` between utterances);
  results are typed (`CompleteResult::single()`), not raw JSON. All read from the registry cache so
  the drill-only FFI is written against reality.
- **The caesura grammar-index desync (fixed, keep it fixed).** `run_follow` must tokenise the script
  through `freally-align`'s `Script::parse` (which drops `--` caesura tokens), **not**
  `split_whitespace` — otherwise `grammar_window` (indexed by `aligner.word_index()`, an index into
  `Script.words`) centres the vocabulary on the wrong word. The word list fed to the grammar and the
  aligner MUST share one index basis.
- **The PTT mic leak (fixed).** Disabling voice while the hold-to-talk button is held left the mic
  open. The always-listening effect keys its stop-cleanup on `voiceOn`, not just `alwaysListening`, so
  disabling in any mode releases the mic.
- **The settings-draft trap.** `voice_enabled` / `voice_mode` / `voice_follow_enabled` use
  `#[serde(default)]`; if the Settings Apply draft omits them they silently reset. `Settings.tsx` must
  include every voice field in its draft (it does — do not remove them).
- **`cpal` and `vosk` both pass `cargo-deny`** (Apache-2.0/MIT trees) — verified with `all-features`.
- **A shared `BackgroundSession`** (`src-tauri/src/session.rs`) now backs both the command listener and
  the follow loop; the thread lifecycle lives in one place. Do not re-inline it.

### Carried forward from earlier phases (still true)

- **`ci:local` can flake `tauri: debug build` with `LNK1123` — run it in the foreground.** Rebuild
  before believing it; it links in ~15s.
- **eslint blocks `ref.current` assignment during render AND synchronous `setState` in an effect
  body.** Sync a ref inside a `useEffect`; put `setState` in a timeout/callback.
- **PowerShell 5.1 mangles UTF-8** on `Get-Content | Set-Content` — edit the `.ftl` catalogs with the
  Edit tool / Node, never PowerShell. (Confirmed again — two i18n rounds this phase.)
- **Delegate the 17 non-English `.ftl` translations to a subagent** with the exact keys + format, then
  verify with `npm run i18n:lint`. Adding a Settings category shifts index-based tab assertions; the
  Voice pane sits at index 6 (last), so it did not shift the others.
- **`tauri.conf.json` rejects unknown keys; debug builds are console-subsystem (launch detached);
  `decorations:false` means no `MainWindowTitle` (check for a window handle); `jq` isn't installed —
  use `gh --jq`.**

---

## What FT-50 added

```
ui/src/panels/Tour.tsx              the four-step first-run tour (ModalShell, not a spotlight)
ui/src/components/ModalShell.tsx    focus trap + focus restore, ONCE, for every dialog
ui/src/i18n/t.ts                    resolveTheme / watchSystemTheme — "system" resolved here,
                                    never stamped onto <html data-theme>
ui/src/styles/global.css            the :focus-visible floor + one app-wide reduced-motion rule
src-tauri/src/settings.rs           onboarding_seen (a RECORD, preserved across set()) and
                                    onboarding_set_seen, its only writer
ui/src/App.tsx                      `launchClaim` — ONE ordered expression deciding which of the
                                    three launch dialogs (crash / tour / update) gets the slot
ui/e2e/phase5.spec.ts               21 cases; every tour exit, both theme directions, the trap
.github/workflows/release.yml       FT-52, written end to end, NEVER RUN
docs/index.html                     the download menu + real per-OS counts, resolved client-side
```

### Two things worth knowing before you touch `settings.rs`

- **`set()` now destructures `Settings` exhaustively — no `..`.** That is deliberate: adding a
  field stops the build there until someone decides whether it is a *preference* (the user's to
  change) or a *record* (preserved across an Apply). Three fields are records now
  (`accepted_eula_version`, `recent_scripts`, `onboarding_seen`) and the bug that puts them there
  has shipped once in this suite. **Do not "tidy" the `_`-bound fields into a `..`.**
- **`ui/e2e/mock-ipc.ts` mirrors that preserve rule.** If you add a fourth record field in Rust,
  add it there too, or every e2e spec becomes more permissive than the real app.

## What the voice stack is NOW (after 1.1.0)

```
freally-voice/                   microphone capture + resampling (cpal behind `capture-cpal`).
                                 Its MFCC/DTW command recogniser is UNUSED by the app.
freally-speech/                  Vosk recognition + the grammar window; Vosk behind `vosk`.
freally-align/                   words -> visible-char offset. No longer an app dependency.
src-tauri/src/speech.rs          dictation: capability, start/stop, the free-grammar loop,
                                 and `model_path_for_ffi` (the `\\?\` fix — do not remove).
src-tauri/src/session.rs         BackgroundSession — the dictation thread's lifecycle.
src-tauri/tauri.vosk.conf.json   the OVERLAY that bundles the model + native libs. Separate
                                 because `resources` paths are validated on EVERY build.
src-tauri/build.rs               link search path + the per-platform runtime rpath.
scripts/fetch-vosk.mjs           pulls libvosk + the model into src-tauri/vendor (gitignored).
ui/src/panels/Settings.tsx       the Voice pane: ONE dictation toggle, capability-gated.
ui/src/App.tsx                   the record/stop button; voice:dictation -> the script.
NOTICE                           Vosk code + weights + the MinGW runtime DLLs shipped on Windows.
```

Deleted in 1.1.0: `src-tauri/src/voice.rs`, `ui/src/lib/voice.ts` and its tests, the push-to-talk
button, the training UI, the follow loop, and 23 i18n keys × 18 locales.

---

## Architecture decisions (so they are not re-litigated)

- **Vosk is bundled, not OS engines** — per the ROADMAP.md 2026-07-21 amendment (with the licensing
  research). `BUILD-PROMPTS.md`'s Phase 3 block is **stale** on this: it still says "delegate to the
  OS," which the amendment rejected. Trust the ROADMAP.
- **Dictation FREES the grammar; it does not constrain it.** `freally-speech` can restrict the
  vocabulary to a window of the script — far more accurate for reading aloud, and the reason the
  grammar-window builder exists — but dictation writes words the script does not contain yet, so
  constraining it would defeat the point. `set_grammar(&[])` is the seam, and the empty-slice
  contract is now honoured (it was not; see the traps).
- **Only the small and `-lgraph` Vosk models support dynamic grammar.** A large static-graph model
  silently ignores the vocabulary and decodes against the full dictionary — no error, just much
  worse results. `vosk-model-small-en-us-0.15` is required, not merely cheap.
- **Dictation APPENDS, and never touches the scroll.** Inserting at the caret would mean reaching
  into the chip-aware contenteditable; appending goes through the same `onScriptChange` path as
  typing, so the engine, the projector and autosave all behave exactly as they already do.
