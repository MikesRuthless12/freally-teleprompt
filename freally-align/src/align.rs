//! The stateful aligner — the differentiator itself.

use crate::lev::word_similarity;
use crate::script::{normalize_word, Script, ScriptWord};

/// Confidence attributed to a re-anchor, which requires several consecutive words
/// to agree and so is trusted highly.
const REANCHOR_CONFIDENCE: f32 = 0.85;

/// Tunables. The defaults are conservative — biased toward holding position over
/// guessing, which is what the FT-34 research says users actually want.
#[derive(Clone, Debug)]
pub struct AlignConfig {
    /// Words behind the cursor the local search considers (a stumble re-reading).
    pub window_back: usize,
    /// Words ahead of the cursor the local search considers. This is also the cap
    /// on how far one word may move the position — a line or two, never a page.
    pub window_ahead: usize,
    /// Minimum word similarity (0..1) to count as a match at all.
    pub match_threshold: f32,
    /// The higher bar a match must clear to move the cursor *backward*.
    pub backward_threshold: f32,
    /// Consecutive non-matching words before a global re-anchor is attempted.
    pub lost_after_misses: usize,
    /// Consecutive words that must agree for a re-anchor to fire (guards against
    /// a single common word teleporting the position).
    pub reanchor_min_matches: usize,
    /// Confidence below which the follower should hand back to manual scrolling.
    pub tracking_floor: f32,
    /// How much each consecutive miss erodes confidence.
    pub miss_penalty: f32,
    /// How many recent words to keep for re-anchoring.
    pub recent_len: usize,
}

impl Default for AlignConfig {
    fn default() -> Self {
        Self {
            window_back: 6,
            window_ahead: 15,
            match_threshold: 0.6,
            backward_threshold: 0.82,
            lost_after_misses: 5,
            reanchor_min_matches: 3,
            tracking_floor: 0.35,
            miss_penalty: 0.12,
            recent_len: 8,
        }
    }
}

/// The result of feeding one recognised word.
#[derive(Clone, Debug, PartialEq)]
pub struct Observation {
    /// The visible-character offset for the scroller's reading guide.
    pub offset: f64,
    /// Whether this word confirmed or advanced the position (vs. was held).
    pub matched: bool,
    /// Tracking confidence in `[0.0, 1.0]`; drives the degrade-to-manual decision.
    pub confidence: f32,
    /// The script word index the reader is judged to be at, once anchored.
    pub word_index: Option<usize>,
}

/// Follows a reader through a known script, one recognised word at a time.
pub struct Aligner {
    words: Vec<ScriptWord>,
    cfg: AlignConfig,
    cursor: usize,
    started: bool,
    misses: usize,
    last_similarity: f32,
    recent: Vec<String>,
}

impl Aligner {
    /// A follower for `script` with the default configuration.
    pub fn new(script: Script) -> Self {
        Self::with_config(script, AlignConfig::default())
    }

    /// A follower for `script` with a custom configuration.
    pub fn with_config(script: Script, cfg: AlignConfig) -> Self {
        Self {
            words: script.words,
            cfg,
            cursor: 0,
            started: false,
            misses: 0,
            last_similarity: 0.0,
            recent: Vec::new(),
        }
    }

    /// The current reading-guide offset (0 until the first word anchors).
    pub fn offset(&self) -> f64 {
        if !self.started || self.words.is_empty() {
            0.0
        } else {
            self.words[self.cursor.min(self.words.len() - 1)].vis_offset as f64
        }
    }

    /// Current tracking confidence in `[0.0, 1.0]`.
    pub fn confidence(&self) -> f32 {
        if !self.started {
            0.0
        } else {
            (self.last_similarity - self.misses as f32 * self.cfg.miss_penalty).max(0.0)
        }
    }

    /// Whether the follower is confident enough to keep driving the scroll. When
    /// this is false, the caller degrades to manual scrolling (FT-35).
    pub fn is_tracking(&self) -> bool {
        self.started && self.confidence() >= self.cfg.tracking_floor
    }

    /// The script word index the reader is at, once anchored.
    pub fn word_index(&self) -> Option<usize> {
        self.started.then_some(self.cursor)
    }

    /// Forget all progress and wait to re-anchor from the top.
    pub fn reset(&mut self) {
        self.cursor = 0;
        self.started = false;
        self.misses = 0;
        self.last_similarity = 0.0;
        self.recent.clear();
    }

    /// Feed a whole hypothesis (several words); returns the final observation.
    pub fn observe_words<S: AsRef<str>>(&mut self, words: &[S]) -> Observation {
        let mut last = self.hold();
        for word in words {
            last = self.observe(word.as_ref());
        }
        last
    }

