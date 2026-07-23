//! End-to-end recognition over the public API, driven by deterministic synthetic
//! audio (no microphone, no randomness beyond a fixed-seed LCG). Two clearly
//! distinct "commands" are enrolled a few times each; a fresh variation of one
//! must be recognised as that command, while noise must be refused.

use freally_voice::{Recognition, VoiceModel};
use std::f32::consts::TAU;

const SR: u32 = 16_000;

/// A tiny deterministic PRNG so "noise" and "jitter" never vary between runs.
struct Lcg(u64);
impl Lcg {
    fn next_unit(&mut self) -> f32 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        ((self.0 >> 40) as f32 / (1u64 << 24) as f32) * 2.0 - 1.0
    }
}

/// Sum-of-sinusoids "vowel" for a command's formant set.
fn tone(freqs: &[f32], dur_s: f32) -> Vec<f32> {
    let n = (SR as f32 * dur_s) as usize;
    (0..n)
        .map(|i| {
            let t = i as f32 / SR as f32;
            freqs.iter().map(|f| (TAU * f * t).sin()).sum::<f32>() / freqs.len() as f32
        })
        .collect()
}

/// Linearly resample by `factor` (>1 slows the clip down) — a time warp.
fn resample(x: &[f32], factor: f32) -> Vec<f32> {
    let n = (x.len() as f32 * factor) as usize;
    (0..n)
        .map(|i| {
            let src = i as f32 / factor;
            let j = src as usize;
            let frac = src - j as f32;
            if j + 1 < x.len() {
                x[j] * (1.0 - frac) + x[j + 1] * frac
            } else {
                x[x.len() - 1]
            }
        })
        .collect()
}

/// A full utterance: 100 ms silence, the (warped, jittered) body, 100 ms silence.
fn clip(freqs: &[f32], seed: u64, stretch: f32) -> Vec<f32> {
    let mut lcg = Lcg(seed);
    let body = resample(&tone(freqs, 0.4), stretch);
    let pad = SR as usize / 10;
    let mut v = vec![0.0f32; pad];
    v.extend(body.iter().map(|&s| s * 0.9 + lcg.next_unit() * 0.02));
    v.extend(vec![0.0f32; pad]);
    v
}

const PLAY: &[f32] = &[350.0, 700.0, 1400.0];
const STOP: &[f32] = &[520.0, 1150.0, 2100.0];

fn trained_model() -> VoiceModel {
    let mut model = VoiceModel::new(SR);
    // Record each command three times, with small deterministic variations.
    for (seed, stretch) in [(1, 1.0), (2, 1.08), (3, 0.94)] {
        model
            .enroll("play", &clip(PLAY, seed, stretch))
            .expect("enrol play");
        model
            .enroll("stop", &clip(STOP, seed + 100, stretch))
            .expect("enrol stop");
    }
    model
}

#[test]
fn recognises_each_trained_command() {
    let model = trained_model();

    match model.recognize(&clip(PLAY, 42, 1.03)) {
        Recognition::Match {
            command_id,
            confidence,
        } => {
            assert_eq!(command_id, "play");
            assert!(
                confidence >= model.confidence_floor,
                "confidence {confidence}"
            );
        }
        other => panic!("expected a play match, got {other:?}"),
    }

    match model.recognize(&clip(STOP, 77, 0.97)) {
        Recognition::Match { command_id, .. } => assert_eq!(command_id, "stop"),
        other => panic!("expected a stop match, got {other:?}"),
    }
}

#[test]
fn refuses_noise() {
    let model = trained_model();
    let mut lcg = Lcg(999);
    let noise: Vec<f32> = (0..SR as usize).map(|_| lcg.next_unit() * 0.5).collect();
    assert_eq!(model.recognize(&noise), Recognition::NotRecognised);
}

#[test]
fn refuses_an_unrelated_tone() {
    let model = trained_model();
    // A formant set unlike either trained command.
    let unrelated = clip(&[800.0, 2500.0, 3800.0], 5, 1.0);
    assert_eq!(model.recognize(&unrelated), Recognition::NotRecognised);
}

#[test]
fn a_closer_recording_scores_at_least_as_high() {
    let model = trained_model();
    let near = match model.recognize(&clip(PLAY, 11, 1.0)) {
        Recognition::Match { confidence, .. } => confidence,
        other => panic!("expected a match, got {other:?}"),
    };
    // A heavily warped rendition is a worse match, so no higher in confidence.
    if let Recognition::Match { confidence, .. } = model.recognize(&clip(PLAY, 11, 1.25)) {
        assert!(
            near >= confidence - 1e-3,
            "near {near} vs warped {confidence}"
        );
    }
}
