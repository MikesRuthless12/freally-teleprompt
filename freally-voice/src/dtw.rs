//! Dynamic Time Warping between two MFCC frame sequences.
//!
//! DTW is dynamic programming over a per-frame distance: it finds the cheapest
//! monotonic alignment of two sequences that may run at different speeds — which
//! is exactly what separates "the same phrase, said a little faster" from "a
//! different phrase". Nothing here is trained; it is a shortest-path over a cost
//! matrix.

/// Euclidean distance between two equal-length frames.
fn frame_dist(a: &[f32], b: &[f32]) -> f32 {
    debug_assert_eq!(a.len(), b.len(), "frames must have the same dimensionality");
    a.iter()
        .zip(b)
        .map(|(x, y)| (x - y) * (x - y))
        .sum::<f32>()
        .sqrt()
}

/// Length-normalised DTW distance with a default Sakoe–Chiba band.
///
/// The band both bounds the cost and enforces that a good match stays near the
/// time diagonal — a distant "match" is evidence of *mis*-recognition, not of a
/// legitimate jump, which is the property [`crate::VoiceModel::recognize`] leans
/// on. Returns [`f32::INFINITY`] if either sequence is empty.
pub fn dtw_distance(a: &[Vec<f32>], b: &[Vec<f32>]) -> f32 {
    let band = (a.len().max(b.len()) / 10 + 1).max(8);
    dtw_distance_banded(a, b, band)
}

/// [`dtw_distance`] with an explicit band radius (in frames, around the diagonal).
pub fn dtw_distance_banded(a: &[Vec<f32>], b: &[Vec<f32>], band: usize) -> f32 {
    let (n, m) = (a.len(), b.len());
    if n == 0 || m == 0 {
        return f32::INFINITY;
    }

    // Two rolling rows of the accumulated-cost matrix. Row 0 is the base case:
    // D[0][0] = 0, everything else on the border is unreachable (∞).
    let mut prev = vec![f32::INFINITY; m + 1];
    let mut curr = vec![f32::INFINITY; m + 1];
    prev[0] = 0.0;

    for i in 1..=n {
        for v in curr.iter_mut() {
            *v = f32::INFINITY;
        }
        // Centre the band on the diagonal scaled by the length ratio, so a clip
        // that is globally faster/slower still tracks it.
        let center = i * m / n;
        let lo = center.saturating_sub(band).max(1);
        let hi = (center + band).min(m);
        for j in lo..=hi {
            let cost = frame_dist(&a[i - 1], &b[j - 1]);
            let best = prev[j].min(curr[j - 1]).min(prev[j - 1]);
            curr[j] = cost + best;
        }
        std::mem::swap(&mut prev, &mut curr);
    }

    prev[m] / (n + m) as f32
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seq(vals: &[f32]) -> Vec<Vec<f32>> {
        vals.iter().map(|&v| vec![v, v * 0.5]).collect()
    }

    #[test]
    fn identical_sequences_are_zero() {
        let a = seq(&[1.0, 2.0, 3.0, 4.0, 5.0]);
        assert!(dtw_distance(&a, &a) < 1e-6);
    }

    #[test]
    fn time_stretch_is_cheaper_than_a_different_signal() {
        let a = seq(&[1.0, 2.0, 3.0, 4.0, 5.0]);
        // Each frame duplicated: same phrase, said at half speed.
        let stretched: Vec<Vec<f32>> = a.iter().flat_map(|f| [f.clone(), f.clone()]).collect();
        let different = seq(&[5.0, 1.0, 5.0, 1.0, 5.0]);
        let d_stretch = dtw_distance(&a, &stretched);
        let d_diff = dtw_distance(&a, &different);
        assert!(
            d_stretch < d_diff,
            "stretch {d_stretch} should beat different {d_diff}"
        );
    }

    #[test]
    fn is_symmetric_for_equal_lengths() {
        let a = seq(&[1.0, 3.0, 2.0, 4.0]);
        let b = seq(&[1.0, 2.0, 2.0, 5.0]);
        assert!((dtw_distance(&a, &b) - dtw_distance(&b, &a)).abs() < 1e-6);
    }

    #[test]
    fn empty_is_infinite() {
        let a = seq(&[1.0, 2.0]);
        assert!(dtw_distance(&a, &[]).is_infinite());
        assert!(dtw_distance(&[], &a).is_infinite());
    }
}
