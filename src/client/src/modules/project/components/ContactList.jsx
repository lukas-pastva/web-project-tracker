import React, { useEffect, useState } from "react";
import { createPortal }              from "react-dom";
import api                           from "../api.js";

/* Helper: derive “Name Surname” from the local part of an e-mail. */
const nameFromEmail = (email = "") =>
  email
    .split("@")[0]
    .split(/[^a-zA-Z]+/g)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");

/**
 * Contact-manager modal for a single task.
 * Props:  { taskId:number, onClose:()=>void }
 */
export default function ContactList({ taskId, onClose }) {
  /* ─── data & UI state ──────────────────────────────────────── */
  const [rows,     setRows]     = useState([]);
  const [err,      setErr]      = useState("");
  const [form,     setForm]     = useState({ email:"", name:"", position:"" });
  const [delId,    setDelId]    = useState(null);          // confirmation

  /* ─── fetch helpers ────────────────────────────────────────── */
  const reload = () =>
    api.listContacts(taskId).then(setRows).catch(e => setErr(e.message));

  useEffect(reload, [taskId]);

  /* ─── CRUD helpers ─────────────────────────────────────────── */
  async function add(e) {
    e.preventDefault();
    const finalName = form.name.trim() || nameFromEmail(form.email.trim());

    await api.insertContact(taskId, {
      email   : form.email.trim(),
      name    : finalName,
      position: form.position.trim() || null,
    }).then(() => {
      setForm({ email:"", name:"", position:"" });
      reload();
    }).catch(e => setErr(e.message));
  }

  async function confirmDelete() {
    await api.deleteContact(delId).then(reload).catch(e => setErr(e.message));
    setDelId(null);
  }

  /* ─── modal markup (portal target) ─────────────────────────── */
  const modal = (
    <div
      className="modal-backdrop"
      onClick={(e) => { e.stopPropagation(); /* click outside ignored */ }}
    >
      <div
        className="modal-box"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()} /* keep clicks inside */
      >
        <h3 style={{ marginTop: 0 }}>Contacts</h3>

        {err && <p style={{ color:"#c00" }}>{err}</p>}

        {/* ─ table ─ */}
        {rows.length === 0 ? (
          <p><em>No contacts yet</em></p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Email</th><th>Name</th><th>Position</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{c.email}</td><td>{c.name}</td><td>{c.position || "—"}</td>
                  <td>
                    <button
                      className="btn-light"
                      onClick={() => setDelId(c.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ─ add new ─ */}
        <form
          onSubmit={add}
          style={{
            display:"flex", gap:".4rem", flexWrap:"wrap", marginTop:"1rem",
          }}
        >
          {/* e-mail first */}
          <input
            style={{ flex:1 }}
            placeholder="Email"
            value={form.email}
            onChange={(e)=>setForm({ ...form, email:e.target.value })}
            onBlur={() =>
              setForm(f => ({
                ...f,
                name: f.name.trim() || nameFromEmail(f.email.trim()),
              }))
            }
            required
          />
          <input
            style={{ flex:1 }}
            placeholder="Name"
            value={form.name}
            onChange={(e)=>setForm({ ...form, name:e.target.value })}
            required
          />
          <input
            style={{ flex:1 }}
            placeholder="Position"
            value={form.position}
            onChange={(e)=>setForm({ ...form, position:e.target.value })}
          />
          <button className="btn" style={{ flex:"0 0 100%" }}>Add</button>
        </form>

        {/* ─ close ─ */}
        <button
          type="button"
          className="btn-light"
          style={{ marginTop:"1rem" }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();   // <— essential
            onClose();
          }}
        >
          Close
        </button>

        {/* ─ delete-confirm modal ─ */}
        {delId !== null && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth:340 }}>
              <p style={{ marginTop:0 }}>Delete this contact?</p>
              <div style={{ display:"flex", gap:".6rem", justifyContent:"center", marginTop:"1rem" }}>
                <button className="btn" onClick={confirmDelete}>Delete</button>
                <button className="btn-light" onClick={()=>setDelId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ─── render via portal ─────────────────────────────────────── */
  return createPortal(modal, document.body);
}
