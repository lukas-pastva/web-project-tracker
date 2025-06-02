import React, { useState, useEffect } from "react";

/* ─── helpers ────────────────────────────────────────────────────── */
const HALF_HOUR_MS = 30 * 60 * 1000;
const roundDown = (d) =>
  new Date(Math.floor(d.getTime() / HALF_HOUR_MS) * HALF_HOUR_MS);
const roundUp = (d) =>
  new Date(Math.ceil(d.getTime() / HALF_HOUR_MS) * HALF_HOUR_MS);

/* date ↔︎ input conversions */
const toInput = (date) => {
  const z = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
              .toISOString();
  return z.slice(0, 16);
};
const fromInput = (val) => new Date(val).toISOString();

export default function TaskForm({ projectId, onSave, customers, tasks }) {
  /* ─── state ───────────────────────────────────────────────────── */
  const [name,     setName]     = useState("");
  const [customer, setCustomer] = useState("");
  const [start,    setStart]    = useState("");
  const [end,      setEnd]      = useState("");
  const [notes,    setNotes]    = useState("");

  /* pre-populate start/end once */
  useEffect(() => {
    const now = new Date();
    setStart(toInput(roundDown(now)));
    setEnd  (toInput(roundUp(now)));
  }, []);

  /* auto-fill name/notes when existing customer is chosen */
  useEffect(() => {
    if (!customer) return;
    const last = [...tasks].reverse().find(t => t.customer === customer);
    if (last) {
      if (!name)  setName(last.name);
      if (!notes) setNotes(last.notes ?? "");
    }
  }, [customer, tasks]); // runs when customer changes or tasks list updates

  /* ─── handlers ─────────────────────────────────────────────────── */
  async function submit(e) {
    e.preventDefault();
    await onSave(projectId, {
      name,
      customer,
      startedAt : fromInput(start),
      finishedAt: end ? fromInput(end) : null,
      notes     : notes.trim() || null,
    });
    /* reset state */
    setName(""); setCustomer(""); setNotes("");
    const now = new Date();
    setStart(toInput(roundDown(now)));
    setEnd  (toInput(roundUp(now)));
  }

  /* ─── UI ───────────────────────────────────────────────────────── */
  return (
    <section className="card" style={{ maxWidth: 600 }}>
      <h3>Add task</h3>
      <form
        onSubmit={submit}
        style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}
      >
        <input
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

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Notes (Markdown supported)"
        />

        <button className="btn" disabled={!name || !start}>
          Save
        </button>
      </form>
    </section>
  );
}
