import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";

export default function Header() {
  const params    = useParams();
  const location  = useLocation();
  const [projects, setProjects] = useState([]);

  const loadProjects = () =>
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => setProjects([]));

  useEffect(() => {
    loadProjects();
    const h = () => loadProjects();
    window.addEventListener("projectsUpdated", h);
    return () => window.removeEventListener("projectsUpdated", h);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="mod-header">
      <h1>Project-Tracker</h1>

      <nav className="nav-center">
        {projects.map((p) => (
          <a
            key={p.id}
            href={`/project/${p.id}`}
            className={Number(params.projectId) === p.id ? "active" : ""}
          >
            {p.name}
          </a>
        ))}

        <a href="/contacts" className={isActive("/contacts") ? "active" : ""}>
          Contacts
        </a>
        <a href="/config"   className={isActive("/config")   ? "active" : ""}>
          Config
        </a>
        <a href="/help"     className={isActive("/help")     ? "active" : ""}>
          Help
        </a>
      </nav>
    </header>
  );
}
