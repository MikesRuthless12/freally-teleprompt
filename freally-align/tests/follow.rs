//! End-to-end alignment over a realistic transcript, exercising the public API
//! the way FT-35 will: build a script, feed the words a reader actually said —
//! stumbles, an ad-lib, a repeated phrase, a skipped line — and check the
//! reading guide tracks them without ever bolting.

use freally_align::{Aligner, Script};

const SCRIPT: &str = "\
Good evening, and welcome to the show.
Tonight we have a story about a small town by the sea.
The people there worked hard and looked out for one another.
When the storm came, they did not run. They stayed, and they held on.
And that is why we remember them today.";

fn build() -> Aligner {
    Aligner::new(Script::parse(SCRIPT))
}

#[test]
fn a_natural_read_tracks_start_to_finish() {
    let mut a = build();
    // The reader delivers it with two stumbles ("welcom", "storm" said twice) and
    // one ad-lib ("uh"), the way a real take sounds.
    let transcript = [
        "good", "evening", "and", "welcom", "to", "the", "show", // "welcom" = stumble
        "tonight", "we", "have", "a", "story", "about", "a", "small", "town", "by", "the", "sea",
        "the", "people", "there", "worked", "hard", "and", "looked", "out", "for", "one",
        "another", "uh", // an ad-lib — must not move or derail anything
        "when", "the", "storm", "came", "they", "did", "not", "run", "they", "stayed", "and",
        "they", "held", "on", "and", "that", "is", "why", "we", "remember", "them", "today",
    ];

    let mut last = -1.0f64;
    let mut backward_moves = 0;
    for word in transcript {
        let obs = a.observe(word);
        if obs.offset < last {
            backward_moves += 1;
        }
        last = obs.offset;
    }

    assert!(a.is_tracking(), "should finish confidently tracking");
    assert_eq!(
        backward_moves, 0,
        "the guide never moved backward on a clean read"
    );
    // It reached the final words of the script.
    let total = Script::parse(SCRIPT).words.len();
    assert!(
        a.word_index().unwrap() >= total - 3,
        "ended at the last line"
    );
}

#[test]
fn skipping_a_line_is_recovered() {
    let mut a = build();
    // Read the first line, then jump past two whole lines to the storm line.
    a.observe_words(&["good", "evening", "and", "welcome", "to", "the", "show"]);
    let after_line_one = a.offset();

    for word in ["when", "the", "storm", "came", "they", "did", "not", "run"] {
        a.observe(word);
    }
    assert!(
        a.offset() > after_line_one,
        "the follower caught up to the skipped-to line"
    );
    assert!(a.is_tracking());
}

#[test]
fn a_wrong_word_never_teleports_to_a_far_match() {
    let mut a = build();
    a.observe_words(&["good", "evening", "and"]);
    let here = a.word_index();
    // "today" is the final word — hearing it once, far out of range, is a
    // misrecognition, not a cue to jump to the end.
    let obs = a.observe("today");
    assert!(!obs.matched);
    assert_eq!(a.word_index(), here);
}
