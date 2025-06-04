import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";

/**
 * Global header with dynamic project navigation.
 * Listens for the custom `projectsUpdated` event so the menu
 * refreshes instantly after a project is created/renamed/deleted.
 */
export default function Header() {
  const params = useParams();
  const location = useLocation();

  const [projects, setProjects] = useState([]);

  const loadProjects = () =>
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => setProjects([]));

  useEffect(() => {
    loadProjects();                       // first load
    const h = () => loadProjects();       // subsequent updates
    window.addEventListener("projectsUpdated", h);
    return () => window.removeEventListener("projectsUpdated", h);
  }, []);

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
        <a
          href="/contacts"
          className={location.pathname === "/contacts" ? "active" : ""}
        >
          Contacts
        </a>
        <a
          href="/config"
          className={location.pathname === "/config" ? "active" : ""}
        >
          Config
        </a>
        <a
          href="/help"
          className={location.pathname === "/help" ? "active" : ""}
        >
          Help
        </a>
      </nav>
    </header>
  );
}
