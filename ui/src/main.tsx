import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";

import App from "./App";
import { Projector } from "./panels/Projector";

// Noto, bundled — every script the app's 18 languages need, so no language ever
// renders as tofu regardless of what the machine has installed. These are the
// VARIABLE builds: one file per subset covering weights 100–900, which is what
// makes the appearance picker's 300–900 range real rather than synthesised.
//
// Each package's CSS carries `unicode-range` per subset, so a reader working in
// English only ever loads the ~430 KB Latin/Cyrillic files; the CJK megabytes
// sit in the installer and are never touched. Licensed under the SIL Open Font
// License 1.1 — see THIRD-PARTY.md, which ships with the app.
import "@fontsource-variable/noto-sans";
import "@fontsource-variable/noto-sans-arabic";
import "@fontsource-variable/noto-sans-devanagari";
import "@fontsource-variable/noto-sans-jp";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource-variable/noto-sans-sc";

import "./styles/global.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("index.html is missing #root");
}

/** The projector window's label — mirror of Rust `projector::PROJECTOR_LABEL`. */
const PROJECTOR_LABEL = "projector";

/**
 * Which surface is this window? (FT-12)
 *
 * The projector is a second window loading the same bundle, and what it shows is
 * decided by its **label**. Read synchronously from the metadata Tauri injects,
 * not asked for over IPC, so the right surface is chosen on the very first
 * render — an IPC round-trip would put a flash of the operator shell on the
 * talent's screen.
 *
 * Outside Tauri (the Playwright gallery, a dev server) there is no metadata to
 * read and this throws; the app shell is the right answer there.
 */
function isProjectorWindow(): boolean {
  try {
    return getCurrentWindow().label === PROJECTOR_LABEL;
  } catch {
    return false;
  }
}

// The locale is initialised inside App, once settings have loaded, so the first
// painted text is already in the user's own language. Doing it here would mean
// guessing before we know what they chose.
createRoot(root).render(<StrictMode>{isProjectorWindow() ? <Projector /> : <App />}</StrictMode>);
