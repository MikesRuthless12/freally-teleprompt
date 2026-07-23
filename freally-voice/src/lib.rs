//! `freally-voice` — model-free, speaker-dependent voice-command recognition.
//!
//! Track A of Freally Teleprompt's Phase 3 (FT-30). The pipeline is deliberately
//! and entirely classical DSP:
//!
//! ```text
//! mic → VAD/endpointing → MFCC frames → DTW vs. user templates → command + confidence
//! ```
//!
//! **Nothing is trained in the statistical sense.** There is no model, no
//! weights, no inference runtime, and no network. The user records each command
//! phrase a few times ([`VoiceModel::enroll`]); recognition ([`VoiceModel::recognize`])
//! compares a new utterance against those recordings with Dynamic Time Warping
//! over MFCC features. Because it is speaker-dependent it needs no third-party
//! acoustic model and carries no third-party data licence.
//!
//! A prompter must never *guess* a transport command, so recognition returns an
//! explicit [`Recognition::NotRecognised`] whenever the best match is too weak
//! (a confidence floor) or too ambiguous (a margin over the runner-up).
//!
//! The microphone itself is abstracted behind [`AudioSource`]; the host app
//! supplies the real (cpal) implementation (FT-31), which keeps this crate free
//! of platform audio dependencies and re-usable across the Havoc suite (FT-36).
#![forbid(unsafe_code)]

mod capture;
mod dtw;
mod fft;
mod mfcc;
mod recognizer;
mod resample;
mod stream;
mod vad;

/// The one sample rate the recogniser works at. Live capture is resampled to
/// this so a model trained on one machine is not mismatched to another whose
/// default input device prefers a different rate.
pub const CANONICAL_SAMPLE_RATE: u32 = 16_000;

#[cfg(feature = "capture-cpal")]
pub use capture::CpalSource;
pub use capture::{AudioSource, SliceSource};
pub use dtw::{dtw_distance, dtw_distance_banded};
pub use mfcc::{mfcc, MfccConfig};
pub use recognizer::{EnrollError, Recognition, Template, VoiceModel};
pub use resample::Resampler;
pub use stream::UtteranceSegmenter;
pub use vad::{frame_rms, speech_bounds, EndpointEvent, Endpointer, VadConfig};
