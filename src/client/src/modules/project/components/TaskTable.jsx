import React, { useState, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import api from "../api.js";

/* ───────── helpers ───────── */
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

/* ───────── component ───────── */
export default function TaskTable({ rows, onUpdate, onDelete }) {
  /* basic UI state */
  const [editingId,  setEdit]     = useState(null);
  const [form,       setForm]     = useState({});
  const [expandedId, setExpanded] = useState(null);
  const [deleteId,   setDeleteId] = useState(null);

  /* contacts cache  (taskId → [contacts]) */
  const [contacts, setContacts] = useState({});
  const [cForm,    setCForm]    = useState({ taskId:null, name:"", email:"", position:"" });

  /* FIXED: block-body async function ----------------------------- */
  const loadContacts = async (tid) => {
    const list = await api.listContacts(tid).catch(() => []);
    setContacts((c) => ({ ...c, [tid]: list }));
  };

  /* ensure contacts load when a row is expanded ------------------ */
  useEffect(() => {
    if (expandedId && contacts[expandedId] == null) loadContacts(expandedId);
  }, [expandedId]);
                   
  
  /* sorting logic ------------------------------------------------ */
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
      if (y == null) return  dir;
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
    setEdit(t.id);
    setCForm({ taskId:t.id, name:"", email:"", position:"" });
    if (contacts[t.id] == null) loadContacts(t.id);
  }

  /* save task ---------------------------------------------------- */
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

  /* add contact while editing ----------------------------------- */
  async function addContact(e){
    e.preventDefault();
    const { taskId, name, email, position } = cForm;
    if(!name.trim() || !email.trim()) return;
    await api.insertContact(taskId, { name, email, position })
             .then(()=>loadContacts(taskId));
    setCForm({ taskId, name:"", email:"", position:"" });
  }

  /* helpers */
  const hdr = (k) => `sortable${sort.key===k? (sort.asc?" sort-asc":" sort-desc"):""}`;
  const toggleRow = (t) => {
    const newId = expandedId === t.id ? null : t.id;
    if (newId && contacts[newId]==null) loadContacts(newId);
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
                <th className={hdr("name")}       onClick={()=>setSort({key:"name",       asc:sort.key==="name"? !sort.asc:true})}>Name</th>
                <th className={hdr("customer")}   onClick={()=>setSort({key:"customer",   asc:sort.key==="customer"? !sort.asc:true})}>Customer</th>
                <th className={hdr("startedAt")}  onClick={()=>setSort({key:"startedAt",  asc:sort.key==="startedAt"? !sort.asc:true})}>Start</th>
                <th className={hdr("finishedAt")} onClick={()=>setSort({key:"finishedAt", asc:sort.key==="finishedAt"? !sort.asc:true})}>End</th>
                <th className={hdr("duration")}   onClick={()=>setSort({key:"duration",   asc:sort.key==="duration"? !sort.asc:true})}>Duration</th>
                <th>Notes</th><th></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((t) => (
                <React.Fragment key={t.id}>
                  {/* clickable summary row */}
                  <tr className="clickable-row" onClick={()=>toggleRow(t)}>
                    <td>{t.name}</td>
                    <td>{t.customer || "—"}</td>
                    <td>{fmt(t.startedAt)}</td>
                    <td>{t.finishedAt ? fmt(t.finishedAt) : "—"}</td>
                    <td>{t.finishedAt ? fmtDuration(diffMs(t.startedAt,t.finishedAt)) : "—"}</td>
                    <td className="notes-snippet">
                      {t.notes ? `${t.notes.slice(0,60)}${t.notes.length>60?"…":""}` : "—"}
                    </td>
                    <td style={{whiteSpace:"nowrap"}}>
                      <button className="btn-light" onClick={(e)=>beginEdit(e,t)}>Edit</button>{" "}
                      <button className="btn-light" onClick={(e)=>{e.stopPropagation();setDeleteId(t.id);}}>×</button>
                    </td>
                  </tr>

                  {/* inline edit row */}
                  {editingId===t.id && (
                    <tr>
                      <td colSpan={7}>
                        <form onSubmit={save} style={{display:"flex",flexWrap:"wrap",gap:".4rem"}}>
                          {/* ...inputs unchanged... */}
                          <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required/>
                          <input value={form.customer} onChange={(e)=>setForm({...form,customer:e.target.value})}/>
                          <input type="datetime-local" value={form.startedAt} onChange={(e)=>setForm({...form,startedAt:e.target.value})} required/>
                          <input type="datetime-local" value={form.finishedAt} onChange={(e)=>setForm({...form,finishedAt:e.target.value})}/>
                          <textarea rows={3} style={{flex:"1 1 100%"}} placeholder="Notes (Markdown)"
                                    value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/>

                          {/* contacts manager */}
                          <div className="contacts-box" style={{flexBasis:"100%"}}>
                            <h4 style={{margin:".2rem 0 .6rem"}}>Contacts</h4>
                            {contacts[t.id]?.length ? (
                              <table style={{width:"100%",marginBottom:".6rem"}}>
                                <thead><tr><th>Name</th><th>Email</th><th>Position</th><th></th></tr></thead>
                                <tbody>
                                  {contacts[t.id].map((c)=>(
                                    <tr key={c.id}>
                                      <td>{c.name}</td><td>{c.email}</td><td>{c.position||"—"}</td>
                                      <td>
                                        <button className="btn-light"
                                                onClick={(e)=>{e.preventDefault();api.deleteContact(c.id).then(()=>loadContacts(t.id));}}>×</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : <p><em>No contacts yet</em></p>}

                            {/* add contact */}
                            <form onSubmit={addContact} style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
                              <input style={{flex:1}} placeholder="Name"   value={cForm.name}
                                     onChange={(e)=>setCForm({...cForm,name:e.target.value})} required/>
                              <input style={{flex:1}} placeholder="Email"  value={cForm.email}
                                     onChange={(e)=>setCForm({...cForm,email:e.target.value})} required/>
                              <input style={{flex:1}} placeholder="Position" value={cForm.position}
                                     onChange={(e)=>setCForm({...cForm,position:e.target.value})}/>
                              <button className="btn" style={{flex:"0 0 100%"}}>Add</button>
                            </form>
                          </div>

                          <button className="btn">Save</button>
                          <button type="button" className="btn-light" onClick={()=>setEdit(null)}>Cancel</button>
                        </form>
                      </td>
                    </tr>
                  )}

                  {/* expanded details row */}
                  {expandedId===t.id && (
                    <tr>
                      <td colSpan={7} style={{background:"var(--row-alt)"}}>
                        {t.notes && <div className="notes-full"><ReactMarkdown>{t.notes}</ReactMarkdown></div>}
                        <h4 style={{marginTop:t.notes?"1rem":0}}>Contacts</h4>
                        <div className="contacts-box">
                          {contacts[t.id]==null ? (
                            <p><em>Loading…</em></p>
                          ) : contacts[t.id].length ? (
                            <table style={{width:"100%"}}>
                              <thead><tr><th>Name</th><th>Email</th><th>Position</th></tr></thead>
                              <tbody>
                                {contacts[t.id].map((c)=>(
                                  <tr key={c.id}><td>{c.name}</td><td>{c.email}</td><td>{c.position||"—"}</td></tr>
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

      {/* delete-confirm modal */}
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
    </>
  );
}
