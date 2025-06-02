import { Router } from "express";
import { AppConfig } from "./model.js";
const r = Router();

async function row(){ let r=await AppConfig.findByPk(1); if(!r) r=await AppConfig.create({id:1}); return r; }

r.get("/api/config", async (_req,res)=>res.json(await row()));
r.put("/api/config", async (req,res)=>{
  const { theme, mode, appTitle } = req.body;
  const cfg = await row();
  await cfg.update({
    theme   : ["technical","jira-like"].includes(theme)?theme:cfg.theme,
    mode    : ["light","dark","auto"].includes(mode)?mode:cfg.mode,
    appTitle: typeof appTitle==="string" && appTitle.trim() ? appTitle.trim() : cfg.appTitle,
  });
  res.json(cfg);
});
export default r;
