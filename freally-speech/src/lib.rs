//! `freally-speech` — Track B's speech recogniser (FT-32).
//!
//! Where [`freally_align`](../freally_align/index.html) decides *where in a known
//! script* the reader is, this crate produces the raw material it works on: a
//! stream of recognised **word hypotheses with timings**. It is backed by
//! **Vosk** (Apache-2.0 code and Apache-2.0 English weights), driven in
//! **dynamic-grammar mode** over a sliding window of the upcoming script lines.
//!
//! Constraining the recogniser's vocabulary to the words the reader is *about to
//! say* is the single biggest accuracy lever available, and it is only possible
//! because the script is known in advance. That window builder ([`grammar_window`])
//! is pure, owned, model-free logic — the interesting part of this crate — and it
//! is fully unit-tested here.
//!
//! Vosk itself links a native library and needs a model on disk, so the
//! [`SpeechRecognizer`] implementation ([`VoskRecognizer`]) lives behind the
//! off-by-default `vosk` feature. Callers check [`capability`] and degrade
//! honestly when the engine or its model is absent — Linux without a
//! permissively-licensed model, or any build compiled without the feature,
//! reports voice-following as unavailable rather than pretending.
#![forbid(unsafe_code)]

mod grammar;

pub use grammar::grammar_window;

#[cfg(feature = "vosk")]
mod vosk_engine;
#[cfg(feature = "vosk")]
pub use vosk_engine::VoskRecognizer;

use std::path::Path;

/// One recognised word with its confidence and timing, in seconds from the start
/// of the utterance. The `text` is what feeds [`freally_align`]'s aligner.
#[derive(Clone, Debug, PartialEq)]
pub struct WordHypothesis {
    /// The recognised word (lowercase, as Vosk emits it).
    pub text: String,
    /// Confidence in `[0.0, 1.0]`.
    pub conf: f32,
    /// Start time, seconds from the utterance start.
    pub start: f32,
    /// End time, seconds from the utterance start.
    pub end: f32,
}

/// A completed recognition result: the joined text and the per-word breakdown.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Hypothesis {
    /// The full recognised text.
    pub text: String,
    /// The words, in order, with timings.
    pub words: Vec<WordHypothesis>,
}

/// What the recogniser can do in this build, on this machine — so a caller
/// degrades to manual scrolling instead of guessing.
#[derive(Clone, Debug, PartialEq)]
pub struct SpeechCapability {
    /// Whether recognition is actually usable right now.
    pub available: bool,
    /// The engine name (`"vosk"`, or `"none"` when not built in).
    pub engine: String,
    /// A human-readable reason, shown in-product when unavailable.
    pub detail: String,
}

/// Report whether script-following recognition is usable, given the configured
/// model path. Honest by construction: a build without the `vosk` feature, or
/// with no model on disk, reports unavailable.
pub fn capability(model_path: Option<&Path>) -> SpeechCapability {
    #[cfg(feature = "vosk")]
    {
        match model_path {
            Some(path) if path.exists() => SpeechCapability {
                available: true,
                engine: "vosk".into(),
                detail: "ready".into(),
            },
            Some(_) => SpeechCapability {
                available: false,
                engine: "vosk".into(),
                detail: "the speech model is not installed".into(),
            },
            None => SpeechCapability {
                available: false,
                engine: "vosk".into(),
                detail: "no speech model configured".into(),
            },
        }
    }
    #[cfg(not(feature = "vosk"))]
    {
        let _ = model_path;
        SpeechCapability {
            available: false,
            engine: "none".into(),
            detail: "voice-following is not available in this build".into(),
        }
    }
}

/// A script-following speech recogniser. Fed mono audio, constrained to the
/// current script window, it yields a [`Hypothesis`] when an utterance completes.
///
/// The only implementation today is the Vosk-backed [`VoskRecognizer`] (behind
/// the `vosk` feature); the trait is what lets FT-35 and the tests depend on the
/// contract rather than the engine.
pub trait SpeechRecognizer {
    /// Constrain recognition to `window` — the words the reader is about to say,
    /// from [`grammar_window`]. Passing an empty slice frees the grammar (full
    /// vocabulary). Should be called as the reader advances.
    fn set_grammar(&mut self, window: &[String]);

    /// Feed a block of mono samples at the model's sample rate. Returns a final
    /// [`Hypothesis`] when the block completed an utterance, otherwise `None`
    /// (still mid-utterance).
    fn accept(&mut self, samples: &[f32]) -> Option<Hypothesis>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capability_without_the_feature_is_honestly_unavailable() {
        // These tests run in the default (no-`vosk`) build, which must report
        // the feature off rather than claim a working engine.
        let cap = capability(None);
        assert!(!cap.available);
        assert_eq!(cap.engine, "none");
        assert!(!cap.detail.is_empty());
    }
}
