//! Voice activity detection and endpointing.
//!
//! Two complementary tools:
//! * [`speech_bounds`] trims a finished recording down to the spoken region —
//!   used by enrolment and by batch recognition so leading/trailing silence
//!   never skews the MFCC/DTW comparison.
//! * [`Endpointer`] is the streaming counterpart the live capture loop (FT-31)
//!   feeds frame energies to, emitting speech start/end events.

use serde::{Deserialize, Serialize};

/// Energy-VAD parameters. [`VadConfig::new`] derives frame/hop from the sample
/// rate to match [`crate::MfccConfig`].
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct VadConfig {
    /// Energy window length, in samples.
    pub frame_len: usize,
    /// Hop between energy windows, in samples.
    pub hop_len: usize,
    /// Speech threshold as a fraction of the loudest frame in the clip.
    pub rel_threshold: f32,
    /// Absolute RMS floor, so a clip of pure quiet is never "all speech".
    pub abs_floor: f32,
    /// Frames of silence kept on each side of the detected speech (a margin).
    pub hangover_frames: usize,
    /// Minimum run of speech frames for a clip to count as containing speech.
    pub min_speech_frames: usize,
}

impl VadConfig {
    /// Defaults matched to [`crate::MfccConfig::new`] for the same sample rate.
    pub fn new(sample_rate: u32) -> Self {
        Self {
            frame_len: (sample_rate as usize * 25) / 1000,
            hop_len: (sample_rate as usize * 10) / 1000,
            rel_threshold: 0.1,
            abs_floor: 1e-4,
            hangover_frames: 8,
            min_speech_frames: 3,
        }
    }
}

impl Default for VadConfig {
    fn default() -> Self {
        Self::new(16_000)
    }
}

/// Per-frame root-mean-square energy over the same framing MFCC uses.
pub fn frame_rms(samples: &[f32], frame_len: usize, hop_len: usize) -> Vec<f32> {
    if frame_len == 0 || hop_len == 0 || samples.len() < frame_len {
        return Vec::new();
    }
    let n = (samples.len() - frame_len) / hop_len + 1;
    (0..n)
        .map(|f| {
            let start = f * hop_len;
            let sum_sq: f32 = samples[start..start + frame_len]
                .iter()
                .map(|x| x * x)
                .sum();
            (sum_sq / frame_len as f32).sqrt()
        })
        .collect()
}

/// The `[start, end)` sample range of the spoken region, or `None` if the clip
/// holds no speech above threshold.
pub fn speech_bounds(samples: &[f32], cfg: &VadConfig) -> Option<(usize, usize)> {
    let rms = frame_rms(samples, cfg.frame_len, cfg.hop_len);
    if rms.is_empty() {
        return None;
    }
    let peak = rms.iter().copied().fold(0.0f32, f32::max);
    let threshold = (peak * cfg.rel_threshold).max(cfg.abs_floor);

    let first = rms.iter().position(|&e| e >= threshold)?;
    let last = rms.iter().rposition(|&e| e >= threshold)?;
    if last + 1 - first < cfg.min_speech_frames {
        return None;
    }

    let start_frame = first.saturating_sub(cfg.hangover_frames);
    let end_frame = (last + cfg.hangover_frames).min(rms.len() - 1);
    let start = start_frame * cfg.hop_len;
    let end = (end_frame * cfg.hop_len + cfg.frame_len).min(samples.len());
    Some((start, end))
}

/// What [`Endpointer::push`] reports for the frame just fed in.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EndpointEvent {
    /// No boundary crossed on this frame.
    None,
    /// Speech just began (a run of loud frames reached the minimum).
    SpeechStart,
    /// Speech just ended (trailing silence reached the hangover).
    SpeechEnd,
}

/// A streaming endpoint detector for the live capture loop.
///
/// Feed it per-frame energies; it reports when speech starts and ends. Unlike
/// [`speech_bounds`] it has no global peak to normalise against, so it takes an
/// absolute threshold the caller calibrates from the ambient level.
#[derive(Clone, Debug)]
pub struct Endpointer {
    threshold: f32,
    hangover_frames: usize,
    min_speech_frames: usize,
    in_speech: bool,
    silence_run: usize,
    speech_run: usize,
}

impl Endpointer {
    /// * `threshold` — absolute per-frame energy above which a frame is speech.
    /// * `hangover_frames` — trailing silence tolerated before declaring the end.
    /// * `min_speech_frames` — consecutive loud frames required to declare a start.
    pub fn new(threshold: f32, hangover_frames: usize, min_speech_frames: usize) -> Self {
        Self {
            threshold,
            hangover_frames,
            min_speech_frames,
            in_speech: false,
            silence_run: 0,
            speech_run: 0,
        }
    }

