//! A background worker with a stop flag and a join handle.
//!
//! The voice-command listener (FT-31) and the voice-follow loop (FT-35) both run
//! a microphone loop on a dedicated thread with exactly the same lifecycle —
//! idempotent start, stop-and-join, mutex-poison recovery. That machinery lives
//! here once rather than in two hand-kept copies, so a fix to the teardown can't
//! silently skip one of them.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, PoisonError};
use std::thread::JoinHandle;

struct Running {
    stop: Arc<AtomicBool>,
    handle: JoinHandle<()>,
}

/// A single optional background thread with a start/stop lifecycle.
#[derive(Default)]
pub struct BackgroundSession {
    slot: Mutex<Option<Running>>,
}

impl BackgroundSession {
    fn slot(&self) -> std::sync::MutexGuard<'_, Option<Running>> {
        self.slot.lock().unwrap_or_else(PoisonError::into_inner)
    }

    /// Start the worker if one is not already running (a no-op if it is). `spawn`
    /// receives the stop flag to poll and returns the thread handle.
    pub fn start(&self, spawn: impl FnOnce(Arc<AtomicBool>) -> JoinHandle<()>) {
        let mut slot = self.slot();
        if slot.is_some() {
            return;
        }
        let stop = Arc::new(AtomicBool::new(false));
        let handle = spawn(stop.clone());
        *slot = Some(Running { stop, handle });
    }

    /// Signal the worker to stop and wait for it to finish (a no-op if none runs).
    pub fn stop(&self) {
        let running = self.slot().take();
        if let Some(running) = running {
            running.stop.store(true, Ordering::Relaxed);
            let _ = running.handle.join();
        }
    }
}
