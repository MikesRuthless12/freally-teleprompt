//! Streaming utterance segmentation — the bridge from a live microphone to the
//! one-shot [`crate::VoiceModel::recognize`].
//!
//! A continuous capture stream is not a tidy recording: it arrives in arbitrary
//! block sizes and contains long stretches of silence. [`UtteranceSegmenter`]
//! consumes those blocks, watches the per-frame energy with an [`Endpointer`],
//! and emits one silence-bounded sample buffer per spoken utterance. The caller
//! then recognises each (always-listening) or enrols it (training). Recognition
//! re-trims the buffer itself, so the segmenter only has to be *generous* about
//! boundaries, never exact.

use crate::vad::{Endpointer, VadConfig};

/// Segments a continuous audio stream into utterances by energy endpointing.
#[derive(Clone, Debug)]
pub struct UtteranceSegmenter {
    frame_len: usize,
    hop_len: usize,
    endpointer: Endpointer,
    /// Unframed samples carried over between `push` calls.
    acc: Vec<f32>,
    /// The utterance currently being collected.
    utterance: Vec<f32>,
    /// A ring of the most recent samples, prepended when speech starts so the
    /// word's onset is not clipped.
    preroll: Vec<f32>,
    preroll_cap: usize,
    /// Safety cap so a stuck-open endpoint cannot grow an utterance without end.
    max_utterance: usize,
}

impl UtteranceSegmenter {
    /// * `vad` — supplies the framing (`frame_len` / `hop_len`).
    /// * `threshold` — absolute per-frame RMS above which a frame is speech.
    ///   The live path calibrates this from the ambient level; see
    ///   [`UtteranceSegmenter::with_default_threshold`] for a starting value.
    pub fn new(vad: &VadConfig, threshold: f32) -> Self {
        Self {
            frame_len: vad.frame_len.max(1),
            hop_len: vad.hop_len.max(1),
            endpointer: Endpointer::new(threshold, vad.hangover_frames, vad.min_speech_frames),
            acc: Vec::new(),
            utterance: Vec::new(),
            preroll: Vec::new(),
            preroll_cap: vad.hop_len * 8,
            // ~6 s at a 10 ms hop — a hard ceiling, not a normal boundary.
            max_utterance: vad.hop_len * 600,
        }
    }

    /// [`UtteranceSegmenter::new`] with a conservative default threshold; wants
    /// calibrating against the real microphone (a drill).
    pub fn with_default_threshold(vad: &VadConfig) -> Self {
        Self::new(vad, 0.02)
    }

    /// True while an utterance is being collected (i.e. the endpointer is in speech).
    pub fn is_collecting(&self) -> bool {
        self.endpointer.in_speech()
    }

    /// Feed a block of captured samples; returns every utterance that completed
    /// within it (usually none, occasionally one, rarely more).
    pub fn push(&mut self, samples: &[f32]) -> Vec<Vec<f32>> {
        use crate::vad::EndpointEvent::{SpeechEnd, SpeechStart};

        self.acc.extend_from_slice(samples);
        let mut done = Vec::new();

        while self.acc.len() >= self.frame_len {
            let rms = {
                let frame = &self.acc[..self.frame_len];
                (frame.iter().map(|x| x * x).sum::<f32>() / self.frame_len as f32).sqrt()
            };
            // `utterance`, `preroll` and `acc` are disjoint fields, so each sink
            // extends straight from the hop slice — no owned per-hop copy needed.
            let hop = ..self.hop_len;
            match self.endpointer.push(rms) {
                SpeechStart => {
                    self.utterance.clear();
                    self.utterance.extend_from_slice(&self.preroll);
                    self.utterance.extend_from_slice(&self.acc[hop]);
                }
                SpeechEnd => {
                    self.utterance.extend_from_slice(&self.acc[hop]);
                    done.push(std::mem::take(&mut self.utterance));
                }
                crate::vad::EndpointEvent::None if self.endpointer.in_speech() => {
                    self.utterance.extend_from_slice(&self.acc[hop]);
                    if self.utterance.len() > self.max_utterance {
                        self.endpointer.reset();
                        done.push(std::mem::take(&mut self.utterance));
                    }
                }
                crate::vad::EndpointEvent::None => {}
            }

            self.preroll.extend_from_slice(&self.acc[hop]);
            if self.preroll.len() > self.preroll_cap {
                let excess = self.preroll.len() - self.preroll_cap;
                self.preroll.drain(..excess);
            }
            self.acc.drain(hop);
        }

        done
    }

    /// Force-complete any utterance in progress — call when capture stops so a
    /// word cut off by the user is still returned. Returns the partial utterance
    /// if one was open.
    pub fn flush(&mut self) -> Option<Vec<f32>> {
        if self.endpointer.in_speech() && !self.utterance.is_empty() {
            self.endpointer.reset();
            Some(std::mem::take(&mut self.utterance))
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32::consts::TAU;

    const SR: u32 = 16_000;

    fn silence(ms: usize) -> Vec<f32> {
        vec![0.0; SR as usize * ms / 1000]
    }

    fn tone(ms: usize) -> Vec<f32> {
        let n = SR as usize * ms / 1000;
        (0..n)
            .map(|i| 0.6 * (TAU * 440.0 * i as f32 / SR as f32).sin())
            .collect()
    }

    #[test]
    fn emits_one_utterance_for_one_spoken_word() {
        let vad = VadConfig::new(SR);
        let mut seg = UtteranceSegmenter::new(&vad, 0.05);
        let mut clip = silence(300);
        clip.extend(tone(400));
        clip.extend(silence(300));

        // Feed it in irregular blocks, the way a capture callback would.
        let mut utterances = Vec::new();
        for block in clip.chunks(517) {
            utterances.extend(seg.push(block));
        }
        utterances.extend(seg.flush());

        assert_eq!(utterances.len(), 1, "exactly one utterance");
        let utt = &utterances[0];
        // It covers the spoken region (with margins) but not the whole clip.
        assert!(
            utt.len() > SR as usize * 300 / 1000,
            "shorter than the word"
        );
        assert!(utt.len() < clip.len(), "not the entire buffer");
    }

    #[test]
    fn pure_silence_emits_nothing() {
        let vad = VadConfig::new(SR);
        let mut seg = UtteranceSegmenter::new(&vad, 0.05);
        let mut out = Vec::new();
        for block in silence(1000).chunks(400) {
            out.extend(seg.push(block));
        }
        assert!(out.is_empty());
        assert!(seg.flush().is_none());
        assert!(!seg.is_collecting());
    }
}
