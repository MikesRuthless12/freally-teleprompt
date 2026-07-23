//! The microphone seam.
//!
//! [`AudioSource`] is all this crate knows about capture: a pull of mono `f32`
//! samples. The host app supplies the real (cpal) implementation in FT-31, which
//! keeps platform audio dependencies — and the "audio never leaves the device,
//! never touches disk" guarantee — out of this crate and at the integration
//! layer where they belong.

/// A pull-based source of mono `f32` audio samples in `[-1.0, 1.0]`.
pub trait AudioSource {
    /// Sample rate of the samples this source yields, in Hz.
    fn sample_rate(&self) -> u32;

    /// Append the next block of samples to `out`. Returns `false` when a finite
    /// source is exhausted; a live microphone returns `true` indefinitely.
    fn read(&mut self, out: &mut Vec<f32>) -> bool;
}

/// An in-memory [`AudioSource`] over a fixed buffer — for offline processing of
/// a recorded clip, tests, and worked examples.
pub struct SliceSource<'a> {
    samples: &'a [f32],
    sample_rate: u32,
    pos: usize,
    block: usize,
}

impl<'a> SliceSource<'a> {
    /// Yield `samples` in blocks of 1024.
    pub fn new(samples: &'a [f32], sample_rate: u32) -> Self {
        Self {
            samples,
            sample_rate,
            pos: 0,
            block: 1024,
        }
    }
}

impl AudioSource for SliceSource<'_> {
    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    fn read(&mut self, out: &mut Vec<f32>) -> bool {
        if self.pos >= self.samples.len() {
            return false;
        }
        let end = (self.pos + self.block).min(self.samples.len());
        out.extend_from_slice(&self.samples[self.pos..end]);
        self.pos = end;
        true
    }
}

#[cfg(feature = "capture-cpal")]
pub use cpal_backend::CpalSource;

/// The live-microphone [`AudioSource`], behind the `capture-cpal` feature.
///
/// It opens the default input device through cpal — which is a thin binding over
/// the OS's own audio API (WASAPI / CoreAudio / ALSA), not a bundled engine —
/// downmixes to mono `f32`, and hands blocks to the reader. **No sample is ever
/// written to disk**; audio lives only in the channel and is dropped once read.
#[cfg(feature = "capture-cpal")]
mod cpal_backend {
    use super::AudioSource;
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
    use std::sync::mpsc::{Receiver, RecvTimeoutError};
    use std::time::Duration;

    /// A live capture stream. Not `Send` (a cpal `Stream` is not, on Windows), so
    /// it is created and read on the one thread that owns the capture session.
    pub struct CpalSource {
        // Held only to keep the stream alive; dropping it stops capture.
        _stream: cpal::Stream,
        rx: Receiver<Vec<f32>>,
        sample_rate: u32,
    }

    impl CpalSource {
        /// Open the system default input device and start capturing.
        pub fn new() -> Result<Self, String> {
            let host = cpal::default_host();
            let device = host
                .default_input_device()
                .ok_or_else(|| "no microphone / input device found".to_string())?;
            let supported = device
                .default_input_config()
                .map_err(|e| format!("no default input config: {e}"))?;
            let sample_rate = supported.sample_rate().0;
            let channels = supported.channels() as usize;
            let sample_format = supported.sample_format();
            let config: cpal::StreamConfig = supported.into();

            let (tx, rx) = std::sync::mpsc::channel::<Vec<f32>>();
            let err_fn = |e| eprintln!("voice: input stream error: {e}");

            let stream = match sample_format {
                cpal::SampleFormat::F32 => device.build_input_stream(
                    &config,
                    move |data: &[f32], _| {
                        let _ = tx.send(downmix(data, channels, |s| s));
                    },
                    err_fn,
                    None,
                ),
                cpal::SampleFormat::I16 => device.build_input_stream(
                    &config,
                    move |data: &[i16], _| {
                        let _ = tx.send(downmix(data, channels, |s| s as f32 / 32768.0));
                    },
                    err_fn,
                    None,
                ),
                cpal::SampleFormat::U16 => device.build_input_stream(
                    &config,
                    move |data: &[u16], _| {
                        let _ =
                            tx.send(downmix(data, channels, |s| (s as f32 - 32768.0) / 32768.0));
                    },
                    err_fn,
                    None,
                ),
                other => return Err(format!("unsupported input sample format: {other:?}")),
            }
            .map_err(|e| format!("could not open input stream: {e}"))?;

            stream
                .play()
                .map_err(|e| format!("could not start capture: {e}"))?;
            Ok(Self {
                _stream: stream,
                rx,
                sample_rate,
            })
        }
    }

    /// Interleaved multi-channel samples → mono `f32` by averaging channels.
    fn downmix<T: Copy>(data: &[T], channels: usize, to_f32: impl Fn(T) -> f32) -> Vec<f32> {
        if channels <= 1 {
            return data.iter().map(|&s| to_f32(s)).collect();
        }
        data.chunks(channels)
            .map(|frame| frame.iter().map(|&s| to_f32(s)).sum::<f32>() / channels as f32)
            .collect()
    }

    impl AudioSource for CpalSource {
        fn sample_rate(&self) -> u32 {
            self.sample_rate
        }

        fn read(&mut self, out: &mut Vec<f32>) -> bool {
            // Block briefly so the listen loop can poll its stop flag ~10×/sec,
            // then drain whatever else is already queued.
            match self.rx.recv_timeout(Duration::from_millis(100)) {
                Ok(block) => out.extend_from_slice(&block),
                Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => return false,
            }
            while let Ok(block) = self.rx.try_recv() {
                out.extend_from_slice(&block);
            }
            true
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slice_source_yields_every_sample_then_stops() {
        let data: Vec<f32> = (0..2500).map(|i| i as f32).collect();
        let mut src = SliceSource::new(&data, 16_000);
        assert_eq!(src.sample_rate(), 16_000);
        let mut got = Vec::new();
        while src.read(&mut got) {}
        assert_eq!(got, data);
        // Exhausted source keeps returning false without appending.
        let len = got.len();
        assert!(!src.read(&mut got));
        assert_eq!(got.len(), len);
    }
}
