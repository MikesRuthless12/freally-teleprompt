# freally-speech

**Script-constrained speech recognition → word hypotheses with timings.** Track B's recogniser (FT-32).

Where [`freally-align`](../freally-align) decides *where in a known script* the reader is, this crate produces what it works on: a stream of recognised words with timings. It is backed by **Vosk** (Apache-2.0 code **and** Apache-2.0 English weights — both permissive), driven in **dynamic-grammar mode** over a sliding window of the upcoming script lines.

## The accuracy lever (the owned part)

A general recogniser weighs every word in its lexicon. A teleprompter knows the script, so it can tell the recogniser *the next thing this person says is almost certainly one of these few dozen words.* That constraint is what makes a small offline model accurate enough to follow a read — and it's only possible because we know the script.

`grammar_window(words, center, back, ahead)` builds that vocabulary from the script and the reader's position. It's pure, dependency-free, and unit-tested. The `[unk]` token is added alongside so an off-script word is reported as *unknown* rather than force-fit to the nearest in-grammar word — exactly the signal the alignment layer needs to hold position on an ad-lib.

## Shape

| Item | Role |
|---|---|
| `grammar_window` | Build the constrained vocabulary from the script window. Pure, tested. |
| `WordHypothesis` / `Hypothesis` | The recogniser's output — words + timings — that feed `freally-align`. |
| `SpeechRecognizer` (trait) | The engine seam, so callers/tests depend on the contract, not Vosk. |
| `capability(model_path)` | Honest per-build/per-machine availability, so a caller degrades instead of guessing. |
| `VoskRecognizer` (feature `vosk`) | The Vosk-backed implementation. |

## Building the Vosk engine

The pure core builds and tests with **no native dependency**. The `VoskRecognizer` FFI is behind the off-by-default **`vosk` feature**, because it links the native **`libvosk`** library and needs a model on disk:

```bash
# Needs libvosk on the linker path + a model dir (neither ships with the crate).
cargo build -p freally-speech --features vosk
```

So the whole workspace test suite and CI run **without** libvosk, and the engine is verified by a human drill (see the repo's `Live-To-Do-List.md`). The host app turns the feature on once the model is packaged (FT-33).

## Licensing

Vosk's **code** is Apache-2.0 and the mainline English **weights** are Apache-2.0 — separately verified, both permissive. When the model ships (FT-33) both are recorded in the installer's `NOTICE`. No copyleft, no per-use licence.

## Per-OS capability (for suite reuse)

Standalone and reusable by any Havoc app — nothing here depends on Teleprompt.

| | Windows | macOS | Linux |
|---|---|---|---|
| Grammar / capability core | ✅ | ✅ | ✅ (pure, no deps) |
| Vosk engine (`vosk` feature) | `libvosk` + model | `libvosk` + model | `libvosk` + model |

The `vosk` feature links the **same** native library on every OS — one code
path, no per-OS branch and no per-OS accuracy cliff. Without a permissively-
licensed model for a language, `capability()` reports it unavailable rather than
degrading silently, so a caller can hand back to manual control honestly.

## Status

The grammar/capability core is complete and tested. `VoskRecognizer` is written against the `vosk` 0.3 crate's real API but compiles only with `libvosk` present, so it's drill-verified, not CI-verified. Model packaging + opt-in is FT-33; wiring recognition → `freally-align` → the scroller is FT-35. Word tokenisation is whitespace-based (English/spaced scripts); unspaced scripts (Japanese, Chinese) would need segmentation — a known limit shared with the rest of the pipeline.
