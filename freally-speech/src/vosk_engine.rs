//! The Vosk-backed [`SpeechRecognizer`] — behind the `vosk` feature.
//!
//! ⚠️ **This module links the native `libvosk` library and needs a model on
//! disk.** It compiles only with the `vosk` feature, which the default build and
//! the entire workspace test suite exclude, so it is **verified by the
//! voice-following human drill** (see `Live-To-Do-List.md`), not by CI. The call
//! shapes here are written against the `vosk` 0.3 crate's actual source; the
//! drill confirms they link and run against a real libvosk + model. The host app
//! turns the feature on once the model ships (FT-33).

use crate::{Hypothesis, SpeechRecognizer, WordHypothesis};
use vosk::{CompleteResult, DecodingState, Model, Recognizer};

/// A Vosk recogniser constrained to the current script window.
pub struct VoskRecognizer {
    // Declared before `model` on purpose: the recogniser holds a raw pointer into
    // the model, so it must be dropped first. Struct fields drop in declaration
    // order.
    recognizer: Recognizer,
    model: Model,
    sample_rate: f32,
    // Reused i16 conversion buffer, so `accept` allocates nothing per block.
    pcm: Vec<i16>,
}

impl VoskRecognizer {
    /// Load `model_path` and open a recogniser at `sample_rate` (the model's
    /// native rate, typically 16 kHz). Returns an error if the model is missing
    /// or the recogniser cannot be created.
    pub fn new(model_path: &str, sample_rate: f32) -> Result<Self, String> {
        let model = Model::new(model_path)
            .ok_or_else(|| format!("could not load the Vosk model at {model_path}"))?;
        let mut recognizer = Recognizer::new(&model, sample_rate)
            .ok_or_else(|| "could not create the Vosk recogniser".to_string())?;
        recognizer.set_words(true); // per-word timings, which the aligner uses
        Ok(Self {
            recognizer,
            model,
            sample_rate,
            pcm: Vec::new(),
        })
    }
}

impl SpeechRecognizer for VoskRecognizer {
    fn set_grammar(&mut self, window: &[String]) {
        // vosk 0.3 exposes no live grammar swap, so a change rebuilds the
        // recogniser. That is safe between utterances, which is when the window
        // advances; the caller (FT-35) updates it at word boundaries. `[unk]`
        // lets an off-script word be reported as unknown rather than force-fit.
        let mut grammar: Vec<&str> = window.iter().map(String::as_str).collect();
        grammar.push("[unk]");
        if let Some(mut next) =
            Recognizer::new_with_grammar(&self.model, self.sample_rate, &grammar)
        {
            next.set_words(true);
            self.recognizer = next;
        }
        // If the rebuild fails, keep the current recogniser rather than go deaf.
    }

    fn accept(&mut self, samples: &[f32]) -> Option<Hypothesis> {
        // Vosk consumes i16 PCM; the capture pipeline works in f32 [-1, 1]. Reuse
        // the scratch buffer so a live read allocates nothing per block.
        self.pcm.clear();
        self.pcm.extend(
            samples
                .iter()
                .map(|s| (s.clamp(-1.0, 1.0) * 32767.0) as i16),
        );
        match self.recognizer.accept_waveform(&self.pcm) {
            Ok(DecodingState::Finalized) => Some(to_hypothesis(self.recognizer.result())),
            _ => None, // still mid-utterance, or a dropped frame — hold
        }
    }
}

/// Copy a Vosk result (whose strings borrow the recogniser's internal buffer)
/// into an owned [`Hypothesis`].
fn to_hypothesis(result: CompleteResult<'_>) -> Hypothesis {
    match result.single() {
        Some(single) => Hypothesis {
            text: single.text.to_string(),
            words: single
                .result
                .into_iter()
                .map(|w| WordHypothesis {
                    text: w.word.to_string(),
                    conf: w.conf,
                    start: w.start,
                    end: w.end,
                })
                .collect(),
        },
        None => Hypothesis::default(),
    }
}
