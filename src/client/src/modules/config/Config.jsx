import React, { useState, useEffect } from "react";
import Header from "../../components/Header.jsx";
import { loadConfig, saveConfig, effectiveTheme, effectiveMode } from "../../config.js";

export default function ConfigPage() {
  /* ─── global settings ───────────────────────────────────────── */
  const init = loadConfig();
  const [theme, setTheme] = useState(init.theme ?? "technical");
  const [mode,  setMode]  = useState(init.mode  ?? "auto");
  const [saved, setSaved] = useState(false);

  /* ─── projects list & CRUD ──────────────────────────────────── */
  const [projects,  setProjects]  = useState([]);
  const [newProj,   setNewProj]   = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName,  setEditName]  = useState("");

  const [deleteId,  setDeleteId]  = useState(null);

  /* load projects on mount */
  useEffect(() => { reloadProj(); }, []);
  const reloadProj = () =>
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => setProjects([]));

  /* CRUD helpers ------------------------------------------------ */
  async function addProject() {
    if (!newProj.trim()) return;
    const r = await fetch("/api/projects", {
      method : "POST",
      headers: { "Content-Type":"application/json" },
      body   : JSON.stringify({ name:newProj.trim() }),
    });
    if (r.ok) {
      setNewProj("");
      reloadProj();
      window.dispatchEvent(new Event("projectsUpdated"));
    }
  }

  async function renameProject(id, name) {
    if (!name.trim()) return;
    const r = await fetch(`/api/projects/${id}`, {
      method : "PUT",
      headers: { "Content-Type":"application/json" },
      body   : JSON.stringify({ name:name.trim() }),
    });
    if (r.ok) {
      setEditingId(null);
      reloadProj();
      window.dispatchEvent(new Event("projectsUpdated"));
    }
  }

  async function confirmDeleteProject(id) {
    const r = await fetch(`/api/projects/${id}`, { method:"DELETE" });
    if (r.ok || r.status === 204) {
      reloadProj();
      window.dispatchEvent(new Event("projectsUpdated"));
    }
  }

  async function save() {
    await saveConfig({ theme, mode });
    document.documentElement.setAttribute("data-theme", effectiveTheme(theme));
    document.documentElement.setAttribute("data-mode",  effectiveMode(mode));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  /* ─── UI ────────────────────────────────────────────────────── */
  return (
    <>
      <Header />
      <main>
        <section className="card config-wrap" style={{ maxWidth: 640 }}>
          <h2 style={{ marginBottom: "1.5rem" }}>Settings</h2>

          {/* theme -------------------------------------------------- */}
          <div className="config-section">
            <h3>Appearance</h3>
            <div className="config-option">
              <span className="config-label">Theme</span>
              <div className="option-group">
                <label>
                  <input
                    type="radio"
                    name="theme"
                    value="technical"
                    checked={theme === "technical"}
                    onChange={() => setTheme("technical")}
                  />
                  <span>Technical</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="theme"
                    value="jira-like"
                    checked={theme === "jira-like"}
                    onChange={() => setTheme("jira-like")}
                  />
                  <span>Jira-like</span>
                </label>
              </div>
            </div>

            <div className="config-option">
              <span className="config-label">Color Mode</span>
              <div className="option-group">
                {[
                  { value: "auto", label: "Auto" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ].map((m) => (
                  <label key={m.value}>
                    <input
                      type="radio"
                      name="mode"
                      value={m.value}
                      checked={mode === m.value}
                      onChange={() => setMode(m.value)}
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* projects list ----------------------------------------- */}
          <div className="config-section">
            <h3>Projects</h3>
            {projects.length === 0 ? (
              <p className="text-muted" style={{ margin: "1rem 0" }}>
                No projects created yet. Add your first project below.
              </p>
            ) : (
              <ul className="project-list">
                {projects.map((p) => (
                  <li key={p.id} className="project-item">
                    {editingId === p.id ? (
                      <>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{ flex: 1 }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editName.trim()) {
                              renameProject(p.id, editName);
                            }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <button
                          className="btn"
                          disabled={!editName.trim()}
                          onClick={() => renameProject(p.id, editName)}
                        >
                          Save
                        </button>
                        <button
                          className="btn-light"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontWeight: 500 }}>{p.name}</span>
                        <button
                          className="btn-light"
                          onClick={() => {
                            setEditingId(p.id);
                            setEditName(p.name);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => setDeleteId(p.id)}
                          title="Delete project"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* add new project --------------------------------------- */}
            <div className="form-row" style={{ marginTop: "1rem" }}>
              <input
                value={newProj}
                onChange={(e) => setNewProj(e.target.value)}
                placeholder="New project name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newProj.trim()) addProject();
                }}
              />
              <button
                className="btn"
                onClick={addProject}
                disabled={!newProj.trim()}
                style={{ flex: "0 0 auto" }}
              >
                Add Project
              </button>
            </div>
          </div>

          {/* save & actions ----------------------------------------- */}
          <div className="config-actions">
            <button className="btn" onClick={save}>
              Save Settings
            </button>
            {saved && <span className="msg-success">Saved</span>}
            <a
              className="btn-light"
              href="/api/images.zip"
              title="Download all project assets"
              style={{ marginLeft: "auto" }}
            >
              Export All Data
            </a>
          </div>
        </section>
      </main>

      {/* delete-confirm modal ------------------------------------- */}
      {deleteId !== null && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3 style={{ marginBottom: "0.5rem" }}>Delete Project?</h3>
            <p style={{ color: "var(--fg-muted)", fontSize: "0.9rem" }}>
              This will permanently remove the project and all its tasks.
            </p>
            <div style={{
              marginTop: "1.25rem",
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
            }}>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  await confirmDeleteProject(deleteId);
                  setDeleteId(null);
                }}
              >
                Delete
              </button>
              <button className="btn-light" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
