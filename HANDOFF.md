# Freally Teleprompt — Handoff

**Written 2026-07-22, after Phase 2 (`0.300.0`) — offline dictionary autocomplete.** Read this
before starting the next session. It says where things actually stand, what is genuinely
outstanding, and the traps waiting in Phase 3.

---

## Where things stand

| | |
|---|---|
| Version | `0.300.0` (Cargo.toml, package.json, ui/package.json, tauri.conf.json — all four) |
| Phase 0 | ✅ scaffold, ported engine, docs site, EULA gate, problem reporter |
| Phase 1 | ✅ FT-10 … FT-16 — script library, chip editor, projector, LAN mirror, transport, BPM, appearance, read-aloud |
| Phase 2 | ✅ FT-20, FT-21, FT-22 — the seam, ghost text, and a **rebuilt** data pipeline |
| i18n | ✅ 18 languages × 150 keys, Noto bundled, switch-tested on all 3 OSes |
| Tests | 56 Rust · **81 vitest** · **96 Playwright** · per-OS app-launch + per-language screenshots |
| Next | **Phase 3 — voice control → `0.400.0`** (FT-30 …) |

### Get going

```bash
npm ci
npm run ci:local          # the full gate — 15 checks
```

> **Run Playwright from `ui/`, not the repo root** (`npm run test:e2e` sets the cwd). The specs
> write to the relative path `e2e/screenshots`.

---

## ⚠️ Read this first: the Phase 2 licence finding

**The previous handoff said Phase 2's data was "already sourced" in Freally Capture and that the
licences "looked clean". That was wrong, and it was wrong in the expensive direction.**

Capture's `THIRD-PARTY.md` records its Polish dictionary as **Leipzig Corpora Collection, CC BY
4.0**. Leipzig's actual Terms of Usage grant the corpus downloads "solely for **non-commercial**
personal and scientific purposes licensed under the Creative Commons License **CC BY-NC**". The
cited corpus (`pol_news_2020_1M`) is one of those downloads. Non-commercial data cannot ship inside
a paid installer, and Capture's Polish table (198k words) does.

> The trap: Leipzig publishes *two* things. Their **Frequency Dictionaries** CD-ROM word lists
> really are CC BY 3.0. The free **corpus downloads** — which is what anyone actually reaches for,
> and what was used — are CC BY-NC. A summary that says "Leipzig, CC BY" is not wrong about the
> organisation, only about the product, and that is the whole difference.

Two smaller things the old summary also missed: **SCOWL at size ≥80 incorporates the UK Advanced
Cryptics Dictionary**, whose licence demands its notice be "prominently displayed and the text of
this document ... included verbatim" — an obligation Capture's notice does not discharge; and the
tables did not actually meet FT-22's size target (6 locales under the word floor, 8 under the
phrase floor).

**What was done instead:** every table was rebuilt from scratch by a real pipeline
(`scripts/build-dicts.mjs`) against **one** source — the **Tatoeba** sentence corpus, **CC BY 2.0
FR**, attribution-only, commercial use permitted, covering all 18 languages. One source, one
obligation, recorded in `NOTICE`, which now **ships in the installer**.

**Nothing from Capture's `ui/src/dict/` was ported. Do not port it later either.**

### Where that leaves the data

