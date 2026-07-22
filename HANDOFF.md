# Freally Teleprompt — Handoff

**Written 2026-07-22, after Phase 1 (`0.200.0`) and the i18n/font pass merged.** Read this before
starting the next session. It says where things actually stand, what is genuinely outstanding, and
the traps waiting in Phase 2.

---

## Where things stand

`main` is green on **all 13 CI checks**. Four PRs have landed: #3 (the phase), #4 (the
Definition-of-Done review pass), and #5 (bundled fonts, the language gate, and containerised Linux
rendering).

| | |
|---|---|
| Version | `0.200.0` (Cargo.toml, package.json, ui/package.json, tauri.conf.json — all four) |
| Phase 0 | ✅ scaffold, ported engine, docs site, EULA gate, problem reporter |
| Phase 1 | ✅ FT-10 … FT-16 — script library, chip editor, projector, LAN mirror, transport, BPM, appearance, read-aloud |
| i18n | ✅ 18 languages fully translated, Noto bundled, switch-tested on all 3 OSes |
| Tests | 56 Rust · 57 vitest · **82 Playwright** · per-OS app-launch + per-language screenshots |
| Next | **Phase 2 — dictionary autocomplete → `0.300.0`** (FT-20, FT-21, FT-22) |

### Get going

```bash
npm ci
npm run ci:local          # the full gate — 14 checks, ~3 min
npm run tauri -- build --debug --no-bundle && node scripts/app-screenshot.mjs
```

> **Run Playwright from `ui/`, not from the repo root.** The specs write screenshots to the
> relative path `e2e/screenshots`, so `npx playwright test --config=ui/playwright.config.ts` from
> the root silently drops a second copy at `<repo>/e2e/` — a dozen of those got committed once.
> `npm run test:e2e` sets the right cwd; use it.

### What #5 added, in one paragraph

The app bundles Noto for every script its 18 languages need, because switching to Japanese on a
machine with no Japanese font used to render the whole interface as tofu. Three checks now guard
that, each aimed at a blind spot the others cannot see: `i18n:lint` fails on a value left
byte-identical to English (bulk translation falls back silently and still parses);
`i18n-fonts.spec.ts` proves every character is covered by a **bundled** face, not a system font
that happens to exist here; and `language-switch.spec.ts` drives the real Settings dialog and
asserts it repaints into that locale's own catalog. The Playwright job runs on all three OSes —
font rasterisation, RTL layout and the native `<select>` are exactly what differs between them.
`THIRD-PARTY.md` carries the OFL notice and **ships inside the installer**, because OFL condition 2
binds each *copy*, not the repository.

---

## Standing rules (these are now enforced, not suggestions)

1. **`npm run ci:local` must be green locally BEFORE any push.** GitHub CI is the second opinion.
   If CI ever fails on something `ci:local` passed, that is a bug in `scripts/ci-local.mjs` — fix
   the script in the same PR. (`BUILD-PROMPTS.md` → DoD step 6/8.)
2. **Playwright covers every feature it possibly can; everything else gets a step-by-step drill in
   `Live-To-Do-List.md`.** Numbered steps and an explicit ✅ for what you should see. "Verify X
   works" is not a drill. A feature in neither bucket means the phase is not done. (SR-2.)
3. **Look at the three `app-running-<os>` CI artifacts after every phase.** (SR-3.)
4. **Do a code review every time.** `/code-review` is user-triggered and billed and cannot be
   launched from an agent session — so do it directly against the diff instead of skipping it.
   Mike has given standing permission; it is not optional and does not need re-asking.
5. **All 18 languages stay translated, legible and switchable.** (SR-4 — see `ROADMAP.md`.) Also
   look at the `ui-panel-gallery-<os>` artifacts: `settings-<code>.png` is where a per-OS font or
   RTL problem is visible and nowhere else.
6. **Every new check must be proven to fail.** Break the thing it watches, watch it go red, put it
   back. This is not ceremony — see the two entries under *Traps* below, where a check that could
   not fail sat green for a whole phase while proving nothing.

---

## ⚠️ Outstanding — read before Phase 2

### ~~1. Does the app render on Linux?~~ — ANSWERED 2026-07-22. It does.

