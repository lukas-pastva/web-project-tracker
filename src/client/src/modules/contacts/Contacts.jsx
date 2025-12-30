import React, { useEffect, useState, useMemo } from "react";
import Header from "../../components/Header.jsx";
import api    from "../project/api.js";

/* helper for case-insensitive substring search */
const inc = (a,b)=>a.toLowerCase().includes(b.toLowerCase());

export default function ContactsPage() {
  /* raw data & supporting look-ups */
  const [rows,     setRows]   = useState([]);
  const [projects, setProjs]  = useState([]);
  const [tasks,    setTasks]  = useState({});      // projId → tasks[]
  const [err,      setErr]    = useState("");

  /* filters */
  const [q, setQ] = useState({ name:"", email:"", position:"", project:"", customer:"" });

  /* add / edit forms */
  const emptyNew   = { projectId:"", taskId:"", name:"", email:"", position:"" };
  const [newRow, setNew]     = useState(emptyNew);
  const [editId, setEditId]  = useState(null);
  const [editRow,setEditRow] = useState({});

  /* --- LOAD DATA ------------------------------------------------ */
  const reload = () =>
    api.listAllContacts().then(setRows).catch(e=>setErr(e.message));
  useEffect(reload, []);

  useEffect(() => {              // projects list
    fetch("/api/projects").then(r=>r.json()).then(setProjs).catch(()=>{});
  }, []);

  const loadTasks = (pid) => {
    if (!pid || tasks[pid]) return;
    api.listTasks(pid).then(list =>
      setTasks(t => ({...t,[pid]:list}))
    ).catch(()=>{});
  };

  /* --- FILTERED VIEW ------------------------------------------- */
  const filtered = useMemo(()=>{
    const keys = Object.keys(q).filter(k=>q[k].trim());
    if(keys.length===0) return rows;
    return rows.filter(r=>keys.every(k=>inc(String(r[k]??""), q[k])));
  },[rows,q]);

  /* --- CRUD HELPERS -------------------------------------------- */
  async function create(e){
    e.preventDefault();
    const { taskId, name, email, position } = newRow;
    if(!taskId || !name.trim() || !email.trim()) return;
    await api.insertContact(taskId, { name, email, position })
             .then(()=>{ setNew(emptyNew); reload(); });
  }

  async function saveEdit(id){
    const { name, email, position } = editRow;
    if(!name.trim() || !email.trim()) return;
    await api.updateContact(id, { name, email, position })
             .then(()=>{ setEditId(null); reload(); });
  }

  async function del(id){
    if(!window.confirm("Delete this contact?")) return;
    await api.deleteContact(id).then(reload);
  }

  /* --- UI ------------------------------------------------------- */
  return (
    <>
      <Header />

      <main>
        <section className="card" style={{ maxWidth: 1100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ margin: 0 }}>Contacts</h2>
            <span className="text-muted" style={{ fontSize: "0.875rem" }}>
              {filtered.length} {filtered.length === 1 ? "contact" : "contacts"}
            </span>
          </div>

          {err && <div className="error-message">{err}</div>}

          {/* ─ Filter bar ─ */}
          <div className="filter-bar">
            {["name", "email", "position", "project", "customer"].map(k => (
              <input
                key={k}
                placeholder={`Filter by ${k}`}
                value={q[k]}
                onChange={e => setQ({ ...q, [k]: e.target.value })}
                style={{ minWidth: 140 }}
              />
            ))}
          </div>

          {/* ─ Add new contact ─ */}
          <details style={{ marginTop: "1.25rem" }}>
            <summary>+ Add Contact</summary>
            <form onSubmit={create} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Project</label>
                  <select
                    value={newRow.projectId}
                    onChange={(e) => {
                      setNew({ ...newRow, projectId: e.target.value, taskId: "" });
                      loadTasks(e.target.value);
                    }}
                    required
                  >
                    <option value="">Select project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Task</label>
                  <select
                    value={newRow.taskId}
                    onChange={(e) => setNew({ ...newRow, taskId: e.target.value })}
                    required
                    disabled={!newRow.projectId}
                  >
                    <option value="">Select task...</option>
                    {(tasks[newRow.projectId] || []).map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.customer || "—"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    placeholder="Contact name"
                    value={newRow.name}
                    onChange={(e) => setNew({ ...newRow, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={newRow.email}
                    onChange={(e) => setNew({ ...newRow, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input
                    placeholder="Job title (optional)"
                    value={newRow.position}
                    onChange={(e) => setNew({ ...newRow, position: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn">Add Contact</button>
              </div>
            </form>
          </details>

          {/* ─ Table ─ */}
          <div style={{ overflowX: "auto", marginTop: "1.25rem" }}>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <p>No contacts found</p>
              </div>
            ) : (
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Position</th>
                    <th>Project</th>
                    <th>Customer</th>
                    <th style={{ width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    editId === c.id ? (
                      <tr key={c.id}>
                        <td>
                          <input
                            value={editRow.name}
                            onChange={(e) => setEditRow({ ...editRow, name: e.target.value })}
                            required
                          />
                        </td>
                        <td>
                          <input
                            value={editRow.email}
                            onChange={(e) => setEditRow({ ...editRow, email: e.target.value })}
                            required
                          />
                        </td>
                        <td>
                          <input
                            value={editRow.position || ""}
                            onChange={(e) => setEditRow({ ...editRow, position: e.target.value })}
                          />
                        </td>
                        <td className="text-muted">{c.project}</td>
                        <td className="text-muted">{c.customer || "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button className="btn" onClick={() => saveEdit(c.id)}>Save</button>
                          {" "}
                          <button className="btn-light" onClick={() => setEditId(null)}>Cancel</button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.name}</td>
                        <td>{c.email}</td>
                        <td className="text-muted">{c.position || "—"}</td>
                        <td className="text-muted">{c.project}</td>
                        <td className="text-muted">{c.customer || "—"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button
                            className="btn-light"
                            onClick={() => { setEditId(c.id); setEditRow(c); }}
                          >
                            Edit
                          </button>
                          {" "}
                          <button
                            className="btn-icon"
                            onClick={() => del(c.id)}
                            title="Delete contact"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
