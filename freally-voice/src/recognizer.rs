//! The trainable recogniser: enrol the user's commands, then match utterances.
//!
//! A [`VoiceModel`] holds one or more [`Template`]s per command (the user records
//! each phrase a few times). [`VoiceModel::recognize`] extracts features from a
//! new utterance and returns the closest command by DTW — but only if the match
//! clears a confidence floor *and* is clearly better than the runner-up. A
//! prompter must never guess a transport command, so an uncertain result is an
//! explicit [`Recognition::NotRecognised`].

use crate::dtw::dtw_distance;
use crate::mfcc::{mfcc, MfccConfig};
use crate::vad::{speech_bounds, VadConfig};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// One enrolled recording: the command it belongs to and its MFCC features.
///
/// Only features are stored — never the audio — so a persisted [`VoiceModel`]
/// can never leak a microphone recording to disk.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Template {
    /// The command this recording trains (e.g. `"play"`).
    pub command_id: String,
    /// MFCC frames of the (silence-trimmed) recording.
    pub features: Vec<Vec<f32>>,
}

/// The outcome of [`VoiceModel::recognize`].
#[derive(Clone, Debug, PartialEq)]
pub enum Recognition {
    /// A command matched with the given confidence in `[0, 1]`.
    Match {
        /// The recognised command id.
        command_id: String,
        /// Confidence in `[0, 1]`; higher is a closer match.
        confidence: f32,
    },
    /// No command matched confidently enough — hold, do not guess.
    NotRecognised,
}

/// Why enrolment was rejected.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum EnrollError {
    /// The recording held too little speech to train on.
    TooShort,
}

impl std::fmt::Display for EnrollError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EnrollError::TooShort => {
                write!(f, "recording too short to enrol (no speech detected, or below the minimum length)")
            }
        }
    }
}

impl std::error::Error for EnrollError {}

/// A speaker-dependent, model-free voice-command recogniser.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct VoiceModel {
    /// MFCC front-end settings (fixes the sample rate features are compared at).
    pub mfcc: MfccConfig,
    /// Silence-trimming settings.
    pub vad: VadConfig,
    /// Enrolled recordings, any number per command.
    pub templates: Vec<Template>,
    /// Minimum confidence to accept a match.
    pub confidence_floor: f32,
    /// The best distance must be ≤ `margin_ratio × runner-up distance` to accept;
    /// otherwise the two commands are too close to tell apart. `1.0` disables it.
    pub margin_ratio: f32,
    /// Maps DTW distance to confidence via `exp(-distance / distance_scale)`.
    pub distance_scale: f32,
    /// Minimum MFCC frames for a clip to be enrolled or recognised.
    pub min_frames: usize,
}

impl VoiceModel {
    /// A model with conventional defaults for `sample_rate`.
    ///
    /// The confidence floor and distance scale are starting points; they want
    /// calibrating against real recordings once live capture exists (FT-31).
    pub fn new(sample_rate: u32) -> Self {
        Self {
            mfcc: MfccConfig::new(sample_rate),
            vad: VadConfig::new(sample_rate),
            templates: Vec::new(),
            confidence_floor: 0.4,
            margin_ratio: 0.85,
            distance_scale: 8.0,
            min_frames: 5,
        }
    }

    /// The distinct command ids, in first-enrolled order.
    pub fn command_ids(&self) -> Vec<String> {
        let mut ids: Vec<String> = Vec::new();
        for t in &self.templates {
            if !ids.iter().any(|id| id == &t.command_id) {
                ids.push(t.command_id.clone());
            }
        }
        ids
    }

    /// Trimmed MFCC features for a raw sample buffer. Falls back to the whole
    /// buffer when the VAD finds no clear speech region to trim to.
    fn features(&self, samples: &[f32]) -> Vec<Vec<f32>> {
        let region = speech_bounds(samples, &self.vad).map_or(samples, |(s, e)| &samples[s..e]);
        mfcc(region, &self.mfcc)
    }

    /// Enrol one recording of `command_id`. Returns the number of feature frames
    /// stored, or [`EnrollError::TooShort`] if the recording held too little.
    pub fn enroll(
        &mut self,
        command_id: impl Into<String>,
        samples: &[f32],
    ) -> Result<usize, EnrollError> {
        let features = self.features(samples);
        if features.len() < self.min_frames {
            return Err(EnrollError::TooShort);
        }
        let n = features.len();
        self.templates.push(Template {
            command_id: command_id.into(),
            features,
        });
        Ok(n)
    }

    /// Recognise an utterance against the enrolled commands.
    pub fn recognize(&self, samples: &[f32]) -> Recognition {
        if self.templates.is_empty() {
            return Recognition::NotRecognised;
        }
        let query = self.features(samples);
        if query.len() < self.min_frames {
            return Recognition::NotRecognised;
        }

        // Best (smallest) DTW distance achieved per command.
        let mut best_per_command: HashMap<&str, f32> = HashMap::new();
        for t in &self.templates {
            let d = dtw_distance(&query, &t.features);
            let slot = best_per_command
                .entry(t.command_id.as_str())
                .or_insert(f32::INFINITY);
            if d < *slot {
                *slot = d;
            }
        }

        // Winner and runner-up across commands.
        let mut best_id = "";
        let mut best = f32::INFINITY;
        let mut runner_up = f32::INFINITY;
        for (&id, &d) in &best_per_command {
            if d < best {
                runner_up = best;
                best = d;
                best_id = id;
            } else if d < runner_up {
                runner_up = d;
            }
        }
        if !best.is_finite() {
            return Recognition::NotRecognised;
        }

        let confidence = (-best / self.distance_scale).exp().clamp(0.0, 1.0);
        if confidence < self.confidence_floor {
            return Recognition::NotRecognised;
        }
        // Ambiguous when the winner is not clearly closer than the runner-up.
        if runner_up.is_finite() && best > runner_up * self.margin_ratio {
            return Recognition::NotRecognised;
        }

        Recognition::Match {
            command_id: best_id.to_string(),
            confidence,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_model_recognises_nothing() {
        let model = VoiceModel::new(16_000);
        assert_eq!(
            model.recognize(&vec![0.1f32; 16_000]),
            Recognition::NotRecognised
        );
    }

    #[test]
    fn too_short_enrolment_is_rejected() {
        let mut model = VoiceModel::new(16_000);
        assert_eq!(
            model.enroll("play", &[0.0; 100]),
            Err(EnrollError::TooShort)
        );
    }

    #[test]
    fn command_ids_are_unique_and_ordered() {
        let mut model = VoiceModel::new(16_000);
        // Enrol with pre-built templates so the test does not depend on audio.
        for id in ["play", "play", "stop", "play", "stop"] {
            model.templates.push(Template {
                command_id: id.to_string(),
                features: vec![vec![0.0; 13]; 10],
            });
        }
        assert_eq!(
            model.command_ids(),
            vec!["play".to_string(), "stop".to_string()]
        );
    }

    #[test]
    fn model_round_trips_through_json() {
        let mut model = VoiceModel::new(16_000);
        model.templates.push(Template {
            command_id: "play".to_string(),
            features: vec![vec![1.0, 2.0, 3.0], vec![4.0, 5.0, 6.0]],
        });
        let json = serde_json::to_string(&model).unwrap();
        // The serialised form carries features, never audio.
        assert!(json.contains("\"features\""));
        let restored: VoiceModel = serde_json::from_str(&json).unwrap();
        assert_eq!(model, restored);
    }
}