Kept here because it was the repo's highest-value open question for a phase, and because how it
went wrong is worth more than the answer.

The cause was **the runner, not the app**: the GitHub Linux runner has no working GL. A spike
printed `libEGL warning: DRI3 error` with no WebKit processes at all — WebKitGTK could not start a
compositor, so it never mapped a toplevel and X only ever saw GTK's 10×10 leader window. Disabling
the WebKit sandbox, disabling DMA-BUF, adding `openbox` and pinning `GDK_BACKEND` had all failed
because none of them addressed that.

The screenshot step now runs in a container (`scripts/docker/`) with Mesa's llvmpipe software
renderer, where the app renders its full shell correctly. The step is **blocking again**, with
`if-no-files-found: error`.

**The lesson worth keeping:** that job spent an entire phase passing while proving nothing. A
screenshot check whose environment cannot render is not a lenient check, it is a broken one — it
cannot fail, so a green run and a red one carry the same information. The same trap turned up
again in `i18n-fonts.spec.ts` (see `git log`), where `document.fonts.check()` returns `true` for a
character no font covers, so the whole suite passed with every font uninstalled. When you add a
check, **break the thing it watches and confirm it goes red.**

### 2. Human drills never run

`Live-To-Do-List.md` has step-by-step drills for everything automation cannot reach: a second
monitor, prompter glass, audible speech, a phone on your Wi-Fi, an ungraceful kill, the window
chrome, minimize-to-tray, and the crash→restart→report loop still outstanding from Phase 0. **None
have been run.** They are the only coverage those features have.

### 3. DoD step 9 is blocked

Tag → release → verify the updater and every download link **cannot complete** until FT-51/FT-52
land code signing and the release pipeline. `0.100.0` and `0.200.0` both shipped in this position.
The updater ships with an empty pubkey and refuses every package — it fails safe, but it cannot
succeed.

---

## Phase 2 — dictionary autocomplete → `0.300.0`

The prompt is in `BUILD-PROMPTS.md`. **This is a lookup against bundled tables — not a model, not a
network call. Nothing is ever downloaded.**

- **FT-20** — the seam: `complete(prefix, lang) -> suggestions[]`, plus an enable/disable toggle and
  a language selector in Settings.
- **FT-21** — ghost-text **word and phrase** suggestions inline in the editor; **Tab** commits (turns
  normal colour), **Esc** dismisses; per-language; instant (<1 ms).
- **FT-22** — the data pipeline: word + phrase tables for all 18 languages (target 20–30k words +
  10–20k phrases each), **permissively licensed only**, every source recorded in `NOTICE`, plus a
  lint that fails if any language is missing either table.

### The head start — most of this phase is already written, in Capture

**I checked all of this rather than assuming it.** Freally Capture already implements FT-20, FT-21
*and* FT-22. When I ported `CaesuraEditor.tsx` for FT-11 I **deliberately stripped the autocomplete
out**, because it was Phase 2 work and shipping dead code was worse. Port it back:

| Take from `../Freally Capture` | Verified | What it is |
|---|---|---|
| `ui/src/lib/suggest.ts` | 110 lines | `loadDict(lang)` + `suggest(dict, textBeforeCaret)` — the FT-20 seam, already written, DOM-free and unit-testable. Buckets entries by first two characters so a lookup scans one small bucket in frequency order. |
| `ui/src/dict/*.json` | **all 18 locales, 21 MB** | The FT-22 tables themselves — words + phrases, frequency-ordered. |
| `ui/src/components/CaesuraEditor.tsx` | — | The `data-ghost` span machinery: `showGhost` / `refreshGhost` / `acceptGhost` / `removeGhost`, the `lang` prop, and the Tab handler. |
| `THIRD-PARTY.md` | 60 lines | The dictionary provenance, per language, with licences. |

Its own doc comment says the dictionaries were built to be *"reused by the standalone Freally
Teleprompt"* — this was planned for.

**Critical detail when porting the editor:** our `CaesuraEditor.tsx` has three functions that must
learn to *ignore* ghost spans again — `serialize()`, `nodeLen()`, and `offsetOf()`. Capture's
versions all check `el.dataset.ghost !== undefined` and skip. I removed those checks when stripping
the feature. Miss them and the ghost text is serialised **into the user's script**, and every caret
offset is wrong by the length of the suggestion. That is the single most likely way to break FT-21.

