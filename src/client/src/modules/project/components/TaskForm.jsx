import React, { useState, useEffect } from "react";

/* ─── helpers ────────────────────────────────────────────────────── */
const HALF_HOUR_MS = 30 * 60 * 1000;

function roundDownToHalfHour(d) {
  return new Date(Math.floor(d.getTime() / HALF_HOUR_MS) * HALF_HOUR_MS);
}
function roundUpToHalfHour(d) {
  return new Date(Math.ceil(d.getTime() / HALF_HOUR_MS) * HALF_HOUR_MS);
}
/* convert Date → `yyyy-mm-ddThh:mm` local-time string expected by
   <input type="datetime-local"> (timezone-offset neutral) */
function toLocalInputValue(date) {
  const z = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
              .toISOString();
  return z.slice(0, 16);
}

export default function TaskForm({ projectId, onSave }) {
  /* ─── state ───────────────────────────────────────────────────── */
  const [name,     setName]     = useState("");
  const [customer, setCustomer] = useState("");
  const [start,    setStart]    = useState("");
  const [end,      setEnd]      = useState("");
  const [notes,    setNotes]    = useState("");

  /* pre-populate start/end when the form first renders */
  useEffect(() => {
    const now = new Date();
    setStart(toLocalInputValue(roundDownToHalfHour(now)));
    setEnd  (toLocalInputValue(roundUpToHalfHour(now)));
  }, []);

  /* ─── handlers ─────────────────────────────────────────────────── */
  async function submit(e) {
    e.preventDefault();
    await onSave(projectId, {
      name,
      customer,
      startedAt : start,
      finishedAt: end || null,
      notes     : notes.trim() || null,
    });
    /* reset fields */
    setName(""); setCustomer(""); setNotes("");
    /* keep start/end anchored to “now” after save */
    const now = new Date();
    setStart(toLocalInputValue(roundDownToHalfHour(now)));
    setEnd  (toLocalInputValue(roundUpToHalfHour(now)));
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
        <input
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="Customer"
        />

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

        {/* Markdown-enabled notes */}
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
