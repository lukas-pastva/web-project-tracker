import express  from "express";
import cors     from "cors";
import path     from "path";
import { fileURLToPath } from "url";
import dotenv   from "dotenv";

import projectRoutes  from "./modules/project/routes.js";
import { syncProject } from "./modules/project/seed.js";

/* ─── config module ─────────────────────────────────────────────── */
import configRoutes   from "./modules/config/routes.js";
import { syncConfig } from "./modules/config/seed.js";

/* ─── bootstrap ─────────────────────────────────────────────────── */
dotenv.config();
await Promise.all([syncProject(), syncConfig()]);

const app  = express();
const port = process.env.PORT || 8080;

/* middleware */
app.use(cors());
app.use(express.json());

/* API routes */
app.use(projectRoutes);
app.use(configRoutes);

/* static SPA */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "../public")));
app.get("*", (_req, res) =>
  res.sendFile(path.join(__dirname, "../public/index.html"))
);

app.listen(port, () => console.log(`Web-Baby listening on ${port}`));
