import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../api.js";

/* Turn “john.doe@…” → “John Doe” */
const nameFromEmail = (email = "") =>
  email
    .split("@")[0]
    .split(/[^a-zA-Z]+/g)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");

export default function ContactList({ taskId, onClose }) {
  /* ─── state ───────────────────────────────────────────────── */
  const [rows,      setRows]    = useState([]);
  const [err,       setErr]     = useState("");
  const [form,      setForm]    = useState({ email: "", name: "", position: "" });

  /* inline edit */
  const [editId,    setEditId]  = useState(null);
  const [editRow,   setEditRow] = useState({});

  /* delete-confirm modal */
  const [delId,     setDelId]   = useState(null);

  /* ignore async after unmount */
  const aliveRef                 = useRef(true);
  const safeSet = (fn) => (...args) => aliveRef.current && fn(...args);

  /* ─── load data ───────────────────────────────────────────── */
  const reload = () =>
    api
      .listContacts(taskId)
      .then(safeSet(setRows))
      .catch((e) => safeSet(setErr)(e.message));

  useEffect(() => {
    reload();
    return () => {
      aliveRef.current = false;
    };
  }, [taskId]);                          // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── CRUD helpers ────────────────────────────────────────── */
  async function add(e) {
    e.preventDefault();
    const finalName = form.name.trim() || nameFromEmail(form.email.trim() || "");
    await api
      .insertContact(taskId, {
        email   : form.email.trim(),
        name    : finalName,
        position: form.position.trim() || null,
      })
      .then(reload)
      .catch((e) => safeSet(setErr)(e.message));
    safeSet(setForm)({ email: "", name: "", position: "" });
  }

  async function saveEdit(id) {
    const { email, name, position } = editRow;
    if (!email.trim() || !name.trim()) return;
    await api
      .updateContact(id, {
        email   : email.trim(),
        name    : name.trim(),
        position: position.trim() || null,
      })
      .then(reload)
      .catch((e) => safeSet(setErr)(e.message));
    safeSet(setEditId)(null);
  }

  async function confirmDelete() {
    if (delId == null) return;
    await api
      .deleteContact(delId)
      .then(reload)
      .catch((e) => safeSet(setErr)(e.message));
    safeSet(setDelId)(null);
  }

  /* ─── modal markup (portal) ───────────────────────────────── */
  const modal = (
    <div className="modal-backdrop">
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <h3 style={{ marginTop: 0 }}>Contacts</h3>

        {err && <p style={{ color: "#c00" }}>{err}</p>}

        {/* list ------------------------------------------------ */}
        {rows.length === 0 ? (
          <p>
            <em>No contacts yet</em>
          </p>
        ) : (
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Position</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) =>
                editId === c.id ? (
                  /* inline edit row */
                  <tr key={c.id}>
                    <td>
                      <input
                        value={editRow.email}
                        onChange={(e) =>
                          setEditRow({ ...editRow, email: e.target.value })
                        }
                        required
                      />
                    </td>
                    <td>
                      <input
                        value={editRow.name}
                        onChange={(e) =>
                          setEditRow({ ...editRow, name: e.target.value })
                        }
                        required
                      />
                    </td>
                    <td>
                      <input
                        value={editRow.position || ""}
                        onChange={(e) =>
                          setEditRow({ ...editRow, position: e.target.value })
                        }
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn" onClick={() => saveEdit(c.id)}>
                        Save
                      </button>{" "}
                      <button
                        className="btn-light"
                        onClick={() => setEditId(null)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  /* normal row */
                  <tr key={c.id}>
                    <td>{c.email}</td>
                    <td>{c.name}</td>
                    <td>{c.position || "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn-light"
                        onClick={() => {
                          setEditId(c.id);
                          setEditRow(c);
                        }}
                      >
                        Edit
                      </button>{" "}
                      <button
                        className="btn-light"
                        onClick={() => setDelId(c.id)}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}

        {/* add new -------------------------------------------- */}
        <form
          onSubmit={add}
          style={{
            display: "flex",
            gap: ".4rem",
            flexWrap: "wrap",
            marginTop: "1rem",
          }}
        >
          {/* email first */}
          <input
            style={{ flex: 1 }}
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onBlur={() =>
              setForm((f) => ({
                ...f,
                name: f.name.trim() || nameFromEmail(f.email.trim()),
              }))
            }
            required
          />
          <input
            style={{ flex: 1 }}
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            style={{ flex: 1 }}
            placeholder="Position"
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value })}
          />
          <button className="btn" style={{ flex: "0 0 100%" }}>
            Add
          </button>
        </form>

        <button
          type="button"
          className="btn-light"
          style={{ marginTop: "1rem" }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation(); // block bubble to elements below
            onClose();
          }}
        >
          Close
        </button>

        {/* delete-confirm modal ------------------------------- */}
        {delId !== null && (
          <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth: 340 }}>
              <p style={{ marginTop: 0 }}>Delete this contact?</p>
              <div
                style={{
                  marginTop: "1rem",
                  display: "flex",
                  gap: ".6rem",
                  justifyContent: "center",
                }}
              >
                <button className="btn" onClick={confirmDelete}>
                  Delete
                </button>
                <button className="btn-light" onClick={() => setDelId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* render via portal */
  return createPortal(modal, document.body);
}
