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

      <main style={{padding:"1rem"}}>
        <section className="card" style={{maxWidth:1000}}>
          <h2 style={{marginTop:0}}>Contacts</h2>
          {err && <p style={{color:"#c00"}}>{err}</p>}

          {/* ─ Filter bar ─ */}
          <div style={{display:"flex",gap:".6rem",flexWrap:"wrap"}}>
            {["name","email","position","project","customer"].map(k=>(
              <input key={k} placeholder={k[0].toUpperCase()+k.slice(1)}
                     value={q[k]} onChange={e=>setQ({...q,[k]:e.target.value})}/>
            ))}
          </div>

          {/* ─ Add new contact ─ */}
          <details style={{marginTop:"1rem"}}>
            <summary style={{cursor:"pointer",fontWeight:600}}>Add new contact</summary>
            <form onSubmit={create} style={{marginTop:".8rem",display:"flex",gap:".6rem",flexWrap:"wrap"}}>
              {/* project dropdown */}
              <select value={newRow.projectId}
                      onChange={(e)=>{setNew({...newRow,projectId:e.target.value,taskId:""});loadTasks(e.target.value);}}
                      required>
                <option value="">Project…</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              {/* task dropdown – populated once project chosen */}
              <select value={newRow.taskId}
                      onChange={(e)=>setNew({...newRow,taskId:e.target.value})}
                      required
                      disabled={!newRow.projectId}>
                <option value="">Task…</option>
                {(tasks[newRow.projectId]||[]).map(t=>
                  <option key={t.id} value={t.id}>{t.name} ({t.customer||"—"})</option>
                )}
              </select>

              <input placeholder="Name"     style={{flex:1}} value={newRow.name}
                     onChange={(e)=>setNew({...newRow,name:e.target.value})} required/>
              <input placeholder="Email"    style={{flex:1}} value={newRow.email}
                     onChange={(e)=>setNew({...newRow,email:e.target.value})} required/>
              <input placeholder="Position" style={{flex:1}} value={newRow.position}
                     onChange={(e)=>setNew({...newRow,position:e.target.value})}/>
              <button className="btn" style={{flex:"0 0 100%"}}>Create</button>
            </form>
          </details>

          {/* ─ Table ─ */}
          <div style={{overflowX:"auto",marginTop:"1rem"}}>
            {filtered.length===0 ? (
              <p><em>No contacts found</em></p>
            ) : (
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Position</th>
                    <th>Project</th><th>Customer</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c=>(
                    editId===c.id ? (
                      /* inline edit row */
                      <tr key={c.id}>
                        <td><input value={editRow.name}
                                   onChange={(e)=>setEditRow({...editRow,name:e.target.value})} required/></td>
                        <td><input value={editRow.email}
                                   onChange={(e)=>setEditRow({...editRow,email:e.target.value})} required/></td>
                        <td><input value={editRow.position||""}
                                   onChange={(e)=>setEditRow({...editRow,position:e.target.value})}/></td>
                        <td>{c.project}</td><td>{c.customer||"—"}</td>
                        <td style={{whiteSpace:"nowrap"}}>
                          <button className="btn"       onClick={()=>saveEdit(c.id)}>Save</button>{" "}
                          <button className="btn-light" onClick={()=>setEditId(null)}>Cancel</button>
                        </td>
                      </tr>
                    ) : (
                      /* normal row */
                      <tr key={c.id}>
                        <td>{c.name}</td><td>{c.email}</td><td>{c.position||"—"}</td>
                        <td>{c.project}</td><td>{c.customer||"—"}</td>
                        <td style={{whiteSpace:"nowrap"}}>
                          <button className="btn-light" onClick={()=>{setEditId(c.id);setEditRow(c);}}>Edit</button>{" "}
                          <button className="btn-light" onClick={()=>del(c.id)}>×</button>
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
