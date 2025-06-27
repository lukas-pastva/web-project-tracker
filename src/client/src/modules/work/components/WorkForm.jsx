import React, { useState, useEffect, useRef } from "react";

export default function WorkForm({ onSave, works }) {
  /* suggestions */
  const partners = [...new Set(works.map(w => w.partner))];
  const tasks    = [...new Set(works.map(w => w.task))];

  const [partner, setPartner] = useState("");
  const [task,    setTask]    = useState("");
  const [ticketId,setTicket]  = useState("");
  const [time,    setTime]    = useState("");
  const [desc,    setDesc]    = useState("");

  const firstRef = useRef(null);

  const reset = () => {
    setPartner(""); setTask(""); setTicket(""); setTime(""); setDesc("");
  };

  async function submit(e) {
    e.preventDefault();
    await onSave({
      partner,
      task,
      ticketId,
      timeSpent : time ? Number(time) : null,
      description: desc.trim() || null,
    });
    reset();
    e.target.closest("details")?.removeAttribute("open");
  }

  return (
    <details>
      <summary style={{ cursor:"pointer", fontWeight:600 }}
               onClick={() => setTimeout(()=>firstRef.current?.focus(),0)}>
        ➕ Add work item
      </summary>

      <section className="card" style={{ maxWidth:600, marginTop:".8rem" }}>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
          <input ref={firstRef} list="partners" value={partner}
                 onChange={e=>setPartner(e.target.value)} placeholder="Partner" required />
          <datalist id="partners">{partners.map(p=><option key={p} value={p} />)}</datalist>

          <input list="tasks" value={task}
                 onChange={e=>setTask(e.target.value)} placeholder="Task" required />
          <datalist id="tasks">{tasks.map(t=><option key={t} value={t} />)}</datalist>

          <input value={ticketId} onChange={e=>setTicket(e.target.value)} placeholder="Ticket ID" />
          <input type="number" min="0" value={time}
                 onChange={e=>setTime(e.target.value)} placeholder="Time spent (min)" />

          <textarea rows={10} value={desc}
                    onChange={e=>setDesc(e.target.value)}
                    placeholder="Description…" />

          <button className="btn" disabled={!partner || !task}>Save</button>
        </form>
      </section>
    </details>
  );
}
