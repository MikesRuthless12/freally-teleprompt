//! Hands-free voice commands (FT-31) — the app's half of Track A.
//!
//! The model-free recogniser itself lives in the `freally-voice` crate; this
//! module wires it to the app: it persists the user's trained templates, drives
//! the microphone through cpal, and turns a recognised command into a
//! `voice:command` event the UI binds to the transport.
//!
//! Two guarantees hold, and both are structural rather than best-effort:
//!
//! * **Audio never touches disk.** The only thing [`save_model`] writes is a
//!   [`VoiceModel`] — cepstral *feature* vectors. Capture buffers are in-memory
//!   `Vec<f32>` dropped the moment they are recognised. `saved_model_is_features_not_audio`
//!   pins this down.
//! * **Audio never leaves the device.** Nothing in this module opens a socket;
//!   the sole consumer of captured audio is the local recogniser.
//!
//! Voice control is **off by default** (`Settings::voice_enabled`), and the
//! microphone is opened only while a capture or a listening session is active.

use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, PoisonError};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use freally_voice::{
    AudioSource, CpalSource, Recognition, Resampler, UtteranceSegmenter, VadConfig, VoiceModel,
    CANONICAL_SAMPLE_RATE,
};

/// The trained model's file, beside settings and crash reports (features only).
fn model_path() -> PathBuf {
    crate::settings::project_dirs()
        .map(|dirs| dirs.data_dir().join("voice-model.json"))
        .unwrap_or_else(|| PathBuf::from("voice-model.json"))
}

/// Load the model, or an empty one on first run / unreadable file. A broken file
/// is reported and replaced rather than fatal — the app must still start, and the
/// only cost is the user re-training, which is the safe direction to fail.
fn load_model(path: &Path) -> VoiceModel {
    match std::fs::read_to_string(path) {
        Ok(text) => serde_json::from_str::<VoiceModel>(&text).unwrap_or_else(|err| {
            eprintln!(
                "voice: {} is not a valid model ({err}) — starting fresh",
                path.display()
            );
            VoiceModel::new(CANONICAL_SAMPLE_RATE)
        }),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            VoiceModel::new(CANONICAL_SAMPLE_RATE)
        }
        Err(err) => {
            eprintln!(
                "voice: could not read {} ({err}) — starting fresh",
                path.display()
            );
            VoiceModel::new(CANONICAL_SAMPLE_RATE)
        }
    }
}

/// Persist the model atomically, sharing the settings store's `atomic_write` so
/// the crash-safe temp-file+rename discipline lives in exactly one place.
fn save_model(path: &Path, model: &VoiceModel) -> std::io::Result<()> {
    let text = serde_json::to_string(model)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    crate::settings::atomic_write(path, text.as_bytes())
}

/// A running listening session (either mode). Push-to-talk is expressed by the
/// UI simply starting and stopping this session as the talk button is held and
/// released, so the microphone is open only while it is actually attended — the
/// backend needs no separate gate.
struct ListenSession {
    stop: Arc<AtomicBool>,
    handle: JoinHandle<()>,
}

/// The managed voice state: the trained model, its file, and any live session.
pub struct VoiceState {
    model: Mutex<VoiceModel>,
    path: PathBuf,
    session: Mutex<Option<ListenSession>>,
    /// True while the microphone is open (a capture or a listening session).
    mic_live: Arc<AtomicBool>,
}

impl VoiceState {
    /// Load the persisted model (or start empty). Opens no microphone.
    pub fn load() -> Self {
        let path = model_path();
        Self {
            model: Mutex::new(load_model(&path)),
            path,
            session: Mutex::new(None),
            mic_live: Arc::new(AtomicBool::new(false)),
        }
    }

    fn model(&self) -> std::sync::MutexGuard<'_, VoiceModel> {
        self.model.lock().unwrap_or_else(PoisonError::into_inner)
    }

    fn session(&self) -> std::sync::MutexGuard<'_, Option<ListenSession>> {
        self.session.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

/// What the UI shows about the trained model.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceSummary {
    commands: Vec<CommandInfo>,
    listening: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandInfo {
    id: String,
    takes: usize,
}

fn summarize(model: &VoiceModel, listening: bool) -> VoiceSummary {
    let commands = model
        .command_ids()
        .into_iter()
        .map(|id| {
            let takes = model
                .templates
                .iter()
                .filter(|t| t.command_id == id)
                .count();
            CommandInfo { id, takes }
        })
        .collect();
    VoiceSummary {
        commands,
        listening,
    }
}

