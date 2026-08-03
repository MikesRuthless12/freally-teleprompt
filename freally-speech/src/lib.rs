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

/// Is `dir` a model the recogniser can actually start on?
///
/// The DIRECTORY existing is not the question, and answering that one shipped a
/// bug: an empty `vosk-model-en` directory — which the user-data escape hatch
/// makes it easy to create, half a copy makes it easy to leave behind, and
/// which `capability` then reported as ready — put a record button on screen
/// that failed the moment it was pressed.
///
/// `am/final.mdl` is the acoustic model: the one file the recogniser cannot
/// start without, and the same file `scripts/fetch-vosk.mjs` checks a download
/// against. It is a cheap stat, and it is the difference between an honest
/// answer and a button that lies.
///
/// Compiled in BOTH builds, like `model_path_for_ffi` in the app, so its test
/// runs in the default gate — this is filesystem logic and needs no engine.
///
/// **Public because the caller has to ask the same question.** The app CHOOSES
/// a model directory (a user-supplied one, else the bundled one) and then asks
/// `capability` about it; if the choosing used a weaker test than the checking,
/// an unusable directory wins the choice and the answer is "unavailable" while
/// a working model sits unused one branch away. One predicate, both sites.
pub fn model_is_installed(dir: &Path) -> bool {
    dir.join("am").join("final.mdl").is_file()
}

/// Report whether script-following recognition is usable, given the configured
/// model path. Honest by construction: a build without the `vosk` feature, or
/// with no usable model on disk, reports unavailable.
pub fn capability(model_path: Option<&Path>) -> SpeechCapability {
    #[cfg(feature = "vosk")]
    {
        match model_path {
            Some(path) if model_is_installed(path) => SpeechCapability {
                available: true,
                engine: "vosk".into(),
                detail: "ready".into(),
            },
            Some(_) => SpeechCapability {
                available: false,
                engine: "vosk".into(),
                detail: "the speech model is not installed, or is incomplete".into(),
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

    /// With no model, the answer must be "unavailable" in BOTH builds — but the
    /// engine NAME differs, and this asserted `"none"` unconditionally while
    /// claiming in a comment to run only in the default build. Nothing had ever
    /// compiled this crate with `--features vosk`, so the claim was never
    /// tested; the first `cargo test --features vosk` turned it red.
    #[test]
    fn capability_without_a_model_is_honestly_unavailable() {
        let cap = capability(None);
        assert!(!cap.available);
        assert!(!cap.detail.is_empty());
        assert_eq!(
            cap.engine,
            if cfg!(feature = "vosk") {
                "vosk"
            } else {
                "none"
            },
        );
    }

    /// A directory of the right NAME is not a model.
    ///
    /// This is the check `capability` used to make, and an empty
    /// `vosk-model-en` therefore offered a record button that could only fail
    /// when pressed. Written against the real filesystem because the bug was
    /// about the real filesystem.
    #[test]
    fn an_empty_model_directory_is_not_an_installed_model() {
        let dir = std::env::temp_dir().join(format!(
            "freally-speech-model-{}-{:?}",
            std::process::id(),
            std::thread::current().id()
        ));
        // Cleared FIRST, not merely at the end. The name is only a pid and a
        // thread id — the OS reuses both — and the cleanup at the bottom is
        // skipped by any panic in between, so one failing run could leave
        // `am/final.mdl` behind and make the very first assertion below fail on
        // a later, innocent build. A test that can be wedged by its own earlier
        // failure is worse than no test.
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("am")).expect("a temp directory");

        // The directory exists, and `am/` with it — the shape a half-finished
        // copy leaves behind.
        assert!(!model_is_installed(&dir));

        std::fs::write(dir.join("am").join("final.mdl"), b"not a real model").expect("a temp file");
        assert!(model_is_installed(&dir));

        // A file where the directory should be is not a model either.
        assert!(!model_is_installed(&dir.join("am").join("final.mdl")));

        std::fs::remove_dir_all(&dir).expect("the temp directory is ours to remove");
    }
}
