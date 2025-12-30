import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { saveConfig, effectiveMode, storedMode } from "../config.js";

export default function Header() {
  const params    = useParams();
  const location  = useLocation();
  const [projects, setProjects] = useState([]);
  const [projCustomer, setProjCustomer] = useState({});
  const [mode, setMode] = useState(storedMode());

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

  useEffect(() => {
    async function loadCustomers() {
      for (const p of projects) {
        if (projCustomer[p.id] != null) continue;
        try {
          const r = await fetch(`/api/projects/${p.id}/tasks`);
          const tasks = await r.json();
          const last = [...tasks].reverse().find((t) => (t.customer || "").trim());
          if (last?.customer) {
            setProjCustomer((m) => ({ ...m, [p.id]: last.customer }));
          }
        } catch (_e) {
          // ignore
        }
      }
    }
    if (projects.length) loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects]);

  function colorForCustomer(name = "") {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    const sat = 60;
    const lig = 45;
    return `hsl(${hue} ${sat}% ${lig}%)`;
  }

  const isActive = (path) => location.pathname === path;

  async function changeMode(m) {
    try {
      await saveConfig({ mode: m });
      document.documentElement.setAttribute("data-mode", effectiveMode(m));
      setMode(m);
    } catch {
      /* ignore */
    }
  }

  const modeIcon = mode === "auto" ? "◐" : mode === "light" ? "○" : "●";
  const modeLabel = mode === "auto" ? "Auto" : mode === "light" ? "Light" : "Dark";

  return (
    <header className="mod-header">
      <h1>Tracker</h1>

      <nav className="nav-center">
        {projects.map((p) => (
          <a
            key={p.id}
            href={`/project/${p.id}`}
            className={Number(params.projectId) === p.id ? "active" : ""}
            style={projCustomer[p.id] ? { "--accent": colorForCustomer(projCustomer[p.id]) } : undefined}
          >
            {p.name}
          </a>
        ))}

        <a href="/contacts" className={isActive("/contacts") ? "active" : ""}>
          Contacts
        </a>
        <a href="/config" className={isActive("/config") ? "active" : ""}>
          Settings
        </a>
        <a href="/help" className={isActive("/help") ? "active" : ""}>
          Help
        </a>
      </nav>

      <button
        className="mode-toggle"
        title={`Theme: ${modeLabel}`}
        aria-label={`Current theme: ${modeLabel}. Click to change.`}
        onClick={() => {
          const next = mode === "auto" ? "light" : mode === "light" ? "dark" : "auto";
          changeMode(next);
        }}
      >
        <span style={{ marginRight: "0.35rem" }}>{modeIcon}</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>{modeLabel}</span>
      </button>
    </header>
  );
}
