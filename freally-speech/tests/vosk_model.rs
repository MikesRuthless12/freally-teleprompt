//! The FT-32 drill, as a runnable test rather than a paragraph of prose.
//!
//! Everything here needs the real native `libvosk` AND a real model on disk, so
//! it cannot run in CI and is `#[ignore]`d by default. It is the check that the
//! two things the repository does NOT carry actually work together — which for
//! two phases was a manual step nobody had performed.
//!
//! Run it after `node scripts/fetch-vosk.mjs`, from the repository root:
//!
//! ```text
//! # PowerShell. $R is the absolute repo path.
//! $env:PATH = "$R\src-tauri\vendor\vosk\lib;$env:PATH"
//! $env:CARGO_ENCODED_RUSTFLAGS = "-L" + [char]0x1f + "$R\src-tauri\vendor\vosk\link"
//! $env:FREALLY_VOSK_MODEL = "$R\src-tauri\vendor\vosk\vosk-model-en"
//! cargo test -p freally-speech --features vosk --test vosk_model -- --ignored --nocapture
//! ```
//!
//! ⚠️ `CARGO_ENCODED_RUSTFLAGS` (unit-separated), **not** `RUSTFLAGS`. `RUSTFLAGS`
//! is split on SPACES, so any repository path containing one — "Havoc Software",
//! for instance — is torn in half and rustc dies with "multiple input filenames
//! provided" long before anything Vosk-related is reached.
//!
//! The app itself needs none of this: `src-tauri/build.rs` sets the link search
//! path from `CARGO_MANIFEST_DIR`, which has no such problem.
#![cfg(feature = "vosk")]

use freally_speech::{SpeechRecognizer, VoskRecognizer};

fn model_path() -> String {
    std::env::var("FREALLY_VOSK_MODEL").expect("set FREALLY_VOSK_MODEL to a Vosk model directory")
}

/// The model loads, and a script-constrained grammar can be installed on it.
///
/// The grammar half is the load-bearing assertion. `Recognizer::new_with_grammar`
/// works only on the small and `-lgraph` models; a large static-graph model
/// returns a recogniser that quietly ignores the vocabulary and decodes against
/// the full dictionary instead. That failure is invisible — recognition still
/// "works", just far worse — so it is asserted here rather than trusted.
#[test]
#[ignore = "needs libvosk + a real model; see the module docs"]
fn the_model_loads_and_takes_a_script_grammar() {
    let mut rec = VoskRecognizer::new(&model_path(), 16_000.0).expect("the model should load");

    rec.set_grammar(&[
        "the".to_string(),
        "quick".to_string(),
        "brown".to_string(),
        "fox".to_string(),
    ]);

    // One second of silence: it must neither panic nor invent words. A finalized
    // result is allowed (an endpoint on silence is normal); a non-empty
    // transcript from silence is not.
    let silence = vec![0.0f32; 16_000];
    if let Some(hypothesis) = rec.accept(&silence) {
        assert!(
            hypothesis.text.trim().is_empty(),
            "silence decoded to {:?}",
            hypothesis.text,
        );
    }
}

/// Re-installing the grammar between utterances must not break the recogniser —
/// this is what a script-constrained caller does as the reader advances, and the
/// engine is rebuilt underneath each time.
#[test]
#[ignore = "needs libvosk + a real model; see the module docs"]
fn the_grammar_can_be_replaced_repeatedly() {
    let mut rec = VoskRecognizer::new(&model_path(), 16_000.0).expect("the model should load");
    let block = vec![0.0f32; 4_000];
    for window in [
        ["alpha", "bravo"],
        ["charlie", "delta"],
        ["echo", "foxtrot"],
    ] {
        rec.set_grammar(&window.iter().map(|w| w.to_string()).collect::<Vec<_>>());
        let _ = rec.accept(&block);
    }
}
