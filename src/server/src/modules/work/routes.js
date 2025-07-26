import { Router } from "express";
import Work from "./model.js";

const r = Router();

/* ─── list all jobs ────────────────────────────────────────────── */
r.get("/api/work", async (_req, res) =>
  res.json(await Work.findAll({ order: [["createdAt", "ASC"]] }))
);

/* ─── create job ───────────────────────────────────────────────── */
r.post("/api/work", async (req, res) => {
  const { partner, task, description, ticketId, timeSpent, tracked = false } =
    req.body;

  if (!partner?.trim() || !task?.trim())
    return res.status(400).json({ error: "partner & task required" });

  res.json(
    await Work.create({
      partner    : partner.trim(),
      task       : task.trim(),
      description: description?.trim() || null,
      ticketId   : ticketId?.trim() || null,
      timeSpent  : Number(timeSpent) || null,
      tracked    : Boolean(tracked),
    })
  );
});

/* ─── update job ──────────────────────────────────────────────── */
r.put("/api/work/:id", async (req, res) => {
  const w = await Work.findByPk(req.params.id);
  if (!w) return res.status(404).end();
  res.json(await w.update(req.body));
});

/* ─── delete job ──────────────────────────────────────────────── */
r.delete("/api/work/:id", async (req, res) => {
  const w = await Work.findByPk(req.params.id);
  if (!w) return res.status(404).end();
  await w.destroy();
  res.status(204).end();
});

export default r;
