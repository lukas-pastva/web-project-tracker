import express           from "express";
import cors              from "cors";
import path              from "path";
import fs                from "fs";
import { fileURLToPath } from "url";
import dotenv            from "dotenv";
import multer            from "multer";
import archiver          from "archiver";

import projectRoutes   from "./modules/project/routes.js";
import { syncProject } from "./modules/project/seed.js";

import configRoutes    from "./modules/config/routes.js";
import { syncConfig }  from "./modules/config/seed.js";

import { Task, Contact, Project } from "./modules/project/model.js";

dotenv.config();

/* ensure DB tables exist */
await Promise.all([syncProject(), syncConfig()]);

const app  = express();
const port = process.env.PORT || 8080;

/* middleware */
app.use(cors());
app.use(express.json());

/* ─── uploads dir (images **and** other files) ──────────────────── */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = process.env.SCREENSHOT_DIR
  ? path.resolve(process.env.SCREENSHOT_DIR)
  : path.join(__dirname, "../uploads");

console.log("📂  Upload dir:", uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

/* static access */
app.use("/uploads", express.static(uploadDir));

/* ─── single file-upload endpoint (no type restriction now) ────── */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename   : (_req, file, cb) => {
    const ts  = Date.now();
    const ext = path.extname(file.originalname || "");
    cb(null, `upload-${ts}${ext}`);
  },
});

/* accept ANY file – size limits can be added via “limits” if needed */
const upload = multer({ storage });

app.post("/api/uploads", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname });
});

/* ─── helpers (unchanged) ───────────────────────────────────────── */
function uploadsInMarkdown(md = "") {
  const urls = new Set();
  const re   = /\/uploads\/([^)\s]+)/g;
  let m;
  while ((m = re.exec(md)) !== null) urls.add(m[1]);
  return urls;
}

function csv(rows, headers) {
  const esc = (v = "") => `"${String(v).replace(/"/g, '""')}"`;
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

function streamZip(res, pushFn, zipName) {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    console.error(err);
    res.status(500).end();
  });
  archive.pipe(res);

  pushFn(archive);
  archive.finalize();
}

function appendImage(archive, fname, prefix = "") {
  const fp = path.join(uploadDir, fname);
  if (!fs.existsSync(fp)) return;
  const zipName = prefix ? path.posix.join(prefix, fname) : fname;
  archive.file(fp, { name: zipName });
}


/* ─── task-level archive ───────────────────────────────────────── */
app.get("/api/tasks/:tid/images.zip", async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.tid, {
      include: [{ model: Contact, attributes: ["email", "name", "position"] }],
    });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const imgFiles = [...uploadsInMarkdown(task.notes)];
    if (imgFiles.length === 0 && !task.notes && task.contacts.length === 0)
      return res.status(404).json({ error: "No assets for this task" });

    streamZip(res, (zip) => {
      /* images */
      imgFiles.forEach((f) => appendImage(zip, f));

      /* notes */
      if (task.notes) zip.append(task.notes, { name: "notes.md" });

      /* contacts */
      if (task.contacts.length) {
        const rows = task.contacts.map((c) => [
          c.email,
          c.name,
          c.position || "",
        ]);
        zip.append(
          csv(rows, ["email", "name", "position"]),
          { name: "contacts.csv" }
        );
      }
    }, `${task.id}-${(task.customer || "unknown").replace(/[^a-zA-Z0-9-_]/g, "_")}-assets.zip`);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── project-level archive ────────────────────────────────────── */
/*  FIX #2 – images live **inside** their own “task-{id}/” folder   */
app.get("/api/projects/:pid/images.zip", async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where   : { projectId: req.params.pid },
      include : [{ model: Contact, attributes: ["email", "name", "position"] }],
      order   : [["id", "ASC"]],
    });
    if (tasks.length === 0)
      return res.status(404).json({ error: "Project not found or empty" });

    let hasAnything = false;

    streamZip(res, (zip) => {
      tasks.forEach((t) => {
        const safeName = (t.customer || "unknown").replace(/[^a-zA-Z0-9-_]/g, "_");
        const pref = `${t.id}-${safeName}`;

        /* notes */
        if (t.notes) {
          hasAnything = true;
          zip.append(t.notes, { name: `${pref}/notes.md` });
        }

        /* contacts */
        if (t.contacts.length) {
          hasAnything = true;
          const rows = t.contacts.map((c) => [
            c.email,
            c.name,
            c.position || "",
          ]);
          zip.append(
            csv(rows, ["email", "name", "position"]),
            { name: `${pref}/contacts.csv` }
          );
        }

        /* images – now stored in the same task folder */
        uploadsInMarkdown(t.notes).forEach((f) => {
          hasAnything = true;
          appendImage(zip, f, pref);            // 👈 prefix keeps them nested
        });
      });
    }, `project-${req.params.pid}-assets.zip`);

    if (!hasAnything)
      return res.status(404).json({ error: "No assets for this project" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── global archive (all uploads + contacts) ─────────────────── */
app.get("/api/images.zip", async (_req, res) => {
  try {
    const imgFiles = fs
      .readdirSync(uploadDir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);

    const contacts = await Contact.findAll({
      include: [
        {
          model      : Task,
          include    : [{ model: Project }],
        },
      ],
    });

    if (imgFiles.length === 0 && contacts.length === 0)
      return res.status(404).json({ error: "No assets found" });

    streamZip(res, (zip) => {
      imgFiles.forEach((f) => appendImage(zip, f));   // images really included

      if (contacts.length) {
        const rows = contacts.map((c) => [
          c.email,
          c.name,
          c.position || "",
          c.task?.customer || "",
          c.task?.project?.name || "",
        ]);
        zip.append(
          csv(rows, ["email", "name", "position", "customer", "project"]),
          { name: "contacts.csv" }
        );
      }
    }, "all-assets.zip");
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── API routes & SPA fallback ────────────────────────────────── */
app.use(projectRoutes);
app.use(configRoutes);

app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), "../public")));
app.get("*", (_req, res) =>
  res.sendFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "../public/index.html"))
);

app.listen(port, () => console.log(`Web-Project listening on ${port}`));

