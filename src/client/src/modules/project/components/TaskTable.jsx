import React, { useState, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import api from "../api.js";                          // contacts CRUD

/* ─────────────────────────── helpers ──────────────────────────── */
const fmt = (iso) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
    hour12   : false,
  }).format(new Date(iso));

const isoToInput  = (iso) => iso?.slice(0, 16);
const inputToIso  = (val) => (val ? new Date(val).toISOString() : null);

const diffMs      = (a, b) => new Date(b) - new Date(a);
const fmtDuration = (ms) =>
  ms == null
    ? "—"
    : `${Math.floor(ms / 3_600_000)}h ${(Math.floor(ms / 60_000) % 60)
        .toString()
        .padStart(2, "0")}m`;

/* ─────────────────────────── component ────────────────────────── */
export default function TaskTable({ rows, onUpdate, onDelete }) {
  /* CRUD / UI state */
  const [editingId,   setEdit]         = useState(null);
  const [form,        setForm]         = useState({});
  const [expandedId,  setExpanded]     = useState(null);
  const [deleteId,    setDeleteId]     = useState(null);

  /* contacts cache { taskId → [contacts] } + per-task add-form */
  const [contacts,      setContacts]   = useState({});
  const [contactForm,   setCForm]      = useState({ taskId:null, name:"", email:"", position:"" });
  const loadContacts = async (tid) => {
    const list = await api.listContacts(tid).catch(()=>[]);
    setContacts((c) => ({ ...c, [tid]: list }));
  };

  /* sorting */
  const [sort, setSort] = useState({ key: "startedAt", asc: true });
  const clickSort = (key) =>
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));

  const sortedRows = useMemo(() => {
    const dir = sort.asc ? 1 : -1;
    return [...rows].sort((a, b) => {
      /* “duration” is virtual */
      if (sort.key === "duration") {
        const dx = diffMs(a.startedAt, a.finishedAt);
        const dy = diffMs(b.startedAt, b.finishedAt);
        return dx === dy ? 0 : dx > dy ? dir : -dir;
      }
      const x = a[sort.key];
      const y = b[sort.key];
      if (x == null && y == null) return 0;
      if (x == null) return -dir;
      if (y == null) return dir;
      return x > y ? dir : -dir;
    });
  }, [rows, sort]);

  /* begin edit --------------------------------------------------- */
  function beginEdit(e, t) {
    e.stopPropagation();
    setForm({
      name       : t.name,
      customer   : t.customer ?? "",
      startedAt  : isoToInput(t.startedAt),
      finishedAt : t.finishedAt ? isoToInput(t.finishedAt) : "",
      notes      : t.notes ?? "",
    });
    setCForm({ taskId:t.id, name:"", email:"", position:"" });
    loadContacts(t.id);
    setEdit(t.id);
  }

  /* save edit ---------------------------------------------------- */
  async function save(e) {
    e.preventDefault();
    await onUpdate(editingId, {
      name       : form.name,
      customer   : form.customer,
      startedAt  : inputToIso(form.startedAt),
      finishedAt : form.finishedAt ? inputToIso(form.finishedAt) : null,
      notes      : form.notes.trim() || null,
    });
    setEdit(null);
  }

  /* add contact while editing ------------------------------------ */
  async function addContact(e) {
    e.preventDefault();
    const { taskId, name, email, position } = contactForm;
    if (!name.trim() || !email.trim()) return;
    await api
      .insertContact(taskId, { name, email, position })
      .then(() => loadContacts(taskId));
    setCForm({ taskId, name:"", email:"", position:"" });
  }

  /* header class helper ------------------------------------------ */
  const hdrClass = (k) =>
    `sortable${sort.key === k ? (sort.asc ? " sort-asc" : " sort-desc") : ""}`;

  /* ─────────────────────────── render ──────────────────────────── */
  return (
    <>
      <section className="card">
        <h3>Tasks</h3>
        {sortedRows.length === 0 ? (
          <p><em>No tasks yet</em></p>
        ) : (
          <table className="tasks-table">
            <thead>
              <tr>
                <th className={hdrClass("name")}       onClick={() => clickSort("name")}>Name</th>
                <th className={hdrClass("customer")}   onClick={() => clickSort("customer")}>Customer</th>
                <th className={hdrClass("startedAt")}  onClick={() => clickSort("startedAt")}>Start</th>
                <th className={hdrClass("finishedAt")} onClick={() => clickSort("finishedAt")}>End</th>
                <th className={hdrClass("duration")}   onClick={() => clickSort("duration")}>Duration</th>
                <th>Notes</th><th></th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((t) => (
                <React.Fragment key={t.id}>
                  {/* main row –- whole line toggles details -------------- */}
                  <tr
                    className="clickable-row"
                    onClick={() =>
                      setExpanded(expandedId === t.id ? null : t.id) }
                  >
                    <td>{t.name}</td>
                    <td>{t.customer || "—"}</td>
                    <td>{fmt(t.startedAt)}</td>
                    <td>{t.finishedAt ? fmt(t.finishedAt) : "—"}</td>
                    <td>{t.finishedAt ? fmtDuration(diffMs(t.startedAt, t.finishedAt)) : "—"}</td>
                    <td className="notes-snippet">
                      {t.notes ? (
                        <ReactMarkdown components={{ p: "span" }}>
                          {t.notes.length > 60 ? t.notes.slice(0, 60) + "…" : t.notes}
                        </ReactMarkdown>
                      ) : "—"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn-light"
                        onClick={(e) => beginEdit(e, t)}
                      >
                        Edit
                      </button>{" "}
                      <button
                        className="btn-light"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>

                  {/* inline edit row ------------------------------------ */}
                  {editingId === t.id && (
                    <tr>
                      <td colSpan={7}>
                        <form
                          onSubmit={save}
                          style={{
                            display      : "flex",
                            gap          : ".4rem",
                            flexWrap     : "wrap",
                            alignItems   : "flex-start",
                          }}
                        >
                          <input
                            value={form.name}
                            onChange={(e) =>
                              setForm({ ...form, name: e.target.value })}
                            required
                          />
                          <input
                            value={form.customer}
                            onChange={(e) =>
                              setForm({ ...form, customer: e.target.value })}
                          />
                          <input
                            type="datetime-local"
                            value={form.startedAt}
                            onChange={(e) =>
                              setForm({ ...form, startedAt: e.target.value })}
                            required
                          />
                          <input
                            type="datetime-local"
                            value={form.finishedAt}
                            onChange={(e) =>
                              setForm({ ...form, finishedAt: e.target.value })}
                          />
                          <textarea
                            value={form.notes}
                            onChange={(e) =>
                              setForm({ ...form, notes: e.target.value })}
                            rows={3}
                            placeholder="Notes (Markdown)"
                            style={{ flex: "1 1 100%" }}
                          />

                          {/* contacts manager inside edit ---------------- */}
                          <div className="contacts-box" style={{ flexBasis:"100%" }}>
                            <h4 style={{ margin: ".2rem 0 .6rem" }}>Contacts</h4>
                            {contacts[t.id]?.length ? (
                              <table style={{ width:"100%", marginBottom:".6rem" }}>
                                <thead><tr>
                                  <th>Name</th><th>Email</th><th>Position</th><th></th>
                                </tr></thead>
                                <tbody>
                                  {contacts[t.id].map((c)=>(
                                    <tr key={c.id}>
                                      <td>{c.name}</td>
                                      <td>{c.email}</td>
                                      <td>{c.position || "—"}</td>
                                      <td>
                                        <button
                                          className="btn-light"
                                          onClick={(e)=>{
                                            e.preventDefault();
                                            api.deleteContact(c.id)
                                               .then(()=>loadContacts(t.id));
                                          }}
                                        >×</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p><em>No contacts yet</em></p>
                            )}

                            {/* add new contact */}
                            <form
                              onSubmit={addContact}
                              style={{ display:"flex", gap:".4rem", flexWrap:"wrap" }}
                            >
                              <input
                                style={{ flex:1 }}
                                placeholder="Name"
                                value={contactForm.name}
                                onChange={(e)=>setCForm({ ...contactForm, name:e.target.value })}
                                required
                              />
                              <input
                                style={{ flex:1 }}
                                placeholder="Email"
                                value={contactForm.email}
                                onChange={(e)=>setCForm({ ...contactForm, email:e.target.value })}
                                required
                              />
                              <input
                                style={{ flex:1 }}
                                placeholder="Position"
                                value={contactForm.position}
                                onChange={(e)=>setCForm({ ...contactForm, position:e.target.value })}
                              />
                              <button className="btn" style={{ flex:"0 0 100%" }}>
                                Add
                              </button>
                            </form>
                          </div>

                          <button className="btn">Save</button>
                          <button
                            type="button"
                            className="btn-light"
                            onClick={() => setEdit(null)}
                          >
                            Cancel
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}

                  {/* expanded details (notes + contacts) ---------------- */}
                  {expandedId === t.id && (
                    <tr>
                      <td colSpan={7} style={{ background: "var(--row-alt)" }}>
                        {t.notes && (
                          <div className="notes-full">
                            <ReactMarkdown>{t.notes}</ReactMarkdown>
                          </div>
                        )}

                        {/* contacts list in a bordered box */}
                        <h4 style={{ marginTop: t.notes ? "1rem" : 0 }}>
                          Contacts
                        </h4>
                        <div className="contacts-box">
                          {contacts[t.id]
                            ? contacts[t.id].length
                              ? (
                                <table style={{ width:"100%" }}>
                                  <thead><tr>
                                    <th>Name</th><th>Email</th><th>Position</th>
                                  </tr></thead>
                                  <tbody>
                                    {contacts[t.id].map((c)=>(
                                      <tr key={c.id}>
                                        <td>{c.name}</td>
                                        <td>{c.email}</td>
                                        <td>{c.position || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )
                              : <p><em>No contacts</em></p>
                            : /* not yet loaded */ (
                              <p><em>Loading…</em></p>
                            )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* delete-confirm modal -------------------------------------- */}
      {deleteId !== null && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <p style={{ marginTop: 0 }}>Delete this task?</p>
            <div
              style={{
                marginTop:"1rem", display:"flex", gap:".6rem",
                justifyContent:"center",
              }}
            >
              <button
                className="btn"
                onClick={async () => {
                  await onDelete(deleteId);
                  setDeleteId(null);
                }}
              >
                Delete
              </button>
              <button
                className="btn-light"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