/// The payload of a `voice:command` event.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CommandEvent {
    command_id: String,
    confidence: f32,
}

/// Capture exactly one spoken utterance from the microphone and return its
/// samples at the canonical rate. Runs on a blocking thread (it owns the cpal
/// stream, which is not `Send`). Gives up after a few seconds of silence so a
/// missed cue cannot hang the UI.
fn capture_one_utterance() -> Result<Vec<f32>, String> {
    let mut source = CpalSource::new()?;
    let mut resampler = Resampler::new(source.sample_rate(), CANONICAL_SAMPLE_RATE);
    let vad = VadConfig::new(CANONICAL_SAMPLE_RATE);
    let mut segmenter = UtteranceSegmenter::with_default_threshold(&vad);
    let deadline = Instant::now() + Duration::from_secs(8);

    let mut block = Vec::new();
    loop {
        if Instant::now() >= deadline {
            return Err("no speech was captured — please try again".into());
        }
        block.clear();
        if !source.read(&mut block) {
            return Err("the microphone stopped unexpectedly".into());
        }
        let resampled = resampler.process(&block);
        if let Some(utterance) = segmenter.push(&resampled).into_iter().next() {
            return Ok(utterance);
        }
    }
}

/// The listening loop. Owns the cpal stream for its whole life on this thread;
/// emits `voice:command` for each recognised utterance until asked to stop.
fn run_listener(
    app: AppHandle,
    model: VoiceModel,
    stop: Arc<AtomicBool>,
    mic_live: Arc<AtomicBool>,
) {
    let mut source = match CpalSource::new() {
        Ok(source) => source,
        Err(err) => {
            let _ = app.emit("voice:error", err);
            return;
        }
    };
    let mut resampler = Resampler::new(source.sample_rate(), CANONICAL_SAMPLE_RATE);
    let mut segmenter = UtteranceSegmenter::with_default_threshold(&model.vad);

    mic_live.store(true, Ordering::Relaxed);
    let _ = app.emit("voice:listening", true);

    let mut block = Vec::new();
    while !stop.load(Ordering::Relaxed) {
        block.clear();
        if !source.read(&mut block) {
            break;
        }
        let resampled = resampler.process(&block);
        for utterance in segmenter.push(&resampled) {
            if let Recognition::Match {
                command_id,
                confidence,
            } = model.recognize(&utterance)
            {
                let _ = app.emit(
                    "voice:command",
                    CommandEvent {
                        command_id,
                        confidence,
                    },
                );
            }
        }
    }

    mic_live.store(false, Ordering::Relaxed);
    let _ = app.emit("voice:listening", false);
}

// -- commands -----------------------------------------------------------------

/// The trained commands and whether the mic is currently live.
#[tauri::command]
pub fn voice_summary(state: State<'_, VoiceState>) -> VoiceSummary {
    summarize(&state.model(), state.mic_live.load(Ordering::Relaxed))
}

/// Record one take of `command_id` from the microphone and add it to the model.
/// Call three times or so per command; more takes make recognition steadier.
#[tauri::command]
pub async fn voice_enroll_capture(
    app: AppHandle,
    state: State<'_, VoiceState>,
    command_id: String,
) -> Result<VoiceSummary, String> {
    if command_id.trim().is_empty() {
        return Err("a command needs a name".into());
    }

    state.mic_live.store(true, Ordering::Relaxed);
    let _ = app.emit("voice:listening", true);
    let captured = tauri::async_runtime::spawn_blocking(capture_one_utterance).await;
    state.mic_live.store(false, Ordering::Relaxed);
    let _ = app.emit("voice:listening", false);

    let samples = captured.map_err(|e| format!("capture task failed: {e}"))??;
    let mut model = state.model();
    model
        .enroll(&command_id, &samples)
        .map_err(|e| format!("could not enrol: {e}"))?;
    save_model(&state.path, &model).map_err(|e| format!("could not save model: {e}"))?;
    Ok(summarize(&model, false))
}

/// Drop every take of `command_id`.
#[tauri::command]
pub fn voice_forget_command(
    state: State<'_, VoiceState>,
    command_id: String,
) -> Result<VoiceSummary, String> {
    let mut model = state.model();
    model.templates.retain(|t| t.command_id != command_id);
    save_model(&state.path, &model).map_err(|e| format!("could not save model: {e}"))?;
    Ok(summarize(&model, state.mic_live.load(Ordering::Relaxed)))
}

