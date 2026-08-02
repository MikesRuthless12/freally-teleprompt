//! Dictation (FT-32 / FT-33) — speech to text, into the script editor.
//!
//! Recognises free speech with `freally-speech` (Vosk) and emits each completed
//! utterance for the UI to insert. The recogniser links a native library and
//! needs a model, so the whole loop is behind the `vosk` feature; without it
//! (the default build and CI) the app reports dictation **unavailable** and the
//! loop does not exist.
//!
//! It is **opt-in** — the microphone opens only when the operator presses record
//! — and honest: the capability check gates the UI, so a build without the
//! engine, or a machine without the model, says so rather than failing when
//! pressed. Audio capture and resampling come from `freally-voice`.
//!
//! The grammar is deliberately FREE here. `freally-speech` can constrain the
//! vocabulary to a window of the script, which is far more accurate for reading
//! aloud — but dictation exists to write words the script does not contain yet,
//! so constraining it would defeat the purpose.

use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

/// The Vosk model directory.
///
/// Two locations, in this order and deliberately:
///
/// 1. **The user's data directory**, beside settings. Nothing writes this — it
///    is the escape hatch for dropping in a
///    different or larger model without rebuilding the app, and it wins so that
///    a deliberate choice is never overridden by the shipped default.
/// 2. **The bundled model**, in the app's resource directory (FT-33).
///
/// Falling through to (2) with no bundle present yields a path that does not
/// exist, which is exactly what the capability check reports on.
fn model_dir(app: &AppHandle) -> PathBuf {
    let user = crate::settings::project_dirs().map(|dirs| dirs.data_dir().join("vosk-model-en"));
    if let Some(dir) = user.filter(|dir| dir.is_dir()) {
        return dir;
    }
    app.path()
        .resource_dir()
        .map(|res| res.join("vosk-model-en"))
        .unwrap_or_else(|_| PathBuf::from("vosk-model-en"))
}

/// The model path as a string a C library will accept.
///
/// ⚠️ On Windows this MUST strip the `\\?\` extended-length prefix.
/// `resource_dir()` hands back a canonicalised path, and Rust canonicalisation
/// on Windows always produces the verbatim `\\?\C:\…` form. Rust's own file
/// APIs understand it — which is exactly what makes this so easy to miss, since
/// `Path::exists()` returns true and the capability check happily reports the
/// model as present — but **libvosk is a C library** opening the model with
/// plain file calls, and those reject the prefix outright.
///
/// The result was a build that offered the record button and then failed the
/// moment it was pressed, with "could not load the Vosk model at \\?\C:\…".
/// Only a real installed build shows this: in a dev run the path comes from the
/// manifest directory and carries no prefix.
///
/// Its only caller is the `vosk`-gated loop, but it stays compiled either way so
/// the test below runs in the default build too — this is pure string logic and
/// needs no engine to be worth checking.
#[cfg_attr(not(feature = "vosk"), allow(dead_code))]
fn model_path_for_ffi(dir: &std::path::Path) -> String {
    let text = dir.to_string_lossy().into_owned();
    match text.strip_prefix(r"\\?\") {
        // A UNC verbatim path (`\\?\UNC\server\share`) needs the real UNC form
        // back, not a bare `UNC\…` which names nothing.
        Some(rest) => rest
            .strip_prefix("UNC\\")
            .map_or_else(|| rest.to_string(), |share| format!(r"\\{share}")),
        None => text,
    }
}

/// Dictation availability for the UI — a serialisable mirror of
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

/// Report whether dictation can run: the `vosk` engine must be built in AND the
/// model installed. The UI hides the record button and shows `detail` otherwise.
#[tauri::command]
pub fn speech_capability(app: AppHandle) -> SpeechCapabilityDto {
    freally_speech::capability(Some(&model_dir(&app))).into()
}

/// Managed state for dictation.
#[derive(Default)]
pub struct DictationState {
    session: crate::session::BackgroundSession,
}

/// Start dictating into the script editor.
///
/// Emits `voice:dictation` with each completed utterance for the UI to insert.
#[tauri::command]
pub fn dictation_start(app: AppHandle, state: State<'_, DictationState>) -> Result<(), String> {
    let cap = freally_speech::capability(Some(&model_dir(&app)));
    if !cap.available {
        return Err(cap.detail);
    }
    state
        .session
        .start(move |stop| std::thread::spawn(move || run_dictation(app, stop)));
    Ok(())
}