### Licensing (FT-22) — checked, and it looks clean

The tables **ship inside the installer**, so a GPL or CC-BY-SA source would be a redistribution
problem, not a footnote. I audited every licence named in Capture's `THIRD-PARTY.md`:

> Tatoeba (**CC BY 2.0 FR**) · SCOWL 2020.12.07 (**BSD/MIT-style, attribution-only, sale explicitly
> permitted**; incorporates public-domain *Moby Words II*) · Leipzig Corpora Collection
> (**CC BY 4.0**) · OpenTaal (**BSD-3-Clause / CC BY 3.0**) · MIT · Apache · public domain

All **attribution-only** — no copyleft. The file states outright that no GPL/LGPL, ShareAlike
(CC-BY-SA), or NonCommercial (CC-BY-NC) data is used, and nothing in it contradicts that. That
clears the bar `BUILD-PROMPTS.md` sets.

**But do not treat this as done.** Before shipping:

1. **Teleprompt needs its own `NOTICE`** — FT-22 requires every source recorded. Port the
   dictionary section of Capture's `THIRD-PARTY.md`; do not rely on a sibling repo's file.
2. **Attribution-only still means attribution is mandatory.** CC BY obliges you to credit the
   source; that is the whole licence. The NOTICE must ship with the installer, not just live in
   the repo.
3. **Re-verify rather than trust the summary above**, including mine. Licences get restated
   incorrectly, and this is the one Phase 2 risk that is expensive to unwind after release.
4. **Watch the bundle.** 21 MB of JSON is real. Capture lazy-loads one locale via a Vite glob
   import so only the active language is fetched — keep that, and check what the installer size
   does.

Net: FT-22's long pole was expected to be *sourcing* the data. It appears to be already sourced,
which likely makes Phase 2 considerably shorter than the roadmap assumes — **once the licence
audit is redone independently.**

### Things Phase 1 changed that Phase 2 will touch

- **Settings is now a tabbed modal** (`ui/src/panels/Settings.tsx`) in Freally Capture's shape:
  sidebar + search + OK/Cancel/Apply. Adding autocomplete settings means a new entry in
  `CATEGORIES`, `CATEGORY_LABELS`, `CATEGORY_FIELDS` **and** `CATEGORY_KEYS` (the search index) —
  four parallel tables. A cleanup agent flagged collapsing them into one; that was skipped and is a
  reasonable first move if you are editing them anyway.
- **`settingsSet` now returns the stored settings** and callers must adopt the *result*, never their
  draft — Rust clamps, and the UI used to display values the app was not using.
- **`ui/src/lib/caesura.ts` owns the ` -- ` grammar** via `scanCaesuraAt`. The chip tokenizer and
  read-aloud both call it. Do not add a fourth scanner — that drift was a shipped bug (`--2.5.3`
  drew a chip the engine skipped) and the parity test in `phase1.test.ts` now guards it.
- **18 locales, key parity enforced.** `npm run i18n:lint` fails on any drift — a key added to
  `en.ftl` must be added to all 17 others. Lifting already-translated strings from
  `../Freally Capture/ui/src/i18n/locales/` saved a great deal of time in Phase 1 and is worth
  checking first — **but note Capture has no autocomplete UI strings** (its autocomplete is
  always-on with no settings), so FT-20's toggle and language selector need translating from
  scratch across 17 locales.
- **`theme:lint`** fails the build if a component uses a `bg-white/N` or `border-white/N` utility
  with no light-theme override in `global.css`. Ghost text will need a colour that works in both
  themes — it is drawn with `opacity`, which is theme-safe, but check.

---

## Traps already paid for (do not re-learn these)

- **`tauri.conf.json` rejects unknown keys** — no `"//comment"` fields (unlike `package.json`).
- **Debug builds are console-subsystem apps** (`windows_subsystem` is release-only), so a GUI child
  launched attached to a harness console exits cleanly with code 0 on a console event. Launch
  detached.
