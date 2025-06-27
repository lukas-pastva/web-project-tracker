import React, { useState } from "react";

export default function WorkTable({ rows, onUpdate, onDelete }) {
  const [editId, setEditId] = useState(null);
  const [form,   setForm]   = useState({});

  const beginEdit = (w) => {
    setEditId(w.id);
    setForm({ ...w, timeSpent: w.timeSpent ?? "" });
  };

  async function save() {
    await onUpdate(editId, { ...form, timeSpent: form.timeSpent ? Number(form.timeSpent) : null });
    setEditId(null);
  }

  return (
    <section className="card">
      <h3>Work items</h3>

      {rows.length === 0 ? (
        <p><em>No work items yet</em></p>
      ) : (
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Partner</th><th>Task</th><th>Ticket ID</th><th>Time (min)</th><th>Description</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(w => editId===w.id ? (
              <tr key={w.id}>
                <td><input value={form.partner}   onChange={e=>setForm({...form,partner:e.target.value})} required/></td>
                <td><input value={form.task}      onChange={e=>setForm({...form,task:e.target.value})}    required/></td>
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
              <tr key={w.id}>
                <td>{w.partner}</td>
                <td>{w.task}</td>
                <td>{w.ticketId || "—"}</td>
                <td>{w.timeSpent ?? "—"}</td>
                <td>{w.description ? w.description.slice(0,60)+(w.description.length>60?"…":"") : "—"}</td>
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
