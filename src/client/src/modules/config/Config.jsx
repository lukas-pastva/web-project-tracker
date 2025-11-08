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
        <section className="card config-wrap" style={{ maxWidth:600 }}>
          <h2>Configuration</h2>

          {/* theme -------------------------------------------------- */}
          <h3 style={{ marginTop:"1.2rem" }}>Theme</h3>
          <label style={{ marginRight:"1rem" }}>
            <input
              type="radio"
              name="theme"
              value="technical"
              checked={theme === "technical"}
              onChange={() => setTheme("technical")}
            /> Technical
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              value="jira-like"
              checked={theme === "jira-like"}
              onChange={() => setTheme("jira-like")}
            /> Jira-like
          </label>

          {/* colour-scheme ----------------------------------------- */}
          <h3 style={{ marginTop:"1.2rem" }}>Colour-scheme mode</h3>
          {["light","dark","auto"].map((m) => (
            <label key={m} style={{ marginRight:"1rem" }}>
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
              /> {m}
            </label>
          ))}

          {/* projects list ----------------------------------------- */}
          <h3 style={{ marginTop:"1.2rem" }}>Projects</h3>
          {projects.length === 0 ? (
            <p><em>No projects yet</em></p>
          ) : (
            <ul style={{ listStyle:"none", paddingLeft:0 }}>
              {projects.map((p) => (
                <li
                  key={p.id}
                  style={{
                    display      :"flex",
                    alignItems   :"center",
                    gap          :".4rem",
                    marginBottom :".35rem",
                  }}
                >
                  {editingId === p.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ flex:1 }}
                        autoFocus
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
                      <span style={{ flex:1 }}>{p.name}</span>
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
                        className="btn-light"
                        onClick={() => setDeleteId(p.id)}
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
          <div style={{ display:"flex", gap:".6rem" }}>
            <input
              value={newProj}
              onChange={(e) => setNewProj(e.target.value)}
              placeholder="New project name"
              style={{ flex:1 }}
            />
            <button
              className="btn"
              onClick={addProject}
              disabled={!newProj.trim()}
            >
              Add
            </button>
          </div>

          {/* save global config ------------------------------------ */}
          <div style={{ marginTop:"1.5rem" }}>
            <button className="btn" onClick={save}>Save config</button>
            {saved && (
              <span className="msg-success" style={{ marginLeft:".6rem" }}>
                ✓ Saved
              </span>
            )}
          </div>

          {/* global assets download -------------------------------- */}
          <div style={{ textAlign:"right", marginTop:".8rem" }}>
            <a
              className="btn-icon"
              href="/api/images.zip"
              title="Download ALL assets (images, notes, contacts)"
            >
              ⬇︎
            </a>
          </div>
        </section>
      </main>

      {/* delete-confirm modal ------------------------------------- */}
      {deleteId !== null && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <p style={{ marginTop:0 }}>
              Delete this project?<br />
              <small>All its tasks will be removed.</small>
            </p>
            <div style={{
              marginTop:"1rem",
              display:"flex",
              gap:".6rem",
              justifyContent:"center",
            }}>
              <button
                className="btn"
                onClick={async () => {
                  await confirmDeleteProject(deleteId);
                  setDeleteId(null);
                }}
              >
                Delete
              </button>
              <button
                className="btn-light"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
