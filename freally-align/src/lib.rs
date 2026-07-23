//! `freally-align` — the script alignment layer (FT-34).
//!
//! Speech recognition, however good, produces a noisy stream of words. Turning
//! that into a teleprompter that *follows the reader* is a separate, deterministic
//! problem: given the **known script**, decide which visible-character offset the
//! reader is at. The competitive research is blunt that this layer — not the
//! recogniser — is what users judge, and that the failures are always the same
//! three. This crate is built against them directly:
//!
//! * **No false pause at punctuation.** A comma is not a stop. Punctuation is
//!   stripped at tokenisation, so it never becomes a word and can never hold the
//!   scroll; the offset simply advances to the next spoken word.
//! * **No multi-paragraph jump on a single misheard word.** A single word can
//!   only move the position within a bounded search window (a line or two). A
//!   larger move requires several consecutive words to agree (a re-anchor), so a
//!   lone coincidental match far away is ignored, not obeyed.
//! * **Survive silence.** State persists. No input means no change — the position
//!   and confidence hold, and reading resumes from where it was left.
//!
//! It also handles skipped lines (jump forward within the window, or re-anchor
//! past it), ad-libs and stumbles (a non-matching word holds; a fuzzy match still
//! counts), and repeated phrases (the nearest-ahead occurrence wins). It **never
//! jumps backward without strong evidence** — it holds rather than guess.
//!
//! Everything is pure logic with no audio in the loop, so it is unit-tested
//! against recorded transcripts (sequences of words). [`Aligner::observe`] takes
//! one recognised word and returns the updated [`Observation`]; the caller drives
//! the scroller's offset from it (FT-35).
#![forbid(unsafe_code)]

mod align;
mod lev;
mod script;

pub use align::{AlignConfig, Aligner, Observation};
pub use script::{Script, ScriptWord};
