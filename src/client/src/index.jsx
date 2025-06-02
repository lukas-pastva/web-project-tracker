import "./styles.css";
import React          from "react";
import { createRoot } from "react-dom/client";
import AppRoutes      from "./routes.jsx";
import {
  initConfig,
  loadConfig,
  effectiveTheme,
  effectiveMode,               // ← keep only these four
} from "./config.js";

/* bootstrap – pull config, apply theme/mode, then mount SPA */
(async () => {
  /* pulls (or creates) the single config row */
  await initConfig();

  const cfg = loadConfig();

  /* apply theme + light/dark mode */
  document.documentElement.setAttribute(
    "data-theme",
    effectiveTheme(cfg.theme || "technical"),
  );
  document.documentElement.setAttribute(
    "data-mode",
    effectiveMode(cfg.mode || "light"),
  );

  /* mount React app */
  createRoot(document.getElementById("root")).render(<AppRoutes />);
})();
