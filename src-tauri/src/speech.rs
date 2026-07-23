//! Voice-following (FT-32 / FT-33 / FT-35) — Track B's app wiring.
//!
//! Recognises the script's own words with `freally-speech` (Vosk), aligns them to
//! a reading position with `freally-align`, and emits that position for the
//! scroller to follow. The recogniser links a native library and needs a model,
//! so the whole recognition loop is behind the `vosk` feature; without it (the
//! default build and CI) the app reports voice-following **unavailable** and the
//! loop does not exist.
//!
//! It is **opt-in** — off until the operator turns it on — and honest: the
//! capability check gates the UI, so a build without the engine, or a machine
//! without the model installed, greys the toggle out with a reason rather than
//! failing when pressed. The recognition loop reuses `freally-voice`'s cpal
//! capture and resampler, so there is one microphone path for both tracks.

use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::teleprompter::TeleprompterState;

/// The Vosk model directory, beside settings and the voice-command model. A
/// release bundles it here (FT-52); until then it is absent and the capability
/// check reports it missing.
fn model_dir() -> PathBuf {
    crate::settings::project_dirs()
        .map(|dirs| dirs.data_dir().join("vosk-model-en"))
        .unwrap_or_else(|| PathBuf::from("vosk-model-en"))
}

/// Voice-following availability for the UI — a serialisable mirror of
/// `freally_speech::SpeechCapability` (that crate stays dependency-free, so the
/// serde lives here).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpeechCapabilityDto {
    available: bool,
    engine: String,
    detail: String,
}

impl From<freally_speech::SpeechCapability> for SpeechCapabilityDto {
    fn from(cap: freally_speech::SpeechCapability) -> Self {
        Self {
            available: cap.available,
            engine: cap.engine,
            detail: cap.detail,
        }
    }
}

/// Report whether voice-following can run: the `vosk` engine must be built in AND
/// the model installed. The UI greys the toggle out and shows `detail` otherwise.
#[tauri::command]
pub fn speech_capability() -> SpeechCapabilityDto {
    freally_speech::capability(Some(&model_dir())).into()
}

/// Managed state for voice-following.
#[derive(Default)]
pub struct FollowState {
    session: crate::session::BackgroundSession,
}

/// Start following the reader. Errors with the capability reason when
/// voice-following is unavailable, so the UI shows that rather than a dead toggle.
#[tauri::command]
pub fn voice_follow_start(
    app: AppHandle,
    state: State<'_, FollowState>,
    teleprompter: State<'_, TeleprompterState>,
) -> Result<(), String> {
    let cap = freally_speech::capability(Some(&model_dir()));
    if !cap.available {
        return Err(cap.detail);
    }
    let script = teleprompter.dto().script;
    state
        .session
        .start(move |stop| std::thread::spawn(move || run_follow(app, script, stop)));
    Ok(())
}

/// Stop following and release the microphone.
#[tauri::command]
pub fn voice_follow_stop(state: State<'_, FollowState>) {
    state.session.stop();
}

/// The recognition + alignment loop. Present only with the `vosk` feature and
/// verified by the voice-following human drill, never CI. It recognises the
/// script's own words, aligns them to a visible-character offset, and emits
/// `voice:offset` and `voice:tracking` for the UI to drive `overrideOffset` and
/// degrade to manual on low confidence.
#[cfg(feature = "vosk")]
fn run_follow(app: AppHandle, script: String, stop: Arc<AtomicBool>) {
    use std::sync::atomic::Ordering;

    use freally_align::{Aligner, Script};
    use freally_speech::{grammar_window, SpeechRecognizer, VoskRecognizer};
    use freally_voice::{AudioSource, CpalSource, Resampler, CANONICAL_SAMPLE_RATE};
    use tauri::Emitter;

    const RATE: u32 = CANONICAL_SAMPLE_RATE;
    let mut recognizer = match VoskRecognizer::new(&model_dir().to_string_lossy(), RATE as f32) {
        Ok(recognizer) => recognizer,
        Err(err) => {
            let _ = app.emit("voice:error", err);
            return;
        }
    };
    let mut source = match CpalSource::new() {
        Ok(source) => source,
        Err(err) => {
            let _ = app.emit("voice:error", err);
            return;
        }
    };
    let mut resampler = Resampler::new(source.sample_rate(), RATE);

    // Tokenise ONCE, through the aligner's own `Script`, so the grammar window
    // and `aligner.word_index()` share an index basis. Tokenising separately with
    // `split_whitespace` would keep the `--` caesuras that `Script` drops, and the
    // grammar would then centre on the wrong word.
    let parsed = Script::parse(&script);
    let words: Vec<String> = parsed.words.iter().map(|w| w.text.clone()).collect();
    let word_refs: Vec<&str> = words.iter().map(String::as_str).collect();
    let mut aligner = Aligner::new(parsed);
    // Constrain the recogniser to the top of the script to begin with.
    recognizer.set_grammar(&grammar_window(&word_refs, 0, 4, 40));
    let mut grammar_center = 0usize;

    let _ = app.emit("voice:tracking", true);
    let mut block = Vec::new();
    while !stop.load(Ordering::Relaxed) {
        block.clear();
        if !source.read(&mut block) {
            break;
        }
        let resampled = resampler.process(&block);
        if let Some(hypothesis) = recognizer.accept(&resampled) {
            for word in &hypothesis.words {
                aligner.observe(&word.text);
            }
            let _ = app.emit("voice:offset", aligner.offset());
            let _ = app.emit("voice:tracking", aligner.is_tracking());
            // Slide the constrained vocabulary forward as the reader advances.
            if let Some(index) = aligner.word_index() {
                if index.abs_diff(grammar_center) > 15 {
                    recognizer.set_grammar(&grammar_window(&word_refs, index, 4, 40));
                    grammar_center = index;
                }
            }
        }
    }
    let _ = app.emit("voice:tracking", false);
}

/// Without the `vosk` feature the loop cannot run — but `voice_follow_start`
/// already refuses via the capability check, so this is never reached. It exists
/// only so the spawn compiles.
#[cfg(not(feature = "vosk"))]
fn run_follow(_app: AppHandle, _script: String, _stop: Arc<AtomicBool>) {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn capability_is_unavailable_without_the_vosk_feature() {
        // The default build (and CI) has no engine compiled in, so the toggle
        // must report unavailable rather than claim it works.
        let cap = speech_capability();
        assert!(!cap.available);
        assert_eq!(cap.engine, "none");
        assert!(!cap.detail.is_empty());
    }
}
