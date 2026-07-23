//! Mel-frequency cepstral coefficients — the feature front-end.
//!
//! Standard pipeline: pre-emphasis → framing → Hamming window → power spectrum →
//! Mel filterbank → log → DCT-II. The output is a sequence of short cepstral
//! vectors, one per frame, which [`crate::dtw`] then aligns.

use crate::fft::power_spectrum;
use serde::{Deserialize, Serialize};
use std::f32::consts::{PI, TAU};

/// Front-end parameters. [`MfccConfig::new`] derives frame/hop from the sample
/// rate (25 ms / 10 ms, the usual speech settings); the rest are conventional.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct MfccConfig {
    /// Sample rate the features were (and must be) computed at, in Hz.
    pub sample_rate: u32,
    /// Analysis window length, in samples.
    pub frame_len: usize,
    /// Hop between successive frames, in samples.
    pub hop_len: usize,
    /// FFT length (a power of two ≥ `frame_len`).
    pub n_fft: usize,
    /// Number of Mel filterbank channels.
    pub n_mels: usize,
    /// Number of cepstral coefficients kept per frame.
    pub n_coeffs: usize,
    /// Lowest filterbank edge, in Hz.
    pub fmin: f32,
    /// Highest filterbank edge, in Hz (defaults to the Nyquist frequency).
    pub fmax: f32,
    /// Pre-emphasis coefficient (0 disables it).
    pub pre_emphasis: f32,
}

impl MfccConfig {
    /// Conventional speech settings for a given sample rate.
    pub fn new(sample_rate: u32) -> Self {
        let frame_len = (sample_rate as usize * 25) / 1000;
        let hop_len = (sample_rate as usize * 10) / 1000;
        Self {
            sample_rate,
            frame_len,
            hop_len,
            n_fft: frame_len.next_power_of_two(),
            n_mels: 26,
            n_coeffs: 13,
            fmin: 0.0,
            fmax: sample_rate as f32 / 2.0,
            pre_emphasis: 0.97,
        }
    }
}

impl Default for MfccConfig {
    fn default() -> Self {
        Self::new(16_000)
    }
}

fn hz_to_mel(hz: f32) -> f32 {
    2595.0 * (1.0 + hz / 700.0).log10()
}

fn mel_to_hz(mel: f32) -> f32 {
    700.0 * (10.0f32.powf(mel / 2595.0) - 1.0)
}

fn pre_emphasis(samples: &[f32], coeff: f32) -> Vec<f32> {
    if samples.is_empty() {
        return Vec::new();
    }
    let mut out = Vec::with_capacity(samples.len());
    out.push(samples[0]);
    for w in samples.windows(2) {
        out.push(w[1] - coeff * w[0]);
    }
    out
}

fn hamming(n: usize) -> Vec<f32> {
    if n <= 1 {
        return vec![1.0; n];
    }
    (0..n)
        .map(|i| 0.54 - 0.46 * (TAU * i as f32 / (n as f32 - 1.0)).cos())
        .collect()
}

/// Triangular Mel filterbank, shape `[n_mels][n_fft/2 + 1]`.
fn mel_filterbank(cfg: &MfccConfig) -> Vec<Vec<f32>> {
    let n_bins = cfg.n_fft / 2 + 1;
    let mel_min = hz_to_mel(cfg.fmin);
    let mel_max = hz_to_mel(cfg.fmax);
    // n_mels + 2 band edges in Mel, mapped back to fractional FFT bins.
    let edges: Vec<f32> = (0..cfg.n_mels + 2)
        .map(|i| {
            let mel = mel_min + (mel_max - mel_min) * i as f32 / (cfg.n_mels as f32 + 1.0);
            mel_to_hz(mel) * cfg.n_fft as f32 / cfg.sample_rate as f32
        })
        .collect();

    let mut filters = vec![vec![0.0f32; n_bins]; cfg.n_mels];
    for (m, filt) in filters.iter_mut().enumerate() {
        let (left, center, right) = (edges[m], edges[m + 1], edges[m + 2]);
        for (bin, weight) in filt.iter_mut().enumerate() {
            let k = bin as f32;
            if k >= left && k <= center && center > left {
                *weight = (k - left) / (center - left);
            } else if k > center && k <= right && right > center {
                *weight = (right - k) / (right - center);
            }
        }
    }
    filters
}

