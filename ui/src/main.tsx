import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("index.html is missing #root");
}

// The locale is initialised inside App, once settings have loaded, so the first
// painted text is already in the user's own language. Doing it here would mean
// guessing before we know what they chose.
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
