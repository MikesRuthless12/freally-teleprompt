//! First-run EULA acceptance gate (FT-05).
//!
//! The full agreement lives in `EULA.md` (embedded here at build time so the
//! text the user accepts is exactly the text this build ships). The app cannot
//! be used until the user accepts the current [`EULA_VERSION`]; acceptance is
//! persisted in settings. Bump [`EULA_VERSION`] whenever `EULA.md` changes in a
//! way that requires re-acceptance — a stale accepted version re-shows the gate.
//!
//! Acceptance goes through [`crate::settings::SettingsStore::accept_eula`], the
//! only writer of the field. See that module's docs for why `settings_set` must
//! never be able to touch it.

use serde::Serialize;
use tauri::State;

use crate::settings::SettingsStore;

/// The agreement text, embedded from the repo-root `EULA.md`.
pub const EULA_TEXT: &str = include_str!("../../EULA.md");

/// The current EULA version. Bump on any material `EULA.md` change so users are
/// asked to accept the new terms. (Date-stamped for a human-readable audit.)
pub const EULA_VERSION: &str = "2026-07-21";

/// What the UI needs to render + gate on the EULA.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EulaStatus {
    /// The current EULA version.
    pub version: String,
    /// The full agreement text (markdown).
    pub text: String,
    /// Whether the user has already accepted this exact version.
    pub accepted: bool,
}

/// The EULA status: the text + whether the current version is already accepted.
#[tauri::command]
pub fn eula_status(store: State<'_, SettingsStore>) -> EulaStatus {
    let accepted = store.get().accepted_eula_version.as_deref() == Some(EULA_VERSION);
    EulaStatus {
        version: EULA_VERSION.to_string(),
        text: EULA_TEXT.to_string(),
        accepted,
    }
}

/// Record acceptance of the current EULA version (persisted). Idempotent.
#[tauri::command]
pub fn eula_accept(store: State<'_, SettingsStore>) -> Result<(), String> {
    store
        .accept_eula(EULA_VERSION)
        .map_err(|err| format!("could not record EULA acceptance: {err}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn eula_text_is_embedded_and_versioned() {
        assert!(EULA_TEXT.contains("End User License Agreement"));
        // A material clause the acceptance is meant to bind the user to.
        assert!(EULA_TEXT.contains("solely responsible"));
        assert_eq!(EULA_VERSION.split('-').count(), 3, "date-stamped version");
    }

    /// The product's central promise. If a future edit quietly drops it, the
    /// text users accept would no longer say it — so pin it here.
    #[test]
    fn eula_states_there_is_no_ai() {
        assert!(EULA_TEXT.contains("no artificial-intelligence or machine-learning"));
    }
}
