//! A small, self-contained radix-2 Cooley–Tukey FFT.
//!
//! Written by hand rather than pulled from a crate so the whole feature stays
//! owned and dependency-free (the Track A charter). Sizes are powers of two; the
//! MFCC front-end zero-pads each frame to the next power of two before calling in.

use std::f32::consts::PI;

/// In-place complex FFT. `re` and `im` must be the same length and a power of two.
pub(crate) fn fft_in_place(re: &mut [f32], im: &mut [f32]) {
    let n = re.len();
    debug_assert_eq!(im.len(), n, "re and im must be the same length");
    debug_assert!(n.is_power_of_two(), "FFT length must be a power of two");
    if n <= 1 {
        return;
    }

    // Bit-reversal permutation.
    let mut j = 0usize;
    for i in 1..n {
        let mut bit = n >> 1;
        while j & bit != 0 {
            j ^= bit;
            bit >>= 1;
        }
        j |= bit;
        if i < j {
            re.swap(i, j);
            im.swap(i, j);
        }
    }

    // Butterflies. Twiddles are recomputed per k (n is small) so f32 rounding
    // does not accumulate along the stage the way an incremental rotor would.
    let mut len = 2;
    while len <= n {
        let half = len / 2;
        let mut base = 0;
        while base < n {
            for k in 0..half {
                let angle = -2.0 * PI * (k as f32) / (len as f32);
                let (wr, wi) = (angle.cos(), angle.sin());
                let a = base + k;
                let b = base + k + half;
                let vr = re[b] * wr - im[b] * wi;
                let vi = re[b] * wi + im[b] * wr;
                let (ur, ui) = (re[a], im[a]);
                re[a] = ur + vr;
                im[a] = ui + vi;
                re[b] = ur - vr;
                im[b] = ui - vi;
            }
            base += len;
        }
        len <<= 1;
    }
}

/// One-sided power spectrum (`|X[k]|²` for `k` in `0..=n_fft/2`) of a real frame.
///
/// The frame is copied into the first `frame.len().min(n_fft)` bins and the rest
/// is zero-padded, so a frame shorter than `n_fft` is handled without a caller-
/// side pad.
pub(crate) fn power_spectrum(frame: &[f32], n_fft: usize) -> Vec<f32> {
    let mut re = vec![0.0f32; n_fft];
    let mut im = vec![0.0f32; n_fft];
    for (dst, &s) in re.iter_mut().zip(frame.iter()) {
        *dst = s;
    }
    fft_in_place(&mut re, &mut im);
    (0..=n_fft / 2)
        .map(|k| re[k] * re[k] + im[k] * im[k])
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32::consts::TAU;

    /// Naive O(n²) DFT used only as an oracle in tests.
    fn naive_dft(re_in: &[f32]) -> Vec<(f32, f32)> {
        let n = re_in.len();
        (0..n)
            .map(|k| {
                let mut sr = 0.0f32;
                let mut si = 0.0f32;
                for (t, &x) in re_in.iter().enumerate() {
                    let ang = -TAU * (k as f32) * (t as f32) / (n as f32);
                    sr += x * ang.cos();
                    si += x * ang.sin();
                }
                (sr, si)
            })
            .collect()
    }

    #[test]
    fn matches_naive_dft() {
        // A deterministic non-trivial signal.
        let x: Vec<f32> = (0..64)
            .map(|i| {
                (TAU * 3.0 * i as f32 / 64.0).sin() + 0.5 * (TAU * 11.0 * i as f32 / 64.0).cos()
            })
            .collect();
        let oracle = naive_dft(&x);
        let mut re = x.clone();
        let mut im = vec![0.0f32; x.len()];
        fft_in_place(&mut re, &mut im);
        for k in 0..x.len() {
            assert!((re[k] - oracle[k].0).abs() < 1e-2, "re[{k}]");
            assert!((im[k] - oracle[k].1).abs() < 1e-2, "im[{k}]");
        }
    }

    #[test]
    fn impulse_is_flat() {
        // δ[n] → all magnitudes equal 1.
        let mut re = vec![0.0f32; 16];
        re[0] = 1.0;
        let mut im = vec![0.0f32; 16];
        fft_in_place(&mut re, &mut im);
        for k in 0..16 {
            let mag = (re[k] * re[k] + im[k] * im[k]).sqrt();
            assert!((mag - 1.0).abs() < 1e-4, "bin {k}");
        }
    }

    #[test]
    fn single_sinusoid_peaks_at_its_bin() {
        let n = 64;
        let bin = 5;
        let frame: Vec<f32> = (0..n)
            .map(|i| (TAU * bin as f32 * i as f32 / n as f32).sin())
            .collect();
        let power = power_spectrum(&frame, n);
        let peak = power
            .iter()
            .enumerate()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .unwrap()
            .0;
        assert_eq!(peak, bin);
    }

    #[test]
    fn power_spectrum_zero_pads_short_frames() {
        // 10 samples into a 16-point FFT must not panic and must be one-sided.
        let frame = vec![1.0f32; 10];
        let power = power_spectrum(&frame, 16);
        assert_eq!(power.len(), 16 / 2 + 1);
    }
}
