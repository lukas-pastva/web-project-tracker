import React, { useState, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import api from "../api.js";
import ContactList from "./ContactList.jsx";               // NEW ✅

/* ───────── helpers ───────── */
const fmt = (iso) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(iso));

/* ISO (UTC) → <input type="datetime-local"> in local TZ */
const isoToLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
};

const inputToIso = (val) => (val ? new Date(val).toISOString() : null);

const diffMs = (a, b) => new Date(b) - new Date(a);
const fmtDuration = (ms) =>
  ms == null
    ? "—"
    : `${Math.floor(ms / 3_600_000)}h ${(Math.floor(ms / 60_000) % 60)
        .toString()
        .padStart(2, "0")}m`;

/* robust local-part → “Name Surname” */
const nameFromEmail = (email = "") =>
  email
    .split("@")[0]
    .split(/[^a-zA-Z]+/g)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");

/* ───────── component ───────── */
export default function TaskTable({ rows, onUpdate, onDelete }) {
  /* UI state ---------------------------------------------------- */
  const [editingId, setEdit] = useState(null);
  const [form, setForm] = useState({});
  const [expandedId, setExpanded] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [contactsModal, setContactsModal] = useState(null); // NEW ✅

  /* contacts cache (for the read-only expanded view) ------------ */
  const [contacts, setContacts] = useState({});
  const loadContacts = async (tid) => {
    const list = await api.listContacts(tid).catch(() => []);
    setContacts((c) => ({ ...c, [tid]: list }));
  };

  /* auto-fetch on expand */
  useEffect(() => {
    if (expandedId && contacts[expandedId] == null) loadContacts(expandedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId]);

  /* sorting ----------------------------------------------------- */
  const [sort, setSort] = useState({ key: "startedAt", asc: true });
  const sortedRows = useMemo(() => {
    const dir = sort.asc ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === "duration") {
        const dx = diffMs(a.startedAt, a.finishedAt);
        const dy = diffMs(b.startedAt, b.finishedAt);
        return dx === dy ? 0 : dx > dy ? dir : -dir;
      }
      const x = a[sort.key], y = b[sort.key];
      if (x == null && y == null) return 0;
      if (x == null) return -dir;
      if (y == null) return dir;
      return x > y ? dir : -dir;
    });
  }, [rows, sort]);

  /* task edit cycle -------------------------------------------- */
  function beginEdit(e, t) {
    e.stopPropagation();
    setForm({
      name       : t.name,
      customer   : t.customer ?? "",
      startedAt  : isoToLocalInput(t.startedAt),
      finishedAt : t.finishedAt ? isoToLocalInput(t.finishedAt) : "",
      notes      : t.notes ?? "",
    });
    setEdit(t.id);
  }

  async function saveTask(e) {
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

  /* helpers */
  const hdr = (k) =>
    `sortable${sort.key === k ? (sort.asc ? " sort-asc" : " sort-desc") : ""}`;
  const toggleRow = (t) => {
    const newId = expandedId === t.id ? null : t.id;
    if (newId && contacts[newId] == null) loadContacts(newId);
    setExpanded(newId);
  };

  /* ───────── render ───────── */
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
                <th className={hdr("name")} onClick={() => setSort({ key: "name",       asc: sort.key==="name"       ? !sort.asc : true })}>Name</th>
                <th className={hdr("customer")} onClick={() => setSort({ key: "customer",   asc: sort.key==="customer"   ? !sort.asc : true })}>Customer</th>
                <th className={hdr("startedAt")} onClick={() => setSort({ key: "startedAt", asc: sort.key==="startedAt" ? !sort.asc : true })}>Start</th>
                <th className={hdr("finishedAt")} onClick={() => setSort({ key: "finishedAt",asc: sort.key==="finishedAt"? !sort.asc : true })}>End</th>
                <th className={hdr("duration")} onClick={() => setSort({ key: "duration",  asc: sort.key==="duration"  ? !sort.asc : true })}>Duration</th>
                <th>Notes</th><th></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((t) => (
                <React.Fragment key={t.id}>
                  {/* summary row ----------------------------------- */}
                  <tr className="clickable-row" onClick={() => toggleRow(t)}>
                    <td>{t.name}</td>
                    <td>{t.customer || "—"}</td>
                    <td>{fmt(t.startedAt)}</td>
                    <td>{t.finishedAt ? fmt(t.finishedAt) : "—"}</td>
                    <td>{t.finishedAt ? fmtDuration(diffMs(t.startedAt, t.finishedAt)) : "—"}</td>
                    <td className="notes-snippet">
                      {t.notes ? `${t.notes.slice(0,60)}${t.notes.length>60 ? "…" : ""}` : "—"}
                    </td>
                    <td style={{whiteSpace:"nowrap"}}>
                      <button className="btn-light" onClick={(e)=>beginEdit(e,t)}>Edit</button>{" "}
                      <button className="btn-light" onClick={(e)=>{e.stopPropagation(); setDeleteId(t.id);}}>×</button>
                    </td>
                  </tr>

                  {/* inline edit ---------------------------------- */}
                  {editingId === t.id && (
                    <tr>
                      <td colSpan={7}>
                        <form
                          onSubmit={saveTask}
                          style={{display:"flex",flexWrap:"wrap",gap:".4rem"}}
                        >
                          <input
                            value={form.name}
                            onChange={(e)=>setForm({...form,name:e.target.value})}
                            required
                          />
                          <input
                            value={form.customer}
                            onChange={(e)=>setForm({...form,customer:e.target.value})}
                          />
                          <input
                            type="datetime-local"
                            value={form.startedAt}
                            onChange={(e)=>setForm({...form,startedAt:e.target.value})}
                            required
                          />
                          <input
                            type="datetime-local"
                            value={form.finishedAt}
                            onChange={(e)=>setForm({...form,finishedAt:e.target.value})}
                          />
                          <textarea
                            rows={3}
                            style={{flex:"1 1 100%"}}
                            placeholder="Notes (Markdown)"
                            value={form.notes}
                            onChange={(e)=>setForm({...form,notes:e.target.value})}
                          />

                          {/* NEW: open modal on demand ----------- */}
                          <button
                            type="button"
                            className="btn-light"
                            onClick={()=>setContactsModal(t.id)}
                          >
                            Manage contacts…
                          </button>

                          <button className="btn">Save</button>
                          <button
                            type="button"
                            className="btn-light"
                            onClick={()=>setEdit(null)}
                          >
                            Cancel
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}

                  {/* expanded details --------------------------- */}
                  {expandedId === t.id && (
                    <tr>
                      <td colSpan={7} style={{background:"var(--row-alt)"}}>
                        {t.notes && (
                          <div className="notes-full">
                            <ReactMarkdown>{t.notes}</ReactMarkdown>
                          </div>
                        )}
                        <h4 style={{marginTop:t.notes?"1rem":0}}>Contacts</h4>
                        <div className="contacts-box">
                          {contacts[t.id]==null ? (
                            <p><em>Loading…</em></p>
                          ) : contacts[t.id].length ? (
                            <table style={{width:"100%"}}>
                              <thead><tr><th>Email</th><th>Name</th><th>Position</th></tr></thead>
                              <tbody>
                                {contacts[t.id].map(c=>(
                                  <tr key={c.id}>
                                    <td>{c.email}</td><td>{c.name}</td><td>{c.position||"—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p><em>No contacts</em></p>
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

      {/* delete-confirm modal ------------------------------------ */}
      {deleteId!=null && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <p style={{marginTop:0}}>Delete this task?</p>
            <div style={{marginTop:"1rem",display:"flex",gap:".6rem",justifyContent:"center"}}>
              <button className="btn" onClick={async()=>{await onDelete(deleteId);setDeleteId(null);}}>Delete</button>
              <button className="btn-light" onClick={()=>setDeleteId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* contact-manager modal ----------------------------------- */}
      {contactsModal && (
        <ContactList
          taskId={contactsModal}
          onClose={()=>setContactsModal(null)}
        />
      )}
    </>
  );
}