/// DCT-II of `input`, keeping the first `n_coeffs` coefficients.
fn dct2(input: &[f32], n_coeffs: usize) -> Vec<f32> {
    let m = input.len();
    (0..n_coeffs)
        .map(|k| {
            input
                .iter()
                .enumerate()
                .map(|(i, &v)| v * (PI * k as f32 * (i as f32 + 0.5) / m as f32).cos())
                .sum()
        })
        .collect()
}

/// Compute the MFCC frame sequence for `samples`.
///
/// Returns an empty vector when `samples` is shorter than one analysis frame.
/// Output length is `(samples.len() - frame_len) / hop_len + 1` frames, each of
/// `cfg.n_coeffs` coefficients.
pub fn mfcc(samples: &[f32], cfg: &MfccConfig) -> Vec<Vec<f32>> {
    if samples.len() < cfg.frame_len || cfg.frame_len == 0 {
        return Vec::new();
    }
    let emphasized = pre_emphasis(samples, cfg.pre_emphasis);
    let window = hamming(cfg.frame_len);
    let filters = mel_filterbank(cfg);
    let n_frames = (emphasized.len() - cfg.frame_len) / cfg.hop_len + 1;

    let mut frame_buf = vec![0.0f32; cfg.frame_len];
    let mut out = Vec::with_capacity(n_frames);
    for f in 0..n_frames {
        let start = f * cfg.hop_len;
        for (dst, (&w, &s)) in frame_buf
            .iter_mut()
            .zip(window.iter().zip(&emphasized[start..start + cfg.frame_len]))
        {
            *dst = s * w;
        }
        let power = power_spectrum(&frame_buf, cfg.n_fft);
        let log_mel: Vec<f32> = filters
            .iter()
            .map(|filt| {
                let energy: f32 = filt.iter().zip(power.iter()).map(|(w, p)| w * p).sum();
                energy.max(1e-10).ln()
            })
            .collect();
        out.push(dct2(&log_mel, cfg.n_coeffs));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tone(freqs: &[f32], sample_rate: u32, dur_s: f32) -> Vec<f32> {
        let n = (sample_rate as f32 * dur_s) as usize;
        (0..n)
            .map(|i| {
                let t = i as f32 / sample_rate as f32;
                freqs.iter().map(|f| (TAU * f * t).sin()).sum::<f32>() / freqs.len() as f32
            })
            .collect()
    }

    #[test]
    fn frame_count_matches_formula() {
        let cfg = MfccConfig::new(16_000);
        let samples = tone(&[440.0], 16_000, 0.5);
        let frames = mfcc(&samples, &cfg);
        let expected = (samples.len() - cfg.frame_len) / cfg.hop_len + 1;
        assert_eq!(frames.len(), expected);
        assert!(frames.iter().all(|f| f.len() == cfg.n_coeffs));
    }

    #[test]
    fn short_input_yields_no_frames() {
        let cfg = MfccConfig::new(16_000);
        assert!(mfcc(&[0.0; 10], &cfg).is_empty());
    }

    #[test]
    fn is_deterministic() {
        let cfg = MfccConfig::new(16_000);
        let samples = tone(&[300.0, 900.0], 16_000, 0.3);
        assert_eq!(mfcc(&samples, &cfg), mfcc(&samples, &cfg));
    }

    #[test]
    fn silence_is_finite() {
        // The log floor must keep all-zero input off -inf/NaN.
        let cfg = MfccConfig::new(16_000);
        let frames = mfcc(&vec![0.0f32; 8_000], &cfg);
        assert!(!frames.is_empty());
        assert!(frames.iter().flatten().all(|c| c.is_finite()));
    }

    #[test]
    fn distinct_tones_differ() {
        let cfg = MfccConfig::new(16_000);
        let a = mfcc(&tone(&[300.0], 16_000, 0.3), &cfg);
        let b = mfcc(&tone(&[1500.0], 16_000, 0.3), &cfg);
        // Compare the mean cepstrum; two well-separated tones must not coincide.
        let mean = |frames: &[Vec<f32>]| {
            let mut m = vec![0.0f32; cfg.n_coeffs];
            for fr in frames {
                for (acc, &c) in m.iter_mut().zip(fr) {
                    *acc += c / frames.len() as f32;
                }
            }
            m
        };
        let (ma, mb) = (mean(&a), mean(&b));
        let dist: f32 = ma
            .iter()
            .zip(&mb)
            .map(|(x, y)| (x - y) * (x - y))
            .sum::<f32>()
            .sqrt();
        assert!(
            dist > 1.0,
            "distinct tones should have distinct cepstra (got {dist})"
        );
    }
}
