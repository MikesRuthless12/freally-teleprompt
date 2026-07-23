//! Tokenising the known script into matchable words with visible-character offsets.
//!
//! The offset a word carries is in the teleprompter engine's own unit: a
//! **visible-character index** where every character but `'\n'` counts (the same
//! model as `caesura.ts`/`teleprompter.rs` and the per-character `data-ch` spans),
//! so an offset from here drops straight onto the scroller's reading guide.

/// One matchable word of the script.
#[derive(Clone, Debug, PartialEq)]
pub struct ScriptWord {
    /// Normalised for matching: lowercased, with punctuation removed.
    pub text: String,
    /// Visible-character index of the word's first character.
    pub vis_offset: usize,
}

/// The known script, tokenised into matchable words.
#[derive(Clone, Debug)]
pub struct Script {
    /// The words, in reading order. Punctuation-only tokens (e.g. a bare `--`
    /// caesura) are dropped, though their characters still count toward offsets.
    pub words: Vec<ScriptWord>,
    /// Total visible characters — the scroll's end position.
    pub total_vis: usize,
}

impl Script {
    /// Tokenise `text`. Words split on whitespace; each is normalised the same
    /// way [`normalize_word`] normalises a recognised word, so the two sides
    /// compare on equal terms.
    pub fn parse(text: &str) -> Self {
        let mut words = Vec::new();
        let mut vis = 0usize;
        let mut current = String::new();
        let mut start = 0usize;
        let mut in_word = false;

        for ch in text.chars() {
            if ch.is_whitespace() {
                if in_word {
                    if !current.is_empty() {
                        words.push(ScriptWord {
                            text: std::mem::take(&mut current),
                            vis_offset: start,
                        });
                    }
                    current.clear();
                    in_word = false;
                }
            } else {
                if !in_word {
                    in_word = true;
                    start = vis;
                    current.clear();
                }
                normalize_into(ch, &mut current);
            }
            if ch != '\n' {
                vis += 1;
            }
        }
        if in_word && !current.is_empty() {
            words.push(ScriptWord {
                text: current,
                vis_offset: start,
            });
        }

        Script {
            words,
            total_vis: vis,
        }
    }
}

/// Normalise a recognised word to the same form the script words use.
pub(crate) fn normalize_word(word: &str) -> String {
    let mut out = String::new();
    for ch in word.chars() {
        normalize_into(ch, &mut out);
    }
    out
}

/// Append `ch`'s contribution to a normalised word: alphanumerics lowercased,
/// everything else (punctuation, dashes, symbols) dropped.
fn normalize_into(ch: char, out: &mut String) {
    if ch.is_alphanumeric() {
        for lower in ch.to_lowercase() {
            out.push(lower);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn words_carry_their_visible_offset() {
        // "Hello, world" — the comma and space are visible characters and count.
        let script = Script::parse("Hello, world");
        assert_eq!(script.words.len(), 2);
        assert_eq!(
            script.words[0],
            ScriptWord {
                text: "hello".into(),
                vis_offset: 0
            }
        );
        assert_eq!(
            script.words[1],
            ScriptWord {
                text: "world".into(),
                vis_offset: 7
            }
        );
        assert_eq!(script.total_vis, 12);
    }

    #[test]
    fn newlines_do_not_count_but_split_words() {
        let script = Script::parse("one two\nthree");
        assert_eq!(
            script
                .words
                .iter()
                .map(|w| w.text.as_str())
                .collect::<Vec<_>>(),
            ["one", "two", "three"]
        );
        // "three" starts right after "one two\n": o n e _ t w o = 7 visible chars,
        // the newline does not count, so "three" is at visible offset 7.
        assert_eq!(script.words[2].vis_offset, 7);
        assert_eq!(script.total_vis, 12);
    }

    #[test]
    fn caesura_and_punctuation_tokens_are_dropped_but_counted() {
        // The bare " -- " caesura is not a word, but its characters still advance
        // the visible offset, so the word after it lands at the right place.
        let script = Script::parse("go -- now");
        assert_eq!(
            script
                .words
                .iter()
                .map(|w| w.text.as_str())
                .collect::<Vec<_>>(),
            ["go", "now"]
        );
        assert_eq!(script.words[1].vis_offset, 6); // g o _ - - _ = 6
    }

    #[test]
    fn normalises_recognised_words_the_same_way() {
        assert_eq!(normalize_word("World!"), "world");
        assert_eq!(normalize_word("don't"), "dont");
        assert_eq!(normalize_word("--"), "");
    }
}
