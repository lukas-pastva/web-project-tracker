import React, { useState } from "react";

export default function TaskForm({ projectId, onSave }) {
  const [name,     setName]     = useState("");
  const [customer, setCustomer] = useState("");
  const [start,    setStart]    = useState("");
  const [end,      setEnd]      = useState("");

  async function submit(e) {
    e.preventDefault();
    await onSave(projectId, {
      name,
      customer,
      startedAt : start,
      finishedAt: end || null,
    });
    setName(""); setCustomer(""); setStart(""); setEnd("");
  }

  return (
    <section className="card" style={{ maxWidth: 600 }}>
      <h3>Add task</h3>
      <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
        <input  value={name}     onChange={e=>setName(e.target.value)}     placeholder="Task name" required />
        <input  value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Customer" />
        <label>Start&nbsp;
          <input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} required />
        </label>
        <label>End&nbsp;
          <input type="datetime-local" value={end}   onChange={e=>setEnd(e.target.value)} />
        </label>
        <button className="btn" disabled={!name || !start}>Save</button>
      </form>
    </section>
  );
}
