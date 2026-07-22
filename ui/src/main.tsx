import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";

import App from "./App";
import { Projector } from "./panels/Projector";
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
