//! The dynamic-grammar window — the accuracy lever.
//!
//! A general-purpose recogniser has to weigh every word in its lexicon. But a
//! teleprompter knows the script, so it can tell the recogniser: *the next thing
//! this person says is almost certainly one of these few dozen words.* That
//! constraint is what turns a small offline model into something accurate enough
//! to follow a read. This module builds that word window from the script and the
//! reader's current position, and formats it as the Vosk dynamic grammar.

use std::collections::HashSet;

/// The words to constrain recognition to: the unique, normalised script words in
/// a window around `center` — a few behind (a re-read or stumble) and more ahead
/// (the reader advancing). `words` is the script tokenised in reading order.
///
/// Order is preserved (nearest-first is not required; Vosk treats the grammar as
/// a set), and duplicates are dropped so a repeated word does not bloat the
/// grammar. Punctuation-only tokens contribute nothing.
pub fn grammar_window(words: &[&str], center: usize, back: usize, ahead: usize) -> Vec<String> {
    if words.is_empty() {
        return Vec::new();
    }
    let lo = center.saturating_sub(back);
    let hi = (center + ahead).min(words.len() - 1);

    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for word in &words[lo..=hi] {
        let norm = normalize(word);
        if !norm.is_empty() && seen.insert(norm.clone()) {
            out.push(norm);
        }
    }
    out
}

/// Lowercase, keep alphanumerics, drop everything else — the form Vosk's English
/// lexicon uses, and the same normalisation `freally-align` applies to script
/// words, so the two agree on what a "word" is.
fn normalize(word: &str) -> String {
    let mut out = String::new();
    for ch in word.chars() {
        if ch.is_alphanumeric() {
            for lower in ch.to_lowercase() {
                out.push(lower);
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    const SCRIPT: &[&str] = &[
        "good", "evening", "and", "welcome", "to", "the", "show", "tonight", "we", "have", "a",
        "story",
    ];

    #[test]
    fn window_covers_behind_and_ahead_of_the_cursor() {
        let w = grammar_window(SCRIPT, 4, 2, 3); // around "to"
                                                 // 2 behind ("and","welcome") + "to" + 3 ahead ("the","show","tonight").
        assert_eq!(w, ["and", "welcome", "to", "the", "show", "tonight"]);
    }

    #[test]
    fn window_is_bounded_and_deduplicated() {
        // "the" and "a" both repeat in a longer script; a window must not list a
        // word twice, and must clamp at the ends.
        let words = &["the", "cat", "sat", "on", "the", "mat"];
        let w = grammar_window(words, 0, 5, 5); // whole thing, from the start
        assert_eq!(w, ["the", "cat", "sat", "on", "mat"]); // one "the"
    }

    #[test]
    fn punctuation_and_empty_are_ignored() {
        let words = &["Hello,", "world!", "--", "again"];
        let w = grammar_window(words, 0, 0, 3);
        assert_eq!(w, ["hello", "world", "again"]); // normalised, "--" dropped
    }

    #[test]
    fn empty_script_yields_an_empty_window() {
        assert!(grammar_window(&[], 0, 3, 3).is_empty());
    }
}