    /// Feed one recognised word.
    pub fn observe(&mut self, word: &str) -> Observation {
        if self.words.is_empty() {
            return self.hold();
        }
        let norm = normalize_word(word);
        // A punctuation-only or empty token carries no evidence either way — do
        // not let it count as a miss and erode confidence.
        if norm.is_empty() {
            return self.hold();
        }

        // Search before recording the word, so it can be moved into the recent
        // buffer rather than cloned.
        let candidate = self.best_in_window(&norm);
        self.recent.push(norm);
        if self.recent.len() > self.cfg.recent_len {
            self.recent.remove(0);
        }

        if let Some((idx, sim)) = candidate {
            if self.accepts(idx, sim) {
                return self.confirm(idx, sim);
            }
        }

        // Nothing acceptable nearby. Count the miss, and — if we have been lost
        // for a while — try to re-anchor globally on the recent run of words.
        self.misses += 1;
        if self.started && self.misses >= self.cfg.lost_after_misses {
            if let Some(idx) = self.reanchor() {
                self.recent.clear();
                return self.confirm(idx, REANCHOR_CONFIDENCE);
            }
        }
        self.hold()
    }

    /// The inclusive `[lo, hi]` word range the local search covers.
    fn window(&self) -> (usize, usize) {
        let last = self.words.len() - 1;
        if !self.started {
            // Nothing anchored yet: search the whole script and let the position
            // penalty prefer the earliest strong match (readers start at the top).
            (0, last)
        } else {
            let lo = self.cursor.saturating_sub(self.cfg.window_back);
            let hi = (self.cursor + self.cfg.window_ahead).min(last);
            (lo, hi)
        }
    }

    /// The best-scoring word in the window at or above the match threshold. The
    /// score rewards similarity and gently prefers positions at or just ahead of
    /// the cursor, so normal reading advances by one and a repeated phrase takes
    /// its nearest-ahead occurrence.
    fn best_in_window(&self, norm: &str) -> Option<(usize, f32)> {
        let (lo, hi) = self.window();
        let mut best: Option<(usize, f32, f32)> = None; // (index, similarity, score)
        for (k, word) in self.words[lo..=hi].iter().enumerate() {
            let i = lo + k;
            let sim = word_similarity(norm, &word.text);
            if sim < self.cfg.match_threshold {
                continue;
            }
            let delta = i as isize - self.cursor as isize;
            let penalty = if delta >= 0 {
                delta as f32 * 0.03
            } else {
                (-delta) as f32 * 0.15
            };
            let score = sim - penalty;
            if best.map_or(true, |(_, _, best_score)| score > best_score) {
                best = Some((i, sim, score));
            }
        }
        best.map(|(i, sim, _)| (i, sim))
    }

    /// Whether a match at `idx` may move the cursor. Forward moves within the
    /// window are fine; backward moves need strong evidence, because the usual
    /// cause of a backward match is a repeated word, not a re-read.
    fn accepts(&self, idx: usize, sim: f32) -> bool {
        if !self.started {
            return true;
        }
        if idx >= self.cursor {
            true
        } else {
            sim >= self.cfg.backward_threshold
        }
    }

    /// Search the ENTIRE script for the longest run of recent words that agree,
    /// ending at some word. Returns that end index if the run is long enough to
    /// trust — the mechanism that recovers from a skipped paragraph without a
    /// single common word ever being enough to jump on.
    fn reanchor(&self) -> Option<usize> {
        if self.recent.len() < self.cfg.reanchor_min_matches {
            return None;
        }
        let r = self.recent.len();
        let mut best_end: Option<usize> = None;
        let mut best_matches = self.cfg.reanchor_min_matches - 1;
        for end in 0..self.words.len() {
            let mut matches = 0usize;
            let mut wi = end as isize;
            for k in (0..r).rev() {
                if wi < 0 {
                    break;
                }
                if word_similarity(&self.recent[k], &self.words[wi as usize].text)
                    >= self.cfg.match_threshold
                {
                    matches += 1;
                    wi -= 1;
                } else {
                    break;
                }
            }
            if matches > best_matches {
                best_matches = matches;
                best_end = Some(end);
            }
        }
        best_end
    }

    fn confirm(&mut self, idx: usize, sim: f32) -> Observation {
        self.cursor = idx;
        self.started = true;
        self.misses = 0;
        self.last_similarity = sim.clamp(0.0, 1.0);
        Observation {
            offset: self.offset(),
            matched: true,
            confidence: self.confidence(),
            word_index: Some(idx),
        }
    }

