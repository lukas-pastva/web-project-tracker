import React, { useState, useEffect, useRef } from "react";

/* ─── helpers ────────────────────────────────────────────────────── */
const HALF_HOUR_MS = 30 * 60 * 1000;
const roundDown = (d) =>
  new Date(Math.floor(d.getTime() / HALF_HOUR_MS) * HALF_HOUR_MS);
const roundUp = (d) =>
  new Date(Math.ceil(d.getTime() / HALF_HOUR_MS) * HALF_HOUR_MS);

/* date ↔︎ input conversions */
const toInput = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
const fromInput = (val) => new Date(val).toISOString();

/* ─── component ──────────────────────────────────────────────────── */
export default function TaskForm({ projectId, onSave, customers, tasks }) {
  /* ── state ──────────────────────────────────────────────────── */
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  /* when panel opens, focus the first input */
  const firstInputRef = useRef(null);

  /* pre-populate start/end once */
  useEffect(() => {
    const now = new Date();
    setStart(toInput(roundDown(now)));
    setEnd(toInput(roundUp(now)));
  }, []);

  /* auto-fill name/notes when existing customer chosen */
  useEffect(() => {
    if (!customer) return;
    const last = [...tasks].reverse().find((t) => t.customer === customer);
    if (last) {
      if (!name) setName(last.name);
      if (!notes) setNotes(last.notes ?? "");
    }
  }, [customer, tasks, name, notes]);

  /* ── handlers ───────────────────────────────────────────────── */
  async function submit(e) {
    e.preventDefault();
    await onSave(projectId, {
      name,
      customer,
      startedAt: fromInput(start),
      finishedAt: end ? fromInput(end) : null,
      notes: notes.trim() || null,
    });

    /* reset + close panel */
    setName("");
    setCustomer("");
    setNotes("");
    const now = new Date();
    setStart(toInput(roundDown(now)));
    setEnd(toInput(roundUp(now)));
    e.target.closest("details")?.removeAttribute("open");
  }

  /* ── UI ─────────────────────────────────────────────────────── */
  return (
    <details>
      <summary
        style={{
          cursor: "pointer",
          fontWeight: 600,
          userSelect: "none",
          marginBottom: ".6rem",
        }}
        onClick={() => {
          /* focus first field when opened */
          setTimeout(() => firstInputRef.current?.focus(), 0);
        }}
      >
        ➕ Add new task
      </summary>

      <section className="card" style={{ maxWidth: 600 }}>
        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}
        >
          <input
            ref={firstInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Task name"
            required
          />

          {/* customer with datalist suggestions */}
          <input
            list="customers"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Customer"
          />
          <datalist id="customers">
            {customers.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <label>
            Start&nbsp;
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
            />
          </label>

          <label>
            End&nbsp;
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>

          {/* taller textarea */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="Notes (Markdown supported)"
          />

          <button className="btn" disabled={!name || !start}>
            Save
          </button>
        </form>
      </section>
    </details>
  );
}
