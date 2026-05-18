import express           from "express";
import cors              from "cors";
import path              from "path";
import fs                from "fs";
import { fileURLToPath } from "url";
import dotenv            from "dotenv";
import multer            from "multer";
import archiver          from "archiver";
import ExcelJS           from "exceljs";

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
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

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
    }, `${task.id}-${(task.customer || "unknown").replace(/[^a-zA-Z0-9-_]/g, "_")}-${Date.now()}.zip`);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── project-level archive ────────────────────────────────────── */
/*  FIX #2 – images live **inside** their own "task-{id}/" folder   */
app.get("/api/projects/:pid/images.zip", async (req, res) => {
  console.log("🔥🔥🔥 HIT /api/projects/:pid/images.zip - pid:", req.params.pid);
  try {
    const project = await Project.findByPk(req.params.pid);
    if (!project)
      return res.status(404).json({ error: "Project not found" });

    const tasks = await Task.findAll({
      where   : { projectId: req.params.pid },
      include : [{ model: Contact, attributes: ["email", "name", "position"] }],
      order   : [["id", "ASC"]],
    });
    if (tasks.length === 0)
      return res.status(404).json({ error: "Project is empty" });

    const safeProjectName = (project.name || "unknown").replace(/[^a-zA-Z0-9-_]/g, "_");
    let hasAnything = false;

    console.log("📦 Starting ZIP export for project", req.params.pid, project.name);
    console.log("📦 Found tasks:", tasks.map(t => ({ id: t.id, customer: t.customer, name: t.name })));

    streamZip(res, (zip) => {
      tasks.forEach((t) => {
        const safeName = (t.customer || "unknown").replace(/[^a-zA-Z0-9-_]/g, "_");
        const pref = `${safeProjectName}-${t.id}-${safeName}`;
        console.log(`📦 Task ${t.id}: customer="${t.customer}", pref="${pref}"`);

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
    }, `project-${req.params.pid}-${Date.now()}.zip`);

    if (!hasAnything)
      return res.status(404).json({ error: "No assets for this project" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── global archive (all uploads + contacts) ─────────────────── */
app.get("/api/images.zip", async (_req, res) => {
  console.log("🔥🔥🔥 HIT /api/images.zip (global export)");
  try {
    const projects = await Project.findAll({
      include: [{
        model: Task,
        include: [{ model: Contact, attributes: ["email", "name", "position"] }],
      }],
      order: [["id", "ASC"], [Task, "id", "ASC"]],
    });

    if (projects.length === 0)
      return res.status(404).json({ error: "No projects found" });

    let hasAnything = false;

    streamZip(res, (zip) => {
      projects.forEach((project) => {
        const safeProjectName = (project.name || "unknown").replace(/[^a-zA-Z0-9-_]/g, "_");

        (project.tasks || []).forEach((t) => {
          const safeName = (t.customer || "unknown").replace(/[^a-zA-Z0-9-_]/g, "_");
          const pref = `${safeProjectName}-${t.id}-${safeName}`;
          console.log(`📦 Global export: project="${project.name}", task=${t.id}, pref="${pref}"`);

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

          /* images */
          uploadsInMarkdown(t.notes).forEach((f) => {
            hasAnything = true;
            appendImage(zip, f, pref);
          });
        });
      });
    }, `all-assets-${Date.now()}.zip`);

    if (!hasAnything)
      return res.status(404).json({ error: "No assets found" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* ─── Excel export (per project) ──────────────────────────────── */
app.get("/api/projects/:pid/export.xlsx", async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.pid);
    if (!project) return res.status(404).json({ error: "Project not found" });

    const tasks = await Task.findAll({
      where: { projectId: req.params.pid },
      order: [["startedAt", "ASC"]],
    });

    const showSubtotals = req.query.subtotals !== "0";

    const wb = new ExcelJS.Workbook();
    wb.creator = "Project Tracker";
    wb.created = new Date();

    const ws = wb.addWorksheet(project.name.slice(0, 31));

    /* ── colours ── */
    const accentFill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    const altFill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    const subtotalFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
    const totalFill    = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    const whiteFontBold = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const darkBold      = { bold: true, size: 11 };
    const thinBorder    = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    };

    /* ── columns ── */
    ws.columns = [
      { header: "Tracked",  key: "tracked",  width: 10 },
      { header: "Name",     key: "name",     width: 30 },
      { header: "Customer", key: "customer", width: 20 },
      { header: "Start",    key: "start",    width: 18 },
      { header: "End",      key: "end",      width: 18 },
      { header: "Duration", key: "duration", width: 14 },
      { header: "EUR",      key: "eur",      width: 12 },
      { header: "Notes",    key: "notes",    width: 40 },
    ];

    /* ── header style ── */
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = accentFill;
      cell.font = whiteFontBold;
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle" };
    });
    headerRow.height = 24;

    /* ── helpers ── */
    const fmtDur = (ms) =>
      ms == null ? "" : `${Math.floor(ms / 3_600_000)}h ${String(Math.floor(ms / 60_000) % 60).padStart(2, "0")}m`;
    const monthKey = (iso) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const fmtMonth = (key) =>
      new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en", { year: "numeric", month: "short" });

    /* ── month buckets ── */
    const monthMs  = new Map();
    const monthEur = new Map();
    for (const t of tasks) {
      if (!t.startedAt) continue;
      const mk = monthKey(t.startedAt);
      if (t.amountEur != null) {
        monthEur.set(mk, (monthEur.get(mk) || 0) + Number(t.amountEur));
      } else if (t.finishedAt) {
        monthMs.set(mk, (monthMs.get(mk) || 0) + (new Date(t.finishedAt) - new Date(t.startedAt)));
      }
    }

    /* ── data rows ── */
    let totalMs  = 0;
    let totalEur = 0;
    let rowIdx   = 1; // 1-based, row 1 is header

    for (let i = 0; i < tasks.length; i++) {
      const t  = tasks[i];
      const isEuro = t.amountEur != null;
      const durMs  = !isEuro && t.finishedAt ? new Date(t.finishedAt) - new Date(t.startedAt) : null;

      if (!isEuro && durMs) totalMs += durMs;
      if (isEuro) totalEur += Number(t.amountEur);

      const row = ws.addRow({
        tracked:  t.tracked ? "Yes" : "",
        name:     t.name,
        customer: t.customer || "",
        start:    t.startedAt ? new Date(t.startedAt) : "",
        end:      !isEuro && t.finishedAt ? new Date(t.finishedAt) : "",
        duration: isEuro ? "" : (durMs ? fmtDur(durMs) : ""),
        eur:      isEuro ? Number(t.amountEur) : "",
        notes:    t.notes || "",
      });
      rowIdx++;

      /* date format */
      if (t.startedAt) row.getCell("start").numFmt = isEuro ? "DD/MM/YYYY" : "DD/MM/YYYY HH:mm";
      if (!isEuro && t.finishedAt) row.getCell("end").numFmt = "DD/MM/YYYY HH:mm";
      if (isEuro) row.getCell("eur").numFmt = '#,##0.00 "€"';

      /* alternating rows */
      const isAlt = rowIdx % 2 === 0;
      row.eachCell((cell) => {
        if (isAlt) cell.fill = altFill;
        cell.border = thinBorder;
        cell.alignment = { vertical: "middle", wrapText: cell.col === 8 };
      });

      /* month subtotal row */
      const thisMonth = t.startedAt ? monthKey(t.startedAt) : null;
      const nextMonth = i + 1 < tasks.length && tasks[i + 1].startedAt ? monthKey(tasks[i + 1].startedAt) : null;

      if (showSubtotals && thisMonth && thisMonth !== nextMonth) {
        const subRow = ws.addRow({
          tracked: "",
          name: "",
          customer: "",
          start: "",
          end: `${fmtMonth(thisMonth)} subtotal`,
          duration: fmtDur(monthMs.get(thisMonth) || 0),
          eur: monthEur.get(thisMonth) || "",
          notes: "",
        });
        rowIdx++;
        if (monthEur.get(thisMonth)) subRow.getCell("eur").numFmt = '#,##0.00 "€"';
        subRow.eachCell((cell) => {
          cell.fill = subtotalFill;
          cell.font = darkBold;
          cell.border = thinBorder;
          cell.alignment = { vertical: "middle" };
        });
      }
    }

    /* ── total row ── */
    const totRow = ws.addRow({
      tracked: "",
      name: "",
      customer: "",
      start: "",
      end: "TOTAL",
      duration: fmtDur(totalMs),
      eur: totalEur || "",
      notes: "",
    });
    if (totalEur) totRow.getCell("eur").numFmt = '#,##0.00 "€"';
    totRow.eachCell((cell) => {
      cell.fill = totalFill;
      cell.font = whiteFontBold;
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle" };
    });
    totRow.height = 26;

    /* ── autoFilter ── */
    ws.autoFilter = { from: "A1", to: `H${rowIdx + 1}` };

    /* ── freeze header ── */
    ws.views = [{ state: "frozen", ySplit: 1 }];

    /* ── send ── */
    const safeName = (project.name || "project").replace(/[^a-zA-Z0-9-_]/g, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.xlsx"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message });
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