- **`decorations: false` means Windows reports no `MainWindowTitle`** — check for a top-level
  *window handle*, not a title.
- **Screen capture on Windows must be DPI-aware** or you silently photograph the top-left ~44% of a
  HiDPI screen.
- **The projector must never use OS exclusive fullscreen** — it froze the whole desktop in Capture.
  It is a borderless window sized to the monitor.
- **`aux`/projector window creation must be an `async` command** — a synchronous one deadlocks
  building a webview that calls back into IPC on mount.
- **Fluent number-formats numeric arguments** (`2560` → `2,560`). Pass technical values as strings.
- **PowerShell 5.1 mangles UTF-8** on `Get-Content | Set-Content` of repo text — use the Edit tool.
- **`jq` is not installed** in Git Bash here; use `gh --jq`.
- **`document.fonts.check()` does not mean "has a glyph for this".** It means "is the face covering
  this character already loaded", so when *nothing* covers the character — or the family does not
  exist at all — it returns `true`. A font-coverage test written the obvious way passed with all
  six font packages uninstalled. Read the faces' declared `unicode-range` instead.
- **A flex item is blockified**, so `el.getClientRects().length` is 1 no matter how many lines its
  text wraps onto. To detect wrapping, use a `Range` over the contents — it returns one rect per
  line box. The obvious version of that assertion also passed against the real bug.
- **The GitHub Linux runner has no working GL** (`libEGL: DRI3 error`); WebKitGTK never maps a
  toplevel, so screenshots are black regardless of app health. Run it in the container
  (`scripts/docker/`) with llvmpipe. Do not "fix" this by making the step non-blocking.
- **macOS CI reports `prefers-reduced-transparency: reduce`**, so anything asserting a
  `backdrop-filter` must pin the media feature via CDP or it fails on macOS only — correctly.
- **Bundled Noto covers writing systems, not emoji.** A decorative emoji in the UI renders as a
  tofu box on Linux. Don't add them; the roadmap's specified labels don't have any.
- **Tauri maps a `../` resource path to a `_up_/` folder.** Use the object form
  (`{"../FILE.md": "FILE.md"}`) to place it properly, and confirm by unpacking the built installer.

---

## Quick map of what Phase 1 added

```
src-tauri/src/
  scripts.rs     FT-10  .ftscript files; is_valid_name() is the whole security surface
  projector.rs   FT-12  display enumeration + the projector window (async on purpose)
  lanmirror.rs   FT-12  read-only HTTP mirror; off by default, loopback unless opened, session key
  tray.rs               minimize-to-tray; the icon exists ONLY while the window is hidden
  tts.rs         FT-16  Linux speech fallback (shells out; no engine bundled)
  assets/mirror.html    the served mirror page — self-contained, no external fetches

ui/src/
  components/TitleBar.tsx    custom window chrome (centred title, gear/about, min/max/close, resize grips)
  components/Transport.tsx   FT-13 shared transport, hold-to-repeat
  components/CaesuraEditor.tsx  FT-11 chip editor  ← Phase 2 re-adds ghost text here
  lib/caesura.ts             the ` -- ` grammar; scanCaesuraAt is the ONE scanner
  lib/{speed,fonts,time,tts}.ts   FT-14/15/16 pure logic
  panels/{Projector,ProjectorSetup,ScriptLibrary,About,Settings}.tsx

scripts/app-screenshot.mjs   launches the built app on any OS and photographs it
scripts/docker/              Linux render container (Xvfb + openbox + llvmpipe); CI uses it

ui/e2e/
  mock-ipc.ts                the mocked bridge; RECORDS every IPC call. `settings_set` mirrors
                             Rust and returns what it stored — the UI adopts that return value
  phase1.spec.ts             every FT-1x feature Playwright can reach
  gallery.spec.ts            panel screenshots + both SR-1 blur branches
  i18n-fonts.spec.ts         per-locale glyph coverage, from the faces' own unicode-range
  language-switch.spec.ts    the real Settings language switch, all 17 + persistence
```

Note `ui/tsconfig.json` now type-checks `e2e/` as well as `src/`. It did not, which is how a spec
came to pass an option `MockState` never declared — the tests compiled and ran in English while
claiming to test 18 locales.