/// Stop dictating and release the microphone.
#[tauri::command]
pub fn dictation_stop(state: State<'_, DictationState>) {
    state.session.stop();
}

/// The dictation loop — recognise freely and emit the text.
#[cfg(feature = "vosk")]
fn run_dictation(app: AppHandle, stop: Arc<AtomicBool>) {
    use std::sync::atomic::Ordering;

    use freally_speech::{SpeechRecognizer, VoskRecognizer};
    use freally_voice::{AudioSource, CpalSource, Resampler, CANONICAL_SAMPLE_RATE};
    use tauri::Emitter;

    const RATE: u32 = CANONICAL_SAMPLE_RATE;
    let mut recognizer =
        match VoskRecognizer::new(&model_path_for_ffi(&model_dir(&app)), RATE as f32) {
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

    // An EMPTY window frees the vocabulary. `freally-speech` can constrain it
    // to a window of the script, but that would let dictation type only words
    // already written — the opposite of the point.
    recognizer.set_grammar(&[]);

    let _ = app.emit("voice:dictating", true);
    let mut block = Vec::new();
    while !stop.load(Ordering::Relaxed) {
        block.clear();
        if !source.read(&mut block) {
            break;
        }
        let resampled = resampler.process(&block);
        if let Some(hypothesis) = recognizer.accept(&resampled) {
            // Silence endpoints as an empty result; emitting it would insert
            // stray spaces into the operator's script.
            let text = hypothesis.text.trim();
            if !text.is_empty() {
                let _ = app.emit("voice:dictation", text.to_string());
            }
        }
    }
    let _ = app.emit("voice:dictating", false);
}

/// Without the `vosk` feature there is no recogniser — `dictation_start` already
/// refuses via the capability check, so this is never reached.
#[cfg(not(feature = "vosk"))]
fn run_dictation(_app: AppHandle, _stop: Arc<AtomicBool>) {}

#[cfg(test)]
mod tests {
    use super::*;

    /// The capability CONTRACT — unavailable without a model, in both the
    /// `vosk` and the default build — is tested in `freally-speech`, which owns
    /// it and needs no Tauri app to do it. This module owns only the mapping
    /// into the serialisable shape the UI reads, so that is what is tested here.
    ///
    /// (It used to call `speech_capability()` directly and assert the engine was
    /// `"none"`. That stopped compiling the moment the command needed an
    /// `AppHandle` to find the bundled model — and it had been asserting the
    /// default build's answer as though it were the only one.)
    /// The `\\?\` prefix must never reach libvosk. This shipped once: the
    /// capability check passed (Rust's `exists()` accepts the prefix), the
    /// record button appeared, and pressing it failed with "could not load the
    /// Vosk model at \\?\C:\…" — a path that was, in every other sense, correct.
    #[test]
    fn the_ffi_path_never_carries_the_windows_verbatim_prefix() {
        assert_eq!(
            model_path_for_ffi(std::path::Path::new(
                r"\\?\C:\Program Files\App\vosk-model-en"
            )),
            r"C:\Program Files\App\vosk-model-en",
        );
        // A verbatim UNC path has to come back as a real UNC path, not `UNC\…`.
        assert_eq!(
            model_path_for_ffi(std::path::Path::new(r"\\?\UNC\server\share\model")),
            r"\\server\share\model",
        );
        // Anything already plain is left exactly as it is.
        for plain in [
            r"C:\Apps\model",
            "/usr/share/model",
            r"\\server\share\model",
        ] {
            assert_eq!(model_path_for_ffi(std::path::Path::new(plain)), plain);
        }
    }

    #[test]
    fn the_dto_carries_the_capability_through_unchanged() {
        let cap = freally_speech::SpeechCapability {
            available: false,
            engine: "vosk".into(),
            detail: "no speech model configured".into(),
        };
        let dto: SpeechCapabilityDto = cap.clone().into();
        assert_eq!(dto.available, cap.available);
        assert_eq!(dto.engine, cap.engine);
        assert_eq!(dto.detail, cap.detail);
    }
}
