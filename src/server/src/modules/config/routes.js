import { Router } from "express";
import AppConfig   from "./model.js";

const r = Router();

/* helper: always return the single row (create if missing) */
async function row() {
  let cfg = await AppConfig.findByPk(1);
  if (!cfg) cfg = await AppConfig.create({ id: 1 });
  return cfg;
}

/* ─── routes ────────────────────────────────────────────────────── */
r.get("/api/config", async (_req, res) => res.json(await row()));

r.put("/api/config", async (req, res) => {
  const { theme, mode, appTitle } = req.body;
  const cfg = await row();
  await cfg.update({
    theme   : ["technical", "jira-like"].includes(theme) ? theme : cfg.theme,
    mode    : ["light", "dark", "auto"].includes(mode)   ? mode  : cfg.mode,
    appTitle: typeof appTitle === "string" && appTitle.trim()
                ? appTitle.trim()
                : cfg.appTitle,
  });
  res.json(cfg);
});

export default r;
