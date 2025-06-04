import React, { useState, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import api from "../api.js";

/* ───────── helpers ───────── */
const fmt = (iso) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(iso));

const isoToInput  = (iso) => iso?.slice(0, 16);
const inputToIso  = (val) => (val ? new Date(val).toISOString() : null);

const diffMs      = (a, b) => new Date(b) - new Date(a);
const fmtDuration = (ms) =>
  ms == null
    ? "—"
    : `${Math.floor(ms / 3_600_000)}h ${String(
        Math.floor(ms / 60_000) % 60,
      ).padStart(2, "0")}m`;

/* ───────── component ───────── */
export default function TaskTable({ rows, onUpdate, onDelete }) {
  /* UI / CRUD ---------------------------------------------------- */
  const [editingId,   setEdit]         = useState(null);
  const [form,        setForm]         = useState({});
  const [expandedId,  setExpanded]     = useState(null);
  const [deleteId,    setDeleteId]     = useState(null);

  /* contacts cache { taskId: [ … ] } + add-form state ------------ */
  const [contacts,  setContacts]  = useState({});
  const [newC,      setNewC]      = useState({ name: "", email: "", position: "" });

  const loadContacts = (tid) =>
    api
      .listContacts(tid)
      .then((data) => setContacts((c) => ({ ...c, [tid]: data })))
      .catch(() => { /* ignore */ });

  /* sorting ------------------------------------------------------ */
  const [sort, setSort] = useState({ key: "startedAt", asc: true });
  const clickSort = (key) =>
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));

  const sortedRows = useMemo(() => {
    const dir = sort.asc ? 1 : -1;
    return [...rows].sort((a, b) => {
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

  /* toggle expanded row & lazy-load contacts --------------------- */
  const toggle = (id) => {
    setExpanded((prev) => (prev === id ? null : id));
    if (expandedId !== id && !contacts[id]) loadContacts(id);
  };

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
    /* ensure contacts are loaded for inline edit */
    if (!contacts[t.id]) loadContacts(t.id);
    setEdit(t.id);
    setExpanded(null);
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

  /* contacts CRUD inside edit row -------------------------------- */
  async function addContact(e) {
    e.preventDefault();
    if (!newC.name.trim() || !newC.email.trim()) return;
    await api.insertContact(editingId, newC);
    await loadContacts(editingId);
    setNewC({ name: "", email: "", position: "" });
  }
  async function delContact(cid) {
    await api.deleteContact(cid);
    await loadContacts(editingId);
  }

  /* header class helper ----------------------------------------- */
  const hdrClass = (k) =>
    `sortable${sort.key === k ? (sort.asc ? " sort-asc" : " sort-desc") : ""}`;

  /* ───────── render ───────── */
  return (
    <>
      <section className="card">
        <h3>Tasks</h3>
        {sortedRows.length === 0 ? (
          <p>
            <em>No tasks yet</em>
          </p>
        ) : (
          <table className="tasks-table">
            <thead>
              <tr>
                <th className={hdrClass("name")}       onClick={() => clickSort("name")}>Name</th>
                <th className={hdrClass("customer")}   onClick={() => clickSort("customer")}>Customer</th>
                <th className={hdrClass("startedAt")}  onClick={() => clickSort("startedAt")}>Start</th>
                <th className={hdrClass("finishedAt")} onClick={() => clickSort("finishedAt")}>End</th>
                <th className={hdrClass("duration")}   onClick={() => clickSort("duration")}>Duration</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((t) => (
                <React.Fragment key={t.id}>
                  {/* main row – whole row toggles details */}
                  <tr
                    className="clickable-row"
                    onClick={() => editingId === t.id ? null : toggle(t.id)}
                  >
                    <td>{t.name}</td>
                    <td>{t.customer || "—"}</td>
                    <td>{fmt(t.startedAt)}</td>
                    <td>{t.finishedAt ? fmt(t.finishedAt) : "—"}</td>
                    <td>{t.finishedAt ? fmtDuration(diffMs(t.startedAt, t.finishedAt)) : "—"}</td>
                    <td className="notes-snippet">
                      {t.notes ? (
                        <ReactMarkdown components={{ p: "span" }}>
                          {t.notes.length > 60 ? t.notes.slice(0, 57) + "…" : t.notes}
                        </ReactMarkdown>
                      ) : (
                        "—"
                      )}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(t.id);
                        }}
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
                            display: "flex",
                            gap: ".4rem",
                            flexWrap: "wrap",
                            alignItems: "flex-start",
                          }}
                        >
                          <input
                            value={form.name}
                            onChange={(e) =>
                              setForm({ ...form, name: e.target.value })
                            }
                            required
                          />
                          <input
                            value={form.customer}
                            onChange={(e) =>
                              setForm({ ...form, customer: e.target.value })
                            }
                          />
                          <input
                            type="datetime-local"
                            value={form.startedAt}
                            onChange={(e) =>
                              setForm({ ...form, startedAt: e.target.value })
                            }
                            required
                          />
                          <input
                            type="datetime-local"
                            value={form.finishedAt}
                            onChange={(e) =>
                              setForm({ ...form, finishedAt: e.target.value })
                            }
                          />
                          <textarea
                            value={form.notes}
                            onChange={(e) =>
                              setForm({ ...form, notes: e.target.value })
                            }
                            rows={3}
                            placeholder="Notes (Markdown)"
                            style={{ flex: "1 1 100%" }}
                          />

                          {/* contacts manager ------------------------- */}
                          <div style={{ flexBasis: "100%" }}>
                            <h4 style={{ margin: "0.6rem 0 0.2rem" }}>
                              Contacts
                            </h4>
                            {contacts[editingId]?.length ? (
                              <table style={{ width: "100%" }}>
                                <thead>
                                  <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Position</th>
                                    <th></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {contacts[editingId].map((c) => (
                                    <tr key={c.id}>
                                      <td>{c.name}</td>
                                      <td>{c.email}</td>
                                      <td>{c.position || "—"}</td>
                                      <td>
                                        <button
                                          type="button"
                                          className="btn-light"
                                          onClick={() => delContact(c.id)}
                                        >
                                          ×
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p>
                                <em>No contacts yet</em>
                              </p>
                            )}

                            {/* add-contact form */}
                            <form
                              onSubmit={addContact}
                              style={{
                                display: "flex",
                                gap: ".4rem",
                                flexWrap: "wrap",
                                marginTop: ".4rem",
                              }}
                            >
                              <input
                                style={{ flex: 1 }}
                                placeholder="Name"
                                value={newC.name}
                                onChange={(e) =>
                                  setNewC({ ...newC, name: e.target.value })
                                }
                                required
                              />
                              <input
                                style={{ flex: 1 }}
                                placeholder="Email"
                                value={newC.email}
                                onChange={(e) =>
                                  setNewC({ ...newC, email: e.target.value })
                                }
                                required
                              />
                              <input
                                style={{ flex: 1 }}
                                placeholder="Position"
                                value={newC.position}
                                onChange={(e) =>
                                  setNewC({
                                    ...newC,
                                    position: e.target.value,
                                  })
                                }
                              />
                              <button className="btn" style={{ flex: "0 0 100%" }}>
                                Add contact
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

                  {/* expanded details (notes + contacts) -------------- */}
                  {expandedId === t.id && (
                    <tr>
                      <td colSpan={7} style={{ background: "var(--row-alt)" }}>
                        {t.notes && (
                          <>
                            <h4>Notes</h4>
                            <ReactMarkdown>{t.notes}</ReactMarkdown>
                          </>
                        )}

                        <h4 style={{ marginTop: t.notes ? "1rem" : 0 }}>
                          Contacts
                        </h4>
                        {contacts[t.id]?.length ? (
                          <table style={{ width: "100%" }}>
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Position</th>
                              </tr>
                            </thead>
                            <tbody>
                              {contacts[t.id].map((c) => (
                                <tr key={c.id}>
                                  <td>{c.name}</td>
                                  <td>{c.email}</td>
                                  <td>{c.position || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p>
                            <em>No contacts</em>
                          </p>
                        )}
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
                marginTop: "1rem",
                display: "flex",
                gap: ".6rem",
                justifyContent: "center",
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
