import React, { useState } from "react";

export default function WorkTable({ rows, onUpdate, onDelete }) {
  const [editId, setEditId] = useState(null);
  const [form,   setForm]   = useState({});

  const beginEdit = (w) => {
    setEditId(w.id);
    setForm({ ...w, timeSpent: w.timeSpent ?? "", tracked: w.tracked });
  };

  async function save() {
    await onUpdate(editId, {
      ...form,
      timeSpent: form.timeSpent ? Number(form.timeSpent) : null,
      tracked  : !!form.tracked,
    });
    setEditId(null);
  }

  /* quick toggle from list (no modal) */
  const toggleTracked = (w) =>
    onUpdate(w.id, { tracked: !w.tracked });

  return (
    <section className="card">
      <h3>Work items</h3>

      {rows.length === 0 ? (
        <p><em>No work items yet</em></p>
      ) : (
        <table className="tasks-table">
          <thead>
            <tr>
              <th style={{ width: 1 }}>✓</th>
              <th>Partner</th><th>Task</th><th>Ticket ID</th>
              <th>Time&nbsp;(min)</th><th>Description</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(w => editId===w.id ? (
              /* ─── inline edit row ─── */
              <tr key={w.id}>
                <td style={{ textAlign:"center" }}>
                  <input type="checkbox"
                         checked={form.tracked}
                         onChange={e=>setForm({...form,tracked:e.target.checked})}/>
                </td>
                <td><input value={form.partner}
                           onChange={e=>setForm({...form,partner:e.target.value})}
                           required/></td>
                <td><input value={form.task}
                           onChange={e=>setForm({...form,task:e.target.value})}
                           required/></td>
                <td><input value={form.ticketId||""}
                           onChange={e=>setForm({...form,ticketId:e.target.value})}/></td>
                <td><input type="number" min="0" value={form.timeSpent}
                           onChange={e=>setForm({...form,timeSpent:e.target.value})}/></td>
                <td><textarea rows={4} value={form.description||""}
                              onChange={e=>setForm({...form,description:e.target.value})}/></td>
                <td style={{whiteSpace:"nowrap"}}>
                  <button className="btn"       onClick={save}>Save</button>{" "}
                  <button className="btn-light" onClick={()=>setEditId(null)}>Cancel</button>
                </td>
              </tr>
            ) : (
              /* ─── normal row ─── */
              <tr key={w.id}>
                <td style={{ textAlign:"center" }}>
                  <button className="btn-icon"
                          title={w.tracked ? "Unmark as tracked" : "Mark as tracked"}
                          onClick={()=>toggleTracked(w)}>
                    {w.tracked ? "✓" : "○"}
                  </button>
                </td>
                <td>{w.partner}</td>
                <td>{w.task}</td>
                <td>{w.ticketId || "—"}</td>
                <td>{w.timeSpent ?? "—"}</td>
                <td>{w.description
                      ? w.description.slice(0,60)+(w.description.length>60?"…":"")
                      : "—"}</td>
                <td style={{whiteSpace:"nowrap"}}>
                  <button className="btn-light" onClick={()=>beginEdit(w)}>Edit</button>{" "}
                  <button className="btn-light" onClick={()=>onDelete(w.id)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
