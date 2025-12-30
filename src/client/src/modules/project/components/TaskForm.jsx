import React, { useState, useEffect, useRef } from "react";
import api from "../api.js";

/* ───────── time helpers ───────── */
const HALF_HOUR = 30 * 60 * 1000;
const floor30   = d => new Date(Math.floor(d.getTime() / HALF_HOUR) * HALF_HOUR);
const ceil30    = d => new Date(Math.ceil (d.getTime() / HALF_HOUR) * HALF_HOUR);
const toInput   = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                       .toISOString()
                       .slice(0, 16);
const fromInput = v => new Date(v).toISOString();

/* ───────── clipboard helpers ───────── */
const imageExt = /\.(png|jpe?g|gif|bmp|webp|avif)$/i;
const isImage  = file =>
  file.type.startsWith("image/") && imageExt.test(file.name || "");

/* paste → upload → insert Markdown */
async function pasteFiles(e, append) {
  const items = Array.from(e.clipboardData?.items || [])
                      .filter(it => it.kind === "file");
  if (!items.length) return;
  e.preventDefault();

  const files        = await Promise.all(items.map(it => it.getAsFile()));
  const preferLinks  = files.some(f => !isImage(f));      // non-image present?

  for (const file of files) {
    if (!file) continue;
    const { url } = await api.uploadImage(file).catch(() => ({}));
    if (!url) continue;

    const md = !preferLinks && isImage(file)
      ? `\n![${file.name}](${url})\n`
      : `\n[${file.name}](${url})\n`;

    append(md);
  }
}

/* ──────────────────────────────────────────────────────────────── */
export default function TaskForm({ projectId, onSave, customers, tasks }) {
  const [name,     setName]   = useState("");
  const [customer, setCust]   = useState("");
  const [start,    setStart]  = useState("");
  const [end,      setEnd]    = useState("");
  const [notes,    setNotes]  = useState("");

  const firstRef = useRef(null);

  /* defaults */
  useEffect(() => {
    const now = new Date();
    setStart(toInput(floor30(now)));
    setEnd  (toInput(ceil30(now)));
  }, []);

  /* prefill customer with last used value (if empty) */
  useEffect(() => {
    if (customer) return;
    const lastWithCustomer = [...tasks].reverse().find(t => (t.customer ?? "").trim());
    if (lastWithCustomer?.customer) setCust(lastWithCustomer.customer);
  }, [tasks, customer]);

  /* autofill on customer */
  useEffect(() => {
    if (!customer) return;
    const last = [...tasks].reverse().find(t => t.customer === customer);
    if (last) {
      if (!name)  setName(last.name);
      if (!notes) setNotes(last.notes ?? "");
    }
  }, [customer, tasks, name, notes]);

  async function submit(e) {
    e.preventDefault();
    await onSave(projectId, {
      name,
      customer,
      startedAt  : fromInput(start),
      finishedAt : end ? fromInput(end) : null,
      notes      : notes.trim() || null,
    });
    /* reset form */
    setName(""); setCust(""); setNotes("");
    const now = new Date();
    setStart(toInput(floor30(now)));
    setEnd  (toInput(ceil30(now)));
    e.target.closest("details")?.removeAttribute("open");
  }

  return (
    <details className="task-form-details">
      <summary onClick={() => setTimeout(() => firstRef.current?.focus(), 0)}>
        + New Task
      </summary>

      <section className="card" style={{ maxWidth: 640, marginTop: "0.75rem" }}>
        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="task-name">Task Name</label>
              <input
                id="task-name"
                ref={firstRef}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter task name"
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="task-customer">Customer</label>
              <input
                id="task-customer"
                list="customers"
                value={customer}
                onChange={e => setCust(e.target.value)}
                placeholder="Select or enter"
              />
              <datalist id="customers">
                {customers.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task-start">Start Time</label>
              <input
                id="task-start"
                type="datetime-local"
                value={start}
                onChange={e => setStart(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="task-end">End Time</label>
              <input
                id="task-end"
                type="datetime-local"
                value={end}
                onChange={e => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="task-notes">Notes</label>
            <textarea
              id="task-notes"
              rows={10}
              placeholder="Add notes in Markdown. You can paste screenshots or files directly."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onPaste={e => pasteFiles(e, md => setNotes(n => n + md))}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button className="btn" disabled={!name || !start}>
              Save Task
            </button>
          </div>
        </form>
      </section>
    </details>
  );
}
