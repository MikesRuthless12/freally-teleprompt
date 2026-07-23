# freally-align

**Deterministic script alignment: noisy recognised words → a visible-character offset in a known script.**

FT-34 — the layer the competitive research says users actually judge (not the
recogniser). Given the script the reader is holding, it decides where in it they
are, one recognised word at a time. No model, no audio, no network — pure
dynamic-programming word matching. Reusable by any Havoc app that follows a
script by voice.

## Built against the three complaints that dominate every competitor's reviews

| Complaint | How this answers it |
|---|---|
| False pause at punctuation | Punctuation is stripped at tokenisation, so a comma is never a word and can never hold the scroll — the offset just advances to the next spoken word. |
| Multi-paragraph jump on one misheard word | A single word moves the position only within a bounded window (a line or two). A larger move needs several consecutive words to agree (a re-anchor). |
| Dies after ~30 s of silence | State persists. No input → no change; reading resumes where it left off. |

It also handles skipped lines (jump within the window, or re-anchor past it),
ad-libs and stumbles (a non-matching word holds; a fuzzy match still counts),
and repeated phrases (nearest-ahead occurrence wins). It **never jumps backward
without strong evidence** — it holds rather than guess.

## Shape

| Module | What it does |
|---|---|
| `script` | Tokenises the script into words carrying their **visible-character offset** (every char but `'\n'` counts — the engine's own unit, so an offset drops onto the reading guide). |
| `lev` | Bounded Levenshtein + the word-similarity it powers (readers stumble; recognisers mishear). |
| `align` | `Aligner`: `observe` one word → an `Observation` (offset, matched, confidence, word index). A moving search window, cautious backward moves, and a global re-anchor for big skips. |

## Example

```rust
use freally_align::{Aligner, Script};

let mut follower = Aligner::new(Script::parse(&loaded_script));

// FT-35 feeds each recognised word and drives the scroller's overrideOffset:
for word in recogniser_hypothesis {
    let obs = follower.observe(&word);
    if follower.is_tracking() {
        scroller.set_override_offset(obs.offset);
    } else {
        scroller.hand_back_to_manual(); // confidence dropped — never fight the operator
    }
}
```

## Status

The alignment logic is complete and unit-tested against recorded-style
transcripts (exact reads, stumbles, ad-libs, skips, repeats, silence), with no
audio in the loop. FT-35 wires it to the scroller; FT-32 supplies the recognised
words. Word tokenisation is whitespace-based, so unspaced scripts (Japanese,
Chinese) would need segmentation before this is useful there — a known limit,
consistent with the autocomplete pipeline's treatment of those languages.
