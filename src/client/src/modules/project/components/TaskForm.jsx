import React, { useState, useEffect, useRef } from "react";
import api from "../api.js";

/* time helpers */
const HALF_HOUR = 30 * 60 * 1000;
const floor30   = d => new Date(Math.floor(d.getTime() / HALF_HOUR) * HALF_HOUR);
const ceil30    = d => new Date(Math.ceil (d.getTime() / HALF_HOUR) * HALF_HOUR);
const toInput   = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
const fromInput = v => new Date(v).toISOString();

/* clipboard → upload → markdown */
async function pasteScreenshot(e, append) {
  const items = e.clipboardData?.items || [];
  for (const it of items) if (it.type.startsWith("image/")) {
    e.preventDefault();
    const blob   = it.getAsFile();
    const { url } = await api.uploadImage(blob).catch(()=>({}));
    if (url) append(`\n![Screenshot](${url})\n`);
  }
}

export default function TaskForm({ projectId, onSave, customers, tasks }) {
  /* state */
  const [name, setName]       = useState("");
  const [customer, setCust]   = useState("");
  const [start, setStart]     = useState("");
  const [end,   setEnd]       = useState("");
  const [notes, setNotes]     = useState("");

  const firstRef = useRef(null);

  /* defaults */
  useEffect(() => {
    const now = new Date();
    setStart(toInput(floor30(now)));
    setEnd  (toInput(ceil30(now)));
  }, []);

  /* autofill when customer picked */
  useEffect(() => {
    if (!customer) return;
    const last = [...tasks].reverse().find(t => t.customer === customer);
    if (last) {
      if (!name)  setName(last.name);
      if (!notes) setNotes(last.notes ?? "");
    }
  }, [customer, tasks, name, notes]);

  async function submit(e) {
    e.preventDefault();
    await onSave(projectId, {
      name,
      customer,
      startedAt : fromInput(start),
      finishedAt: end ? fromInput(end) : null,
      notes     : notes.trim() || null,
    });
    /* reset */
    setName(""); setCust(""); setNotes("");
    const now = new Date();
    setStart(toInput(floor30(now)));
    setEnd  (toInput(ceil30(now)));
    e.target.closest("details")?.removeAttribute("open");
  }

  return (
    <details>
      <summary style={{cursor:"pointer",fontWeight:600,marginBottom:".6rem"}}
               onClick={() => setTimeout(()=>firstRef.current?.focus(),0)}>
        ➕ Add new task
      </summary>

      <section className="card" style={{maxWidth:600}}>
        <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:".6rem"}}>
          <input ref={firstRef} value={name} onChange={e=>setName(e.target.value)} placeholder="Task name" required/>

          <input list="customers" value={customer} onChange={e=>setCust(e.target.value)} placeholder="Customer"/>
          <datalist id="customers">{customers.map(c=><option key={c} value={c}/>)}</datalist>

          <label>Start&nbsp;<input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} required/></label>
          <label>End&nbsp;  <input type="datetime-local" value={end}   onChange={e=>setEnd  (e.target.value)}             /></label>

          <textarea rows={12} style={{flex:"1 1 100%",fontSize:"1.05rem"}}
                    placeholder="Notes (Markdown – just paste screenshots!)"
                    value={notes}
                    onChange={e=>setNotes(e.target.value)}
                    onPaste={e=>pasteScreenshot(e, md=>setNotes(n=>n+md))}/>
          <button className="btn" disabled={!name || !start}>Save</button>
        </form>
      </section>
    </details>
  );
}
