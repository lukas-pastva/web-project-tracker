import express          from "express";
import cors             from "cors";
import path             from "path";
import fs               from "fs";
import { fileURLToPath } from "url";
import dotenv           from "dotenv";
import multer           from "multer";
import archiver         from "archiver";

import projectRoutes  from "./modules/project/routes.js";
import { syncProject } from "./modules/project/seed.js";

import configRoutes   from "./modules/config/routes.js";
import { syncConfig } from "./modules/config/seed.js";

import { Task } from "./modules/project/model.js";

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

/* ─── upload endpoint (PNG/JPEG) ───────────────────────────────── */
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

/* ─── NEW: download-images endpoints ───────────────────────────── */

/* helper – extract “/uploads/…” URLs from markdown notes */
function uploadsInMarkdown(md = "") {
  const re   = /\/uploads\/([^)\s]+)/g;
  const out  = new Set();
  let m;
  while ((m = re.exec(md)) !== null) out.add(m[1]);
  return out;
}

/* ZIP all image files and stream the archive */
function streamZip(res, files, zipName) {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${zipName}"`
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    console.error(err);
    res.status(500).end();
  });
  archive.pipe(res);

  files.forEach((f) => {
    const fp = path.join(uploadDir, f);
    if (fs.existsSync(fp)) archive.file(fp, { name: f });
  });

  archive.finalize();
}

/* per-project images */
app.get("/api/projects/:pid/images.zip", async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where      : { projectId: req.params.pid },
      attributes : ["notes"],
    });

    const files = new Set();
    tasks.forEach((t) => uploadsInMarkdown(t.notes).forEach((f) => files.add(f)));

    if (files.size === 0)
      return res.status(404).json({ error: "No images for this project" });

    streamZip(res, [...files], `project-${req.params.pid}-images.zip`);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ALL images across the app */
app.get("/api/images.zip", (_req, res) => {
  try {
    const files = fs
      .readdirSync(uploadDir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);

    if (files.length === 0)
      return res.status(404).json({ error: "No images found" });

    streamZip(res, files, "all-images.zip");
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── API routes ───────────────────────────────────────────────── */
app.use(projectRoutes);
app.use(configRoutes);

/* serve SPA */
app.use(express.static(path.join(__dirname, "../public")));
app.get("*", (_req, res) =>
  res.sendFile(path.join(__dirname, "../public/index.html"))
);

app.listen(port, () => console.log(`Web-Project listening on ${port}`));
