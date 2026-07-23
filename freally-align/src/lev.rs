//! Bounded Levenshtein, and the word-similarity it powers.
//!
//! Recognisers mishear; a reader stumbles. So words are matched fuzzily, not for
//! equality. Distances are computed only up to a cap (words are short, and a
//! match beyond the cap is not a match), which keeps the common "these two words
//! are nothing alike" case cheap.

/// Levenshtein distance between `a` and `b`, computed only up to `max`. Returns
/// `None` the moment the distance is known to exceed `max`.
pub(crate) fn levenshtein_within(a: &[char], b: &[char], max: usize) -> Option<usize> {
    let (n, m) = (a.len(), b.len());
    if n.abs_diff(m) > max {
        return None;
    }
    let mut prev: Vec<usize> = (0..=m).collect();
    for i in 1..=n {
        let mut curr = Vec::with_capacity(m + 1);
        curr.push(i);
        let mut row_min = i;
        for j in 1..=m {
            let cost = usize::from(a[i - 1] != b[j - 1]);
            let v = (prev[j] + 1).min(curr[j - 1] + 1).min(prev[j - 1] + cost);
            curr.push(v);
            row_min = row_min.min(v);
        }
        // Every entry of the next row is ≥ this row's minimum, so once the whole
        // row is over the cap there is no way back under it.
        if row_min > max {
            return None;
        }
        prev = curr;
    }
    (prev[m] <= max).then_some(prev[m])
}

/// Similarity of two already-normalised words in `[0.0, 1.0]`: `1.0` identical,
/// falling with edit distance relative to the longer word, and `0.0` once they
/// are too far apart to be the same word (which also protects short words — "a"
/// and "the" are not a fuzzy match).
pub(crate) fn word_similarity(a: &str, b: &str) -> f32 {
    if a == b {
        return 1.0;
    }
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }
    let ca: Vec<char> = a.chars().collect();
    let cb: Vec<char> = b.chars().collect();
    let len = ca.len().max(cb.len());
    // Allow up to ~40% of the longer word to differ before calling it a mismatch.
    let max = (len * 2 / 5).max(1);
    match levenshtein_within(&ca, &cb, max) {
        Some(d) => 1.0 - (d as f32 / len as f32),
        None => 0.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lev(a: &str, b: &str, max: usize) -> Option<usize> {
        levenshtein_within(
            &a.chars().collect::<Vec<_>>(),
            &b.chars().collect::<Vec<_>>(),
            max,
        )
    }

    #[test]
    fn distance_basics() {
        assert_eq!(lev("kitten", "kitten", 3), Some(0));
        assert_eq!(lev("kitten", "sitten", 3), Some(1));
        assert_eq!(lev("kitten", "sitting", 3), Some(3));
    }

    #[test]
    fn cap_short_circuits() {
        // "abc" vs "xyz" is distance 3, above the cap of 2.
        assert_eq!(lev("abc", "xyz", 2), None);
        // A length gap alone beyond the cap is rejected immediately.
        assert_eq!(lev("a", "abcdef", 2), None);
    }

    #[test]
    fn similarity_ranks_matches_above_mismatches() {
        assert_eq!(word_similarity("world", "world"), 1.0);
        assert!(
            word_similarity("world", "wrld") > 0.6,
            "a stumble still matches"
        );
        assert_eq!(word_similarity("world", "banana"), 0.0);
        assert_eq!(
            word_similarity("a", "the"),
            0.0,
            "short words are not loose matches"
        );
    }
}