/// Erase all trained commands.
#[tauri::command]
pub fn voice_clear_model(state: State<'_, VoiceState>) -> Result<VoiceSummary, String> {
    let mut model = state.model();
    model.templates.clear();
    save_model(&state.path, &model).map_err(|e| format!("could not save model: {e}"))?;
    Ok(summarize(&model, state.mic_live.load(Ordering::Relaxed)))
}

/// Begin listening for commands. Idempotent while a session is already running.
///
/// The UI calls this on enable in always-listening mode, or on each press of the
/// talk button in push-to-talk mode — so the mic is open only while attended.
#[tauri::command]
pub fn voice_start_listening(app: AppHandle, state: State<'_, VoiceState>) -> Result<(), String> {
    let mut session = state.session();
    if session.is_some() {
        return Ok(());
    }
    let stop = Arc::new(AtomicBool::new(false));
    let model = state.model().clone();
    let mic_live = state.mic_live.clone();
    let handle = {
        let stop = stop.clone();
        std::thread::spawn(move || run_listener(app, model, stop, mic_live))
    };
    *session = Some(ListenSession { stop, handle });
    Ok(())
}

/// Stop listening and release the microphone.
#[tauri::command]
pub fn voice_stop_listening(state: State<'_, VoiceState>) {
    let session = state.session().take();
    if let Some(session) = session {
        session.stop.store(true, Ordering::Relaxed);
        let _ = session.handle.join();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32::consts::TAU;

    /// Half a second of tone at the canonical rate — comfortably enough frames
    /// to enrol, and standing in for a spoken word in these audio-free tests.
    fn tone_utterance() -> Vec<f32> {
        let n = CANONICAL_SAMPLE_RATE as usize / 2;
        (0..n)
            .map(|i| 0.5 * (TAU * 300.0 * i as f32 / CANONICAL_SAMPLE_RATE as f32).sin())
            .collect()
    }

    fn temp_path(name: &str) -> PathBuf {
        std::env::temp_dir()
            .join("freally-teleprompt-tests")
            .join(format!("{name}.json"))
    }

    /// The load-bearing privacy guarantee: what lands on disk is FEATURES, never
    /// the recording. The stored floats are cepstral frames of `n_coeffs` each,
    /// and there are far fewer of them than there were audio samples.
    #[test]
    fn saved_model_is_features_not_audio() {
        let path = temp_path("voice-model-features");
        let _ = std::fs::remove_file(&path);

        let mut model = VoiceModel::new(CANONICAL_SAMPLE_RATE);
        let audio = tone_utterance();
        model.enroll("play", &audio).unwrap();
        save_model(&path, &model).unwrap();

        let reloaded = load_model(&path);
        assert_eq!(reloaded.templates.len(), 1);
        assert!(reloaded.templates[0]
            .features
            .iter()
            .all(|frame| frame.len() == model.mfcc.n_coeffs));
        let stored: usize = reloaded
            .templates
            .iter()
            .flat_map(|t| &t.features)
            .map(Vec::len)
            .sum();
        assert!(
            stored < audio.len() / 4,
            "stored {stored} floats vs {} audio samples — features, not audio",
            audio.len()
        );
    }

    #[test]
    fn missing_model_file_loads_empty() {
        let path = temp_path("voice-model-absent");
        let _ = std::fs::remove_file(&path);
        assert!(load_model(&path).templates.is_empty());
    }

    #[test]
    fn model_round_trips_through_disk() {
        let path = temp_path("voice-model-round-trip");
        let _ = std::fs::remove_file(&path);
        let mut model = VoiceModel::new(CANONICAL_SAMPLE_RATE);
        model.enroll("play", &tone_utterance()).unwrap();
        model.enroll("stop", &tone_utterance()).unwrap();
        save_model(&path, &model).unwrap();
        assert_eq!(load_model(&path), model);
    }

    #[test]
    fn summary_counts_takes_per_command() {
        let mut model = VoiceModel::new(CANONICAL_SAMPLE_RATE);
        model.enroll("play", &tone_utterance()).unwrap();
        model.enroll("play", &tone_utterance()).unwrap();
        model.enroll("stop", &tone_utterance()).unwrap();

        let summary = summarize(&model, true);
        assert_eq!(summary.commands.len(), 2);
        let play = summary.commands.iter().find(|c| c.id == "play").unwrap();
        assert_eq!(play.takes, 2);
        assert!(summary.listening);
    }
}