    fn hold(&self) -> Observation {
        Observation {
            offset: self.offset(),
            matched: false,
            confidence: self.confidence(),
            word_index: self.word_index(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SCRIPT: &str = "The quick brown fox jumps over the lazy dog. \
         Now is the time for all good people to come to the aid of the party.";

    fn aligner() -> Aligner {
        Aligner::new(Script::parse(SCRIPT))
    }

    /// The script words in reading order, for driving an "exact reading".
    fn script_words() -> Vec<String> {
        Script::parse(SCRIPT)
            .words
            .into_iter()
            .map(|w| w.text)
            .collect()
    }

    #[test]
    fn exact_reading_advances_monotonically() {
        let mut a = aligner();
        let mut last = -1.0f64;
        for word in script_words() {
            let obs = a.observe(&word);
            assert!(obs.matched, "'{word}' should match");
            assert!(obs.offset >= last, "offset went backward at '{word}'");
            last = obs.offset;
        }
        assert!(a.is_tracking());
        // It ended near the end of the script.
        assert_eq!(a.word_index(), Some(script_words().len() - 1));
    }

    #[test]
    fn punctuation_is_not_a_stop() {
        // "dog." then "Now" straddles a full stop; reading flows across it.
        let mut a = aligner();
        for word in [
            "the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog",
        ] {
            assert!(a.observe(word).matched);
        }
        let obs = a.observe("now");
        assert!(obs.matched, "the word after a full stop still advances");
    }

    #[test]
    fn an_adlib_holds_position() {
        let mut a = aligner();
        a.observe_words(&["the", "quick", "brown"]);
        let held_at = a.offset();
        // A word the reader improvised, not in the script nearby.
        let obs = a.observe("umm");
        assert!(!obs.matched);
        assert_eq!(obs.offset, held_at, "an ad-lib must not move the guide");
        // Reading resumes cleanly.
        assert!(a.observe("fox").matched);
    }

    #[test]
    fn a_stumble_still_matches() {
        let mut a = aligner();
        a.observe_words(&["the", "quick"]);
        // "browm" for "brown" — one letter off.
        assert!(
            a.observe("browm").matched,
            "a near-miss should still advance"
        );
    }

    #[test]
    fn a_lone_distant_word_does_not_jump() {
        // "party" is the very last word; from the top it is far outside the
        // window, so hearing it once must NOT teleport there.
        let mut a = aligner();
        a.observe_words(&["the", "quick", "brown"]);
        let before = a.word_index();
        let obs = a.observe("party");
        assert!(!obs.matched);
        assert_eq!(
            a.word_index(),
            before,
            "one far word is misrecognition, not a jump"
        );
    }

    #[test]
    fn a_skipped_section_re_anchors_on_agreement() {
        // A tiny window so the skip is genuinely out of local range, forcing the
        // global re-anchor path.
        let cfg = AlignConfig {
            window_ahead: 3,
            lost_after_misses: 3,
            reanchor_min_matches: 3,
            ..Default::default()
        };
        let mut a = Aligner::with_config(Script::parse(SCRIPT), cfg);
        a.observe_words(&["the", "quick", "brown"]);
        let start = a.offset();

        // The reader jumps well ahead and reads a run from late in the script.
        for word in ["good", "people", "to", "come"] {
            a.observe(word);
        }
        assert!(
            a.offset() > start,
            "a consistent run of later words re-anchors forward"
        );
        assert!(a.is_tracking());
    }

    #[test]
    fn survives_silence() {
        let mut a = aligner();
        a.observe_words(&["the", "quick", "brown", "fox"]);
        let at = a.offset();
        let conf = a.confidence();
        // Silence = no observations at all. State is unchanged.
        assert_eq!(a.offset(), at);
        assert_eq!(a.confidence(), conf);
        // Reading resumes from where it stopped.
        assert!(a.observe("jumps").matched);
    }

    #[test]
    fn does_not_jump_backward_on_a_repeated_word() {
        // "the" occurs many times. After reading well past the first ones, hearing
        // "the" again must not drag the cursor back to an earlier occurrence.
        let mut a = aligner();
        a.observe_words(&[
            "the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog", "now", "is",
        ]);
        let idx_before = a.word_index().unwrap();
        a.observe("the"); // the next "the" is ahead, not behind
        assert!(
            a.word_index().unwrap() >= idx_before,
            "must not fall back to an earlier 'the'"
        );
    }

    #[test]
    fn confidence_falls_with_misses_and_degrades_to_manual() {
        let cfg = AlignConfig {
            lost_after_misses: 99,
            ..Default::default()
        }; // disable re-anchor here
        let mut a = Aligner::with_config(Script::parse(SCRIPT), cfg);
        a.observe_words(&["the", "quick", "brown"]);
        assert!(a.is_tracking());
        // A long run of ad-libs erodes confidence until it hands back to manual.
        for _ in 0..8 {
            a.observe("blah");
        }
        assert!(
            !a.is_tracking(),
            "sustained non-matches should degrade to manual"
        );
    }

    #[test]
    fn empty_script_never_matches() {
        let mut a = Aligner::new(Script::parse("   "));
        let obs = a.observe("anything");
        assert!(!obs.matched);
        assert_eq!(obs.offset, 0.0);
    }
}
