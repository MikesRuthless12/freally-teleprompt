//! A background worker with a stop flag and a join handle.
//!
//! The dictation loop (FT-33) runs a microphone loop on a dedicated thread:
//! idempotent start, stop-and-join, mutex-poison recovery, and — see `start` —
//! reaping a worker that ended on its own. Kept as its own type because that
//! last part is the half everyone forgets.

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

        // ⚠️ A worker can END WITHOUT `stop()` — the microphone was already held
        // by something else, the model failed to load, the audio device was
        // unplugged mid-session. Its handle stays in the slot, and because the
        // guard below only asks "is the slot full?", every later start became a
        // silent no-op: the feature was gone for the rest of the process, with
        // no error, no event, and nothing the user could press to recover.
        //
        // Reap the corpse first, so "occupied" means "actually still running".
        if slot
            .as_ref()
            .is_some_and(|running| running.handle.is_finished())
        {
            if let Some(finished) = slot.take() {
                let _ = finished.handle.join();
            }
        }

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

#[cfg(test)]
mod tests {
    use super::*;

    /// A worker that returns on its own must not wedge the session.
    ///
    /// This is the microphone-already-in-use case: the thread starts, fails to
    /// open the device, emits its error and returns. Nothing calls `stop()`,
    /// because as far as the UI is concerned nothing ever started. The next
    /// press has to work.
    #[test]
    fn a_worker_that_exits_on_its_own_does_not_block_the_next_start() {
        let session = BackgroundSession::default();

        session.start(|_stop| std::thread::spawn(|| {}));
        // Let it finish. Joining through `stop()` would defeat the point — the
        // whole scenario is that `stop()` is never called.
        for _ in 0..200 {
            if session
                .slot()
                .as_ref()
                .is_some_and(|r| r.handle.is_finished())
            {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(5));
        }

        let ran_again = Arc::new(AtomicBool::new(false));
        let flag = ran_again.clone();
        session.start(move |_stop| std::thread::spawn(move || flag.store(true, Ordering::Relaxed)));
        session.stop();

        assert!(
            ran_again.load(Ordering::Relaxed),
            "the second start was swallowed by the finished worker's handle",
        );
    }

    /// The ordinary guard still holds: a LIVE worker is not replaced.
    #[test]
    fn a_running_worker_is_not_restarted() {
        let session = BackgroundSession::default();
        let starts = Arc::new(AtomicBool::new(false));

        session.start(|stop| {
            std::thread::spawn(move || {
                while !stop.load(Ordering::Relaxed) {
                    std::thread::sleep(std::time::Duration::from_millis(2));
                }
            })
        });
        let second = starts.clone();
        session
            .start(move |_stop| std::thread::spawn(move || second.store(true, Ordering::Relaxed)));
        session.stop();

        assert!(
            !starts.load(Ordering::Relaxed),
            "a second worker was spawned over a running one",
        );
    }
}
