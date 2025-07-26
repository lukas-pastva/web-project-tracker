import { Router } from "express";
import { Op } from "sequelize";
import { Project, Task, Contact } from "./model.js";

const r = Router();

/* ───────────────────────── projects ────────────────────────────── */
r.get("/api/projects", async (_req, res) =>
  res.json(await Project.findAll({ order: [["createdAt", "ASC"]] }))
);

r.post("/api/projects", async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "name required" });
  try {
    res.json(await Project.create({ name: name.trim() }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

r.put("/api/projects/:id", async (req, res) => {
  const p = await Project.findByPk(req.params.id);
  if (!p) return res.status(404).end();

  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "name required" });

  try {
    await p.update({ name: name.trim() });
    res.json(p);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* delete project – tasks & contacts cascade automatically */
r.delete("/api/projects/:id", async (req, res) => {
  const p = await Project.findByPk(req.params.id);
  if (!p) return res.status(404).end();
  await p.destroy();
  res.status(204).end();
});

/* ───────────────────────── tasks ───────────────────────────────── */
r.get("/api/projects/:pid/tasks", async (req, res) =>
  res.json(
    await Task.findAll({
      where: { projectId: req.params.pid },
      order: [["startedAt", "ASC"]],
    })
  )
);

r.post("/api/projects/:pid/tasks", async (req, res) => {
  const {
    name,
    customer,
    startedAt,
    finishedAt,
    notes,
    tracked = false,
  } = req.body;

  if (!name || !startedAt)
    return res.status(400).json({ error: "name & startedAt required" });

  res.json(
    await Task.create({
      projectId: req.params.pid,
      name,
      customer,
      startedAt,
      finishedAt,
      notes,
      tracked: Boolean(tracked),
    })
  );
});

r.put("/api/tasks/:id", async (req, res) => {
  const t = await Task.findByPk(req.params.id);
  if (!t) return res.status(404).end();
  res.json(await t.update(req.body));
});

r.delete("/api/tasks/:id", async (req, res) => {
  const t = await Task.findByPk(req.params.id);
  if (!t) return res.status(404).end();
  await t.destroy();
  res.status(204).end();
});

/* ───────────────────────── task-specific contacts ─────────────── */
r.get("/api/tasks/:tid/contacts", async (req, res) =>
  res.json(
    await Contact.findAll({
      where: { taskId: req.params.tid },
      order: [["id", "ASC"]],
    })
  )
);

r.post("/api/tasks/:tid/contacts", async (req, res) => {
  const { name, email, position } = req.body;
  if (!name?.trim() || !email?.trim())
    return res.status(400).json({ error: "name & email required" });

  res.json(
    await Contact.create({
      taskId  : req.params.tid,
      name    : name.trim(),
      email   : email.trim(),
      position: position?.trim() || null,
    })
  );
});

r.put("/api/contacts/:cid", async (req, res) => {
  const c = await Contact.findByPk(req.params.cid);
  if (!c) return res.status(404).end();

  const { name, email, position } = req.body;
  if (!name?.trim() || !email?.trim())
    return res.status(400).json({ error: "name & email required" });

  res.json(
    await c.update({
      name    : name.trim(),
      email   : email.trim(),
      position: position?.trim() || null,
    })
  );
});

r.delete("/api/contacts/:cid", async (req, res) => {
  const c = await Contact.findByPk(req.params.cid);
  if (!c) return res.status(404).end();
  await c.destroy();
  res.status(204).end();
});

/* ───────────────────────── global contacts DB (NEW) ───────────── */
r.get("/api/contacts", async (req, res) => {
  const { name, email, position, project, customer } = req.query;

  /* LIKE filters only for provided fields */
  const like = (v) => ({ [Op.like]: `%${v}%` });
  const whereContact = {
    ...(name     ? { name     : like(name)     } : {}),
    ...(email    ? { email    : like(email)    } : {}),
    ...(position ? { position : like(position) } : {}),
  };

  const rows = await Contact.findAll({
    where: whereContact,
    include: [
      {
        model      : Task,
        attributes : ["customer"],
        where      : customer ? { customer: like(customer) } : {},
        include    : [
          {
            model      : Project,
            attributes : ["name"],
            where      : project ? { name: like(project) } : {},
          },
        ],
      },
    ],
    order: [["name", "ASC"]],
  });

  /* flatten for the frontend */
  res.json(
    rows.map((c) => ({
      id       : c.id,
      name     : c.name,
      email    : c.email,
      position : c.position,
      customer : c.task.customer,
      project  : c.task.project.name,
    }))
  );
});

export default r;
