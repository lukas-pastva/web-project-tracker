import React, { useState, useEffect } from "react";
import { useParams, useLocation }      from "react-router-dom";

export default function Header() {
  const params    = useParams();
  const location  = useLocation();

  /* load project list once */
  const [projects,setProjects] = useState([]);
  useEffect(()=>{
    fetch("/api/projects")
      .then(r=>r.json()).then(setProjects).catch(()=>setProjects([]));
  },[]);

  /* UI */
  return (
    <header className="mod-header">
      <h1>Project-Tracker</h1>

      <nav className="nav-center">
        {projects.map(p=>(
          <a key={p.id}
             href={`/project/${p.id}`}
             className={Number(params.projectId)===p.id ? "active" : ""}>
            {p.name}
          </a>
        ))}
        <a href="/config"
           className={location.pathname==="/config" ? "active":""}>
          Config
        </a>
        <a href="/help"
           className={location.pathname==="/help" ? "active":""}>
          Help
        </a>
      </nav>
    </header>
  );
}
