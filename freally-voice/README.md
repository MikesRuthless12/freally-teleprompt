# freally-voice

**Model-free, speaker-dependent voice-command recognition — no model, no network, no third-party engine.**

Track A of Freally Teleprompt's Phase 3 (FT-30). The user records each command
phrase a few times; a spoken utterance is then matched against those recordings
by classic DSP alone:

```text
mic → VAD / endpointing → MFCC frames → DTW vs. templates → command id + confidence
```

Nothing is trained in the statistical sense. There is no model, no weights, no
inference runtime, and no network — so there is no third-party data licence to
carry. It is speaker-dependent by construction, which is the point: the user
enrols their own voice once.

## Why a prompter can trust it

A teleprompter must never *guess* a transport command. `recognize` returns an
explicit `Recognition::NotRecognised` whenever the best match fails to clear a
confidence floor **or** is not clearly closer than the runner-up command. Hold
position, don't guess.

## Shape

| Module | What it does |
|---|---|
| `mfcc` | Pre-emphasis → framing → Hamming → power spectrum → Mel filterbank → log → DCT-II. Own FFT (`fft`), no DSP crate. |
| `vad` | `speech_bounds` trims a recording to the spoken region; `Endpointer` is the streaming detector the live loop feeds. |
| `dtw` | Length-normalised, banded Dynamic Time Warping between two MFCC sequences. |
| `recognizer` | `VoiceModel`: `enroll` the user's commands, `recognize` an utterance → command id + confidence, or `NotRecognised`. |
| `capture` | The `AudioSource` seam. The host app supplies the real (cpal) microphone backend (FT-31); a `SliceSource` drives tests and offline clips. |

## Example

```rust
use freally_voice::{Recognition, VoiceModel};

let mut model = VoiceModel::new(16_000); // sample rate the mic captures at

// "Train your commands" — record each phrase a few times (FT-31 supplies audio).
for take in &play_recordings { model.enroll("play", take)?; }
for take in &stop_recordings { model.enroll("stop", take)?; }

match model.recognize(&utterance) {
    Recognition::Match { command_id, confidence } => drive_transport(&command_id, confidence),
    Recognition::NotRecognised => { /* hold — never guess */ }
}
```

A trained `VoiceModel` serialises to JSON as **feature vectors, never audio**, so
the host can persist the user's templates without a recording ever touching disk.

## Privacy

No network, ever. Audio is processed in memory; only derived MFCC features are
retained, and only in a model the host chooses to save. See the suite-wide FT-31
guarantee: the microphone is live only while listening, audio never leaves the
device, and no recording is written to disk.

## Status

The deterministic core (VAD · MFCC · DTW · recogniser) is complete and unit-
tested with synthetic audio. The cpal microphone backend, the Tauri command
wiring, the train-your-commands UI, and the mic-live indicator land with FT-31,
where they become human hardware drills. The confidence floor and distance scale
ship with reasonable defaults that want calibrating against real recordings.
