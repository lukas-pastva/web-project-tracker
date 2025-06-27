import React, { useEffect, useState } from "react";
import Header   from "../../../components/Header.jsx";
import api      from "../api.js";
import WorkForm  from "../components/WorkForm.jsx";
import WorkTable from "../components/WorkTable.jsx";

export default function WorkPage() {
  const [rows, setRows] = useState([]);
  const [err,  setErr]  = useState("");

  const reload = () => api.listWork().then(setRows).catch(e=>setErr(e.message));
  useEffect(reload, []);

  const add    = (b) => api.insertWork(b)       .then(reload).catch(e=>setErr(e.message));
  const update = (id,b)=> api.updateWork(id,b)  .then(reload).catch(e=>setErr(e.message));
  const del    = (id) => api.deleteWork(id)     .then(reload).catch(e=>setErr(e.message));

  return (
    <>
      <Header />
      {err && <p style={{ color:"#c00", padding:"0 1rem" }}>{err}</p>}

      <main>
        <WorkForm onSave={add} works={rows}/>
        <WorkTable rows={rows} onUpdate={update} onDelete={del}/>
      </main>
    </>
  );
}
