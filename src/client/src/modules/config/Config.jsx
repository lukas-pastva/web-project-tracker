import React, { useState, useEffect } from "react";
import Header from "../../components/Header.jsx";
import {
  loadConfig, saveConfig,
  effectiveTheme, effectiveMode,
} from "../../config.js";

export default function ConfigPage() {
  /* cached initial values */
  const init  = loadConfig();
  const [theme,setTheme] = useState(init.theme ?? "technical");
  const [mode ,setMode ] = useState(init.mode  ?? "auto");
  const [title,setTitle] = useState(init.appTitle ?? "Project-Tracker");
  const [saved,setSaved] = useState(false);

  /* project list */
  const [projects,setProjects] = useState([]);
  const [newProj ,setNewProj ] = useState("");
  useEffect(()=>{ reloadProj(); },[]);
  const reloadProj = ()=>fetch("/api/projects").then(r=>r.json()).then(setProjects).catch(()=>setProjects([]));

  async function addProject(){
    if(!newProj.trim()) return;
    const r = await fetch("/api/projects",{
      method:"POST",headers:{ "Content-Type":"application/json"},
      body:JSON.stringify({name:newProj.trim()}),
    });
    if(r.ok){ setNewProj(""); reloadProj(); }
  }

  async function save(){
    await saveConfig({ theme, mode, appTitle:title.trim()||"Project-Tracker" });
    document.documentElement.setAttribute("data-theme", effectiveTheme(theme));
    document.documentElement.setAttribute("data-mode" , effectiveMode(mode));
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  }

  /* UI */
  return (
    <>
      <Header/>
      <main>
        <section className="card config-wrap" style={{maxWidth:600}}>
          <h2>Configuration</h2>

          <h3>Application title</h3>
          <input value={title} onChange={e=>setTitle(e.target.value)}/>

          <h3 style={{marginTop:"1.2rem"}}>Theme</h3>
          <label style={{marginRight:"1rem"}}>
            <input type="radio" name="theme" value="technical"
                   checked={theme==="technical"} onChange={()=>setTheme("technical")}/> Technical
          </label>
          <label>
            <input type="radio" name="theme" value="jira-like"
                   checked={theme==="jira-like"} onChange={()=>setTheme("jira-like")}/> Jira-like
          </label>

          <h3 style={{marginTop:"1.2rem"}}>Colour-scheme mode</h3>
          {["light","dark","auto"].map(m=>(
            <label key={m} style={{marginRight:"1rem"}}>
              <input type="radio" name="mode" value={m}
                     checked={mode===m} onChange={()=>setMode(m)}/> {m}
            </label>
          ))}

          <h3 style={{marginTop:"1.2rem"}}>Projects</h3>
          {projects.length===0 ? <p><em>No projects yet</em></p> :
           <ul>{projects.map(p=><li key={p.id}>{p.name}</li>)}</ul>}
          <div style={{display:"flex",gap:".6rem"}}>
            <input value={newProj} onChange={e=>setNewProj(e.target.value)}
                   placeholder="New project name" style={{flex:1}}/>
            <button className="btn" onClick={addProject} disabled={!newProj.trim()}>Add</button>
          </div>

          <div style={{marginTop:"1.5rem"}}>
            <button className="btn" onClick={save}>Save config</button>
            {saved && <span className="msg-success" style={{marginLeft:".6rem"}}>✓ Saved</span>}
          </div>
        </section>
      </main>
    </>
  );
}
