import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./engine/comments.js";
import "./engine/prototype.js";
import { App } from "./App";

declare global {
  interface Window {
    __PROTOTYPE_START__?: () => boolean;
  }
}

const container = document.getElementById("root");
if (!container) throw new Error("Brak #root w index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