    /// True once a start has fired and before the matching end.
    pub fn in_speech(&self) -> bool {
        self.in_speech
    }

    /// Return to the initial silent, not-in-speech state — used when a caller
    /// force-completes an over-long utterance and must not then see a stray
    /// `SpeechEnd` for the segment it already took.
    pub fn reset(&mut self) {
        self.in_speech = false;
        self.silence_run = 0;
        self.speech_run = 0;
    }

    /// Feed one frame's energy; get the boundary event, if any.
    pub fn push(&mut self, energy: f32) -> EndpointEvent {
        if energy >= self.threshold {
            self.silence_run = 0;
            if !self.in_speech {
                self.speech_run += 1;
                if self.speech_run >= self.min_speech_frames.max(1) {
                    self.in_speech = true;
                    return EndpointEvent::SpeechStart;
                }
            }
        } else {
            self.speech_run = 0;
            if self.in_speech {
                self.silence_run += 1;
                if self.silence_run >= self.hangover_frames.max(1) {
                    self.in_speech = false;
                    self.silence_run = 0;
                    return EndpointEvent::SpeechEnd;
                }
            }
        }
        EndpointEvent::None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// silence, then a loud block, then silence — as one buffer.
    fn silence_speech_silence(sr: u32) -> Vec<f32> {
        let quiet = sr as usize / 5; // 200 ms
        let loud = sr as usize / 2; // 500 ms
        let mut v = vec![0.0f32; quiet];
        v.extend((0..loud).map(|i| {
            use std::f32::consts::TAU;
            0.8 * (TAU * 440.0 * i as f32 / sr as f32).sin()
        }));
        v.extend(vec![0.0f32; quiet]);
        v
    }

    #[test]
    fn trims_to_the_spoken_region() {
        let sr = 16_000;
        let cfg = VadConfig::new(sr);
        let buf = silence_speech_silence(sr);
        let (start, end) = speech_bounds(&buf, &cfg).expect("speech present");
        let quiet = sr as usize / 5;
        let loud = sr as usize / 2;
        // Bounds land near the loud block, not at the buffer edges. The hangover
        // widens them, so allow a generous window either side.
        let slack = cfg.hop_len * (cfg.hangover_frames + 5);
        assert!(
            start < quiet && start + slack > quiet,
            "start {start} vs {quiet}"
        );
        assert!(end > quiet + loud - slack && end <= buf.len(), "end {end}");
    }

    #[test]
    fn pure_silence_has_no_speech() {
        let cfg = VadConfig::new(16_000);
        assert_eq!(speech_bounds(&vec![0.0f32; 16_000], &cfg), None);
    }

    #[test]
    fn frame_rms_is_zero_for_silence_and_positive_for_a_tone() {
        assert!(frame_rms(&[0.0; 800], 400, 160).iter().all(|&e| e == 0.0));
        let tone: Vec<f32> = (0..800).map(|i| (i as f32 * 0.2).sin()).collect();
        assert!(frame_rms(&tone, 400, 160).iter().all(|&e| e > 0.0));
    }

    #[test]
    fn endpointer_reports_start_then_end() {
        let mut ep = Endpointer::new(0.1, 3, 2);
        let mut events = Vec::new();
        // 4 quiet, 6 loud, 5 quiet.
        for e in [0.0, 0.0, 0.0, 0.0] {
            events.push(ep.push(e));
        }
        for e in [1.0, 1.0, 1.0, 1.0, 1.0, 1.0] {
            events.push(ep.push(e));
        }
        for e in [0.0, 0.0, 0.0, 0.0, 0.0] {
            events.push(ep.push(e));
        }
        assert_eq!(
            events
                .iter()
                .filter(|&&e| e == EndpointEvent::SpeechStart)
                .count(),
            1
        );
        assert_eq!(
            events
                .iter()
                .filter(|&&e| e == EndpointEvent::SpeechEnd)
                .count(),
            1
        );
        // Start must precede end.
        let start = events
            .iter()
            .position(|&e| e == EndpointEvent::SpeechStart)
            .unwrap();
        let end = events
            .iter()
            .position(|&e| e == EndpointEvent::SpeechEnd)
            .unwrap();
        assert!(start < end);
        assert!(!ep.in_speech());
    }
}
