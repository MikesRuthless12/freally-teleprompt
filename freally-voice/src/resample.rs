//! A tiny streaming linear resampler.
//!
//! Microphones capture at whatever rate the device prefers (commonly 44.1 or
//! 48 kHz); the recogniser works at one canonical rate ([`crate::CANONICAL_SAMPLE_RATE`])
//! so a model trained on one machine is not silently mismatched to another with a
//! different default device. This converts a live capture stream to that rate
//! block by block, carrying one sample of history across the boundary so the
//! interpolation is seamless.

/// Streaming linear resampler from `in_rate` to `out_rate`.
#[derive(Clone, Debug)]
pub struct Resampler {
    /// Input samples advanced per output sample (`in_rate / out_rate`).
    step: f64,
    /// Next read position, in input samples relative to the current block's start.
    pos: f64,
    /// Last input sample of all prior blocks — history at virtual index −1.
    prev: f32,
    started: bool,
    identity: bool,
}

impl Resampler {
    /// A resampler from `in_rate` to `out_rate`. Equal rates make it a passthrough.
    pub fn new(in_rate: u32, out_rate: u32) -> Self {
        let (in_rate, out_rate) = (in_rate.max(1), out_rate.max(1));
        Self {
            step: in_rate as f64 / out_rate as f64,
            pos: 0.0,
            prev: 0.0,
            started: false,
            identity: in_rate == out_rate,
        }
    }

    /// True when input and output rates match and `process` just copies.
    pub fn is_identity(&self) -> bool {
        self.identity
    }

    /// Resample one block, continuing seamlessly from the previous call.
    pub fn process(&mut self, input: &[f32]) -> Vec<f32> {
        if self.identity {
            return input.to_vec();
        }
        if input.is_empty() {
            return Vec::new();
        }
        if !self.started {
            self.prev = input[0];
            self.started = true;
        }

        let n = input.len() as f64;
        // Output length is about input.len() / step; size once instead of growing.
        let mut out = Vec::with_capacity((n / self.step) as usize + 1);
        // Virtual buffer: index −1 is `prev`, index i≥0 is `input[i]`. `pos` is
        // kept in [−1, n−1); the loop stops before the last input sample so the
        // interpolation partner always exists.
        while self.pos < n - 1.0 {
            let i0 = self.pos.floor();
            let frac = (self.pos - i0) as f32;
            let s0 = if i0 < 0.0 {
                self.prev
            } else {
                input[i0 as usize]
            };
            let s1 = input[(i0 + 1.0) as usize];
            out.push(s0 * (1.0 - frac) + s1 * frac);
            self.pos += self.step;
        }
        // Re-base the position onto the next block and carry the boundary sample.
        self.pos -= n;
        self.prev = input[input.len() - 1];
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_passes_through() {
        let mut r = Resampler::new(16_000, 16_000);
        assert!(r.is_identity());
        assert_eq!(r.process(&[1.0, 2.0, 3.0]), vec![1.0, 2.0, 3.0]);
    }

    #[test]
    fn halving_the_rate_halves_the_length() {
        // 32k → 16k, step 2.0: expect roughly every other sample of a ramp.
        let mut r = Resampler::new(32_000, 16_000);
        let ramp: Vec<f32> = (0..100).map(|i| i as f32).collect();
        let out = r.process(&ramp);
        assert!((out.len() as i64 - 50).abs() <= 1, "len {}", out.len());
        assert_eq!(out[0], 0.0);
        assert_eq!(out[1], 2.0);
        assert_eq!(out[2], 4.0);
    }

    #[test]
    fn doubling_the_rate_doubles_the_length() {
        let mut r = Resampler::new(16_000, 32_000);
        let ramp: Vec<f32> = (0..50).map(|i| i as f32).collect();
        let out = r.process(&ramp);
        assert!((out.len() as i64 - 100).abs() <= 2, "len {}", out.len());
        // Linear interpolation puts a half-step between whole samples.
        assert_eq!(out[0], 0.0);
        assert!((out[1] - 0.5).abs() < 1e-4);
        assert_eq!(out[2], 1.0);
    }

    #[test]
    fn streaming_matches_one_shot() {
        // The same input, split into blocks, must resample to the same result.
        let ramp: Vec<f32> = (0..200).map(|i| (i as f32 * 0.1).sin()).collect();
        let mut whole = Resampler::new(48_000, 16_000);
        let expected = whole.process(&ramp);

        let mut streamed = Resampler::new(48_000, 16_000);
        let mut got = Vec::new();
        for block in ramp.chunks(37) {
            got.extend(streamed.process(block));
        }
        assert_eq!(got.len(), expected.len());
        for (a, b) in got.iter().zip(&expected) {
            assert!((a - b).abs() < 1e-5, "{a} vs {b}");
        }
    }
}