12 MB total (Capture's was 21 MB), lazily loaded one locale at a time — Vite splits each table into
its own chunk, so the app holds ~0.5 MB, not 12.

14 of 18 locales hit the full 30k words / 20k phrases target. Four are **corpus-limited**, because
Tatoeba simply has fewer sentences in them, and no permissive source was worth the licence debt:

| locale | words | phrases | Tatoeba sentences |
|---|---|---|---|
| hi | 7,916 | 19,225 | 16,317 |
| id | 11,051 | 20,000 | 28,077 |
| ko | 20,096 | 5,666 | 15,825 |
| vi | 4,922 | 20,000 | 32,426 |

They work; they suggest less. `dict-lint` deliberately does **not** enforce a size floor — FT-22's
floor is "present, parses, and survives indexing", and 20k/10k is the target to aim at. If you want
these fuller, the honest options are a new permissively-licensed source (audit it at the source) or
accepting the corpus limit.

> **One filter decision worth knowing:** the pipeline keeps words seen only ONCE. Tatoeba is
> human-written and peer-reviewed, so a hapax there is a real word, not crawl noise — a frequency
> floor of 2 cost roughly half the vocabulary in exactly the low-resource languages that could
> least afford it (Korean went 6.4k → 20k when it was dropped). Phrases keep a floor of 2.

---

## Standing rules (enforced, not suggestions)

1. **`npm run ci:local` must be green locally BEFORE any push.** If CI fails on something
   `ci:local` passed, that is a bug in `scripts/ci-local.mjs` — fix it in the same PR.
2. **Playwright covers every feature it possibly can; everything else gets a step-by-step drill in
   `Live-To-Do-List.md`.** A feature in neither bucket means the phase is not done.
3. **Look at the three `app-running-<os>` CI artifacts after every phase.**
4. **Do a code review every time**, directly against the diff.
5. **All 18 languages stay translated, legible and switchable.** Also check the
   `ui-panel-gallery-<os>` artifacts.
6. **Every new check must be proven to fail.** Break the thing it watches, watch it go red, put it
   back. Done this phase for `dict-lint` (all five failure modes), the picker-order test, and the
   ghost-serialization test — removing that one guard turns **4** Playwright tests red.
7. **Re-read every data licence at the source, not in a summary — including this file's.** See
   above for what a trusted summary cost.

---

## ⚠️ Outstanding

### 1. Human drills have still never been run

`Live-To-Do-List.md` now carries Phase 0, 1 and 2 drills. **None have been run.** Phase 2 adds
five that genuinely cannot be automated: ghost text under a real **IME**, Japanese/Chinese
suggestions (the two languages whose tables are built differently because they have no spaces),
legibility in both themes, RTL, real typing speed on the largest table, and **confirming `NOTICE`
is actually inside the built installer**. That last one is a licence obligation, not a nicety.

### 2. DoD step 9 is still blocked

Tag → release → verify the updater and download links **cannot complete** until FT-51/FT-52 land
code signing and the release pipeline. `0.100.0`, `0.200.0` and now `0.300.0` have all shipped in
this position. The updater ships with an empty pubkey and refuses every package — it fails safe,
but it cannot succeed.

### 3. Two known cosmetic/pre-existing issues (not introduced by Phase 2)

- **Clearing the editor leaves `"\n"`, not `""`.** The browser leaves its own `<br>` behind when a
  contenteditable is emptied, and `serialize()` reports it as a newline. **Verified identical with
  autocomplete off**, so it is pre-existing FT-11 behaviour. Harmless today; worth a look if
  anything ever compares a script to empty-string.
- **`vite build` warns about chunks >500 kB.** Those are the dictionary chunks, and they are
  lazy-loaded on purpose. Left alone rather than raising `chunkSizeWarningLimit`, which would also
  hide a real regression.

---

## What Phase 2 added

```
scripts/build-dicts.mjs      FT-22  the pipeline: Tatoeba -> ui/src/dict/<locale>.json
                                    (needs bzip2 + curl; caches to .dict-cache/, gitignored)
ui/scripts/dict-lint.mjs     FT-22  every locale has both tables, they parse, they survive indexing
NOTICE                       FT-22  the CC BY 2.0 FR attribution — SHIPS IN THE INSTALLER
ui/src/dict/*.json                  18 tables, 12 MB, one lazy chunk each

ui/src/lib/suggest.ts        FT-20  loadDict() + completeWith() (pure) + complete() (the seam)
ui/src/components/CaesuraEditor.tsx  FT-21  buildGhost/ghostOf/removeGhost, refreshGhost, acceptGhost
ui/src/panels/Settings.tsx   FT-20  the new "Editor" pane — toggle + suggestion language
ui/src/i18n/locales.ts              PICKER_LOCALES + resolveAutocompleteLocale()
ui/e2e/phase2.spec.ts               13 cases, centred on "an unaccepted suggestion is never saved"
```

### The language picker order (asked for mid-phase)

Every language picker now shows **English first, then the other seventeen alphabetically by their
own native name**, in the same order no matter which language the app is in. `PICKER_LOCALES` in
`locales.ts` does this with a **collator pinned to `en`** — never the active locale. That pinning
is load-bearing and there is a test proving it: under Arabic a live collator lifts العربية to
second place, and under Japanese it lifts 日本語 and 简体中文 above Cyrillic.

`LOCALES` itself was left in the shared Havoc order, which the sibling apps also ship and other
code indexes. Note its doc comment claims "alphabetical by code" — it is actually alphabetical by
*English name*. Pre-existing, untouched, but do not trust that line.

---

## Traps already paid for (do not re-learn these)

Phase 2's new ones first:

- **Playwright runs against `vite preview`, i.e. the BUILT `dist/` — not a dev server.** Run
  `npm run build` first or you are testing a stale bundle. This cost a full debugging detour: ten
  specs failed against a `dist/` built before the feature existed. `ci:local` builds first, which
  is why it only bites when you run `test:e2e` directly.
- **Ghost text must be redrawn when the table finishes loading.** `complete()` is synchronous and
  the ghost is otherwise only drawn from `onInput`, so an operator typing faster than a ~600 kB
  chunk downloads gets *no* suggestion until they happen to press another key. The `loadDict().then()`
  redraw in `CaesuraEditor` closes that window — this was a real bug, found because the tests were
  slow and flaky rather than cleanly red.
- **Prettier will happily reformat 12 MB of generated JSON.** `ui/.prettierignore` excludes
  `src/dict`; without it `format:check` fails and `format` inflates the tables enormously.
- **`ci:local` can fail `tauri: debug build` with `LNK1123: failure during conversion to COFF` —
  and it is a flake, not a code error.** Seen twice in four runs on this machine. Both failures
  were runs launched detached/in the background and later reaped; both foreground runs passed. The
  identical `npm run tauri -- build --debug --no-bundle` succeeded standalone 4/4, including
  immediately after a warm `clippy`+`cargo test` and immediately after Playwright with eleven
  node/Chromium processes still resident — neither of which reproduces it. **Run `ci:local` in the
  foreground.** If you hit LNK1123, rebuild before believing it: it links in ~15s.
- **eslint enforces `react-hooks/refs`: you cannot assign `someRef.current` during render.** The
  idiom for "a prop a DOM handler needs without re-subscribing" is to sync it inside a `useEffect`,
  the way `caesuraSecsRef` already did. `tsc` and every test pass with the render-time assignment —
  only `npm run lint` catches it, which is a good reason not to skip a step of the gate.
- **Adding a Settings category shifts every index-based tab assertion.** The new "Editor" pane sits
  at index 1 and broke `language-switch.spec.ts`'s `getByRole("tab").nth(n)` map.
- **A locale-independent test needs a locale-independent selector.** `getByRole("button", {name:
  "Settings"})` cannot find the gear when the app is in Japanese — hence `data-testid="titlebar-settings"`.
- **`settings_set`'s recorded IPC argument is `next`, not `settings`.**
- **Node's `Intl.Segmenter` with full ICU segments Japanese and Chinese correctly**, which is why
  the pipeline needs no third-party tokenizer and adds no licence surface. Use it for unspaced
  languages only; it is far slower than a regex and buys nothing for spaced ones.
- **Japanese and Chinese never reach the phrase path**, which only fires when the caret sits after
  whitespace. Their useful multi-word runs are seeded into `words` instead — which is why `words`
  may contain entries with more than one token for those two locales.
- **PowerShell 5.1 mangles UTF-8**; the 17 catalogs were edited through Node with explicit `utf8`.
  (Confirmed again this phase — the Edit tool or Node, never `Get-Content | Set-Content`.)

Carried forward from earlier phases:

- **`tauri.conf.json` rejects unknown keys** — no `"//comment"` fields.
- **Debug builds are console-subsystem apps**, so launch detached.
- **`decorations: false` means Windows reports no `MainWindowTitle`** — check for a window handle.
- **Screen capture on Windows must be DPI-aware.**
- **The projector must never use OS exclusive fullscreen** — borderless window sized to the monitor.
- **`aux`/projector window creation must be an `async` command.**
- **Fluent number-formats numeric arguments** (`2560` → `2,560`). Pass technical values as strings.
- **`jq` is not installed** in Git Bash here; use `gh --jq`.
- **`document.fonts.check()` does not mean "has a glyph for this"** — read the faces' `unicode-range`.
- **A flex item is blockified**, so use a `Range` over the contents to detect wrapping.
- **The GitHub Linux runner has no working GL** — run the screenshot in `scripts/docker/` with
  llvmpipe. Do not "fix" it by making the step non-blocking.
- **macOS CI reports `prefers-reduced-transparency: reduce`** — pin the media feature via CDP.
- **Bundled Noto covers writing systems, not emoji.**
- **Tauri maps a `../` resource path to a `_up_/` folder** — use the object form, and confirm by
  unpacking the built installer. (`NOTICE` was added to `resources` this phase and has **not** yet
  been confirmed by unpacking — that is drill #5.)
