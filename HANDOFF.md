# Freally Teleprompt — Handoff

**Written 2026-08-01, after FT-50 (onboarding tour, themes, accessibility) + FT-51/52 prep.**
Read this before the next session. It says where things actually stand, the traps this session
paid for, and what is genuinely outstanding.

---

## Where things stand

| | |
|---|---|
| Version | `0.300.0` — **not** bumped. See Outstanding #2, and the MSI ceiling below. |
| Phase 0 / 1 / 2 / 3 | ✅ scaffold, teleprompter core, offline autocomplete, voice control |
| **FT-50** | ✅ four-step first-run tour, a **system** theme, and the keyboard-accessibility floor |
| FT-51 / FT-52 | 🟡 **prepared, never run** — `.github/workflows/release.yml` exists end to end and the site's download menu is wired; both wait on **your** signing keys and secrets |
| Crates | `freally-voice` (FT-30), `freally-align` (FT-34), `freally-speech` (FT-32) |
| Tests | **121 Rust** · **100 vitest** · **129 Playwright** · per-OS launch screenshots |
| Next | FT-51/52 (the secrets), FT-53 (site content), FT-54 (publish) → `1.0.0` |

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

## ⚠️ Read this first: the `vosk` feature is OFF in CI

Track B's recogniser links a **native library (`libvosk`)** and needs a **~40–50 MB model**. Neither
is in CI or the dev machine. So the **`vosk` Cargo feature is off by default**: the whole gate builds
and passes with no `libvosk`, and voice-following reports itself **unavailable** via
`speech_capability`.

Compiled ONLY with `--features vosk` + `libvosk` present, and therefore **verified by the human drill,
never CI**:

- `freally-speech/src/vosk_engine.rs` (`VoskRecognizer`)
- `src-tauri/src/speech.rs::run_follow` (the recognise → align → emit loop)

They are written against the **`vosk` 0.3 crate's real source** (read from the cargo registry cache),
not guessed — but **do not assume they compile until the drill runs**. The app turns the feature on
through its own `vosk` feature (`src-tauri/Cargo.toml`), which a release build (FT-52) enables. The
pure IP — the grammar-window builder, the aligner, the capability seam — is dependency-free and fully
unit-tested without any of this.

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

### 1. Human drills — still NONE run

`Live-To-Do-List.md` now carries Phase 0/1/2 drills **plus** Phase 3's, none run:
- **Track A** — train commands in your own voice, drive the prompter hands-free, confirm a wrong word
  is refused, confirm audio never hits disk (only `voice-model.json` = features).
- **FT-32** — compile `freally-speech --features vosk` against a real `libvosk` (the FFI has never
  been link-checked); recognise constrained words from a WAV.
- **FT-35** — voice-following in a `vosk` build with a model: it follows, holds (not jumps) on a
  skipped line, and never moves the projector.

### 1b. FT-50's three drills (new)

`Live-To-Do-List.md` now has a **Phase 5** section. Three drills, none run: the tour surviving a
real restart (and the Settings-Apply trap against the real backend), the **system** theme
following a real OS appearance switch, and a real screen reader driving the app. Everything else
about FT-50 is covered by `phase5.spec.ts` (21 cases).

### 1c. ⚠️ `0.300.0` CANNOT PRODUCE A VALID MSI

An MSI `ProductVersion` caps **major and minor at 255**. The phase ladder's minor is
100 / 200 / **300**, and `bundle.targets` still lists `msi`, so the first tag on this ladder fails
inside WiX. Nothing has ever caught it because no tag has ever been pushed.

`release.yml`'s **preflight** job now fails fast and says so. It is a versioning decision, not a
code fix — pick one:
- tag **`1.0.0`** (minor 0, fine, and it is where the roadmap is heading anyway);
- renumber the ladder; or
- drop `msi` from `bundle.targets` and ship NSIS only — which is what `latest.json` and the
  updater use regardless.

### 1d. Pre-existing, found by FT-50's review, deliberately NOT fixed here

**The projector window never applies the locale.** `ui/src/main.tsx` renders `<Projector/>` instead
of `<App/>`, and `initLocale` / `applySettingsToDocument` are only ever called from `App.tsx` — so
that window's `<html lang>` and `<html dir>` are never stamped and `t()` runs at the source locale.
`projector-exit-hint` is therefore **always English**, and an Arabic projector is never `dir="rtl"`.

The theme half of the same gap is harmless by design: the projector surface is black in both
themes and `.proj-btn` / `.proj-track` sit outside the palette on purpose.

Untouched because it is outside FT-50 and wants its own test — but it is a real i18n hole in a
window the talent reads, and SR-4 says all 18 languages stay switchable.

### 2. `0.400.0` release is blocked (FT-33 tail + FT-51/52)

FT-33's opt-in / capability / NOTICE landed, but **the model is not bundled in the installer** and no
release exists. Bundling the model (which flips `vosk` on for release) + tagging `0.400.0` both sit on
**FT-51/52** — code signing + the GitHub release pipeline. This is the same **DoD step 9** that has
blocked every version since `0.100.0` (the updater still ships an empty pubkey and fails safe). Until
then the version stays `0.300.0` and voice-following is honestly unavailable.

### 3. Known edge — commands and following can both be on

In a `vosk` build, `voiceEnabled` (commands) and `voiceFollowEnabled` (following) are independent, so
both can be on → **two mic sessions / two `CpalSource`s** at once. Not a crash (each is independent),
but wasteful and the indicators can confuse. Mutual exclusion is a future refinement. In current
builds (no `vosk`) following never runs, so there is no conflict today.

---

## Traps paid for THIS session — FT-50 (do not re-learn these)

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

## What Phase 3 added

```
freally-voice/               FT-30  MFCC + DTW voice-command recognition; cpal behind `capture-cpal`
freally-align/               FT-34  deterministic words -> visible-char offset; the differentiator
freally-speech/              FT-32  Vosk recognition + grammar window; Vosk behind the `vosk` feature
src-tauri/src/voice.rs       FT-31  command backend (train/forget/listen); model = FEATURES, never audio
src-tauri/src/speech.rs      FT-35  voice-following (capability + feature-gated follow loop)
src-tauri/src/session.rs            BackgroundSession — shared thread lifecycle for both loops
ui/src/panels/Settings.tsx          the Voice pane (commands + the follow toggle, capability-gated)
ui/src/App.tsx                      voice:command -> transport, voice:offset -> scroller, indicators
ui/src/lib/voice.ts                 command -> transport mapping (pure, unit-tested)
ui/src/api/events.ts                listenSafe + the voice:* subscriptions
NOTICE                              Vosk code + weights (both Apache-2.0), shipped-with-the-feature
```
Plus the docs site (voice-control section + changelog), 18-language i18n (**172 keys**), and per-OS
capability matrices in the crate READMEs.

---

## Architecture decisions (so they are not re-litigated)

- **Vosk is bundled, not OS engines** — per the ROADMAP.md 2026-07-21 amendment (with the licensing
  research). `BUILD-PROMPTS.md`'s Phase 3 block is **stale** on this: it still says "delegate to the
  OS," which the amendment rejected. Trust the ROADMAP.
- **Voice-following drives the `overrideOffset` seam** (the same one read-aloud FT-16 uses), so the
  projector and shared scroll state are **untouched by design** (per FT-35). Losing confidence
  **holds** the aligner's last position (the aligner never guesses — FT-34) with a green/grey
  indicator; it does **not** snap back to shared state.
- **Track A is model-free forever** (MFCC+DTW on your own recordings); **only Track B bundles Vosk**,
  and only opt-in. Commands need no model, no network; following needs the model or reports itself off.
