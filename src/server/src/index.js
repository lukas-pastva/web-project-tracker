import express  from "express";
import cors     from "cors";
import path     from "path";
import fs       from "fs";
import { fileURLToPath } from "url";
import dotenv   from "dotenv";
import multer   from "multer";

import projectRoutes  from "./modules/project/routes.js";
import { syncProject } from "./modules/project/seed.js";

/* config module */
import configRoutes   from "./modules/config/routes.js";
import { syncConfig } from "./modules/config/seed.js";

/* ─── bootstrap ────────────────────────────────────────────────── */
dotenv.config();
await Promise.all([syncProject(), syncConfig()]);

const app  = express();
const port = process.env.PORT || 8080;

/* middleware */
app.use(cors());
app.use(express.json());

/* ─── screenshots upload dir ───────────────────────────────────── */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.SCREENSHOT_DIR
  ? path.resolve(process.env.SCREENSHOT_DIR)
  : path.join(__dirname, "../uploads");

console.log("🖼  Upload dir:", uploadDir);

fs.mkdirSync(uploadDir, { recursive: true });

/* static access */
app.use("/uploads", express.static(uploadDir));

/* upload endpoint (PNG/JPEG) */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename   : (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".png");
    cb(null, `shot-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) =>
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image uploads allowed"), false),
});

app.post("/api/uploads", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

/* API routes */
app.use(projectRoutes);
app.use(configRoutes);

/* serve SPA */
app.use(express.static(path.join(__dirname, "../public")));
app.get("*", (_req, res) =>
  res.sendFile(path.join(__dirname, "../public/index.html"))
);

app.listen(port, () => console.log(`Web-Project listening on ${port}`));
