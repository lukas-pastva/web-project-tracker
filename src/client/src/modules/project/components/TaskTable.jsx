import React, { useState, useMemo, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm     from "remark-gfm";
import api           from "../api.js";
import ContactList   from "./ContactList.jsx";

/* ───────── helpers ───────── */
const fmt = (iso) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(iso));

const isoToLocal = (iso) =>
  iso
    ? new Date(
        new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16)
    : "";

const toIso = (v) => (v ? new Date(v).toISOString() : null);

const diff = (a, b) => new Date(b) - new Date(a);
const fmtDur = (ms) =>
  ms == null
    ? "—"
    : `${Math.floor(ms / 3_600_000)}h ${(Math.floor(ms / 60_000) % 60)
        .toString()
        .padStart(2, "0")}m`;

/* pull Markdown image URLs (for gallery) */
function imgUrls(md = "") {
  const out = [];
  const re = /!\[[^\]]*]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(md)) !== null) out.push(m[1]);
  return out;
}

/* ───────── clipboard helpers ───────── */
const imageExt = /\.(png|jpe?g|gif|bmp|webp|avif)$/i;
const isImage = (file) =>
  file.type.startsWith("image/") && imageExt.test(file.name || "");

async function pasteFiles(e, append) {
  const items = Array.from(e.clipboardData?.items || []).filter(
    (it) => it.kind === "file"
  );
  if (!items.length) return;
  e.preventDefault();

  const files = await Promise.all(items.map((it) => it.getAsFile()));
  const preferLinks = files.some((f) => !isImage(f));

  for (const file of files) {
    if (!file) continue;
    const { url } = await api.uploadImage(file).catch(() => ({}));
    if (!url) continue;

    const md =
      !preferLinks && isImage(file)
        ? `\n![${file.name}](${url})\n`
        : `\n[${file.name}](${url})\n`;

    append(md);
  }
}

/* ───────── component ───────── */
export default function TaskTable({ rows, onUpdate, onDelete }) {
  const [editId, setEditId]     = useState(null);
  const [form,   setForm]       = useState({});
  const [expId,  setExp]        = useState(null);
  const [delId,  setDel]        = useState(null);
  const [gallery,setGallery]    = useState(null);
  const [contactMod,setContactMod] = useState(null);

  /* contacts cache */
  const [contacts, setContacts] = useState({});
  const loadContacts = async (id) => {
    const list = await api.listContacts(id).catch(() => []);
    setContacts((c) => ({ ...c, [id]: list }));
  };
  useEffect(() => {
    if (expId && contacts[expId] == null) loadContacts(expId);
  }, [expId, contacts]);

  /* gallery keyboard nav */
  useEffect(() => {
    if (!gallery) return;
    const onKey = (e) => {
      if (e.key === "Escape") setGallery(null);
      if (e.key === "ArrowRight")
        setGallery((g) => ({ ...g, idx: (g.idx + 1) % g.urls.length }));
      if (e.key === "ArrowLeft")
        setGallery((g) => ({
          ...g,
          idx: (g.idx - 1 + g.urls.length) % g.urls.length,
        }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery]);

  /* debounced autosave */
  const saveTimer = useRef(null);
  useEffect(() => {
    if (editId == null) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate(editId, {
        tracked   : form.tracked,
        name      : form.name,
        customer  : form.customer,
        startedAt : toIso(form.startedAt),
        finishedAt: form.finishedAt ? toIso(form.finishedAt) : null,
        notes     : form.notes.trim() || null,
      });
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [form, editId, onUpdate]);

  /* quick tracked toggle from list */
  const toggleTracked = (t) => onUpdate(t.id, { tracked: !t.tracked });

  /* sorting */
  const [sort, setSort] = useState({ key: "startedAt", asc: false });
  const sorted = useMemo(() => {
    const dir = sort.asc ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === "duration") {
        const dx = diff(a.startedAt, a.finishedAt);
        const dy = diff(b.startedAt, b.finishedAt);
        return dx === dy ? 0 : dx > dy ? dir : -dir;
      }
      const x = a[sort.key],
        y = b[sort.key];
      if (x == null && y == null) return 0;
      if (x == null) return -dir;
      if (y == null) return dir;
      return x > y ? dir : -dir;
    });
  }, [rows, sort]);

  const hdr = (k) =>
    `sortable${
      sort.key === k ? (sort.asc ? " sort-asc" : " sort-desc") : ""
    }`;

  const beginEdit = (e, t) => {
    e.stopPropagation();
    setForm({
      tracked   : t.tracked,
      name      : t.name,
      customer  : t.customer ?? "",
      startedAt : isoToLocal(t.startedAt),
      finishedAt: t.finishedAt ? isoToLocal(t.finishedAt) : "",
      notes     : t.notes ?? "",
    });
    setEditId(t.id);
  };

  /* ───────── UI ───────── */
  return (
    <>
      <section className="card">
        <h3>Tasks</h3>
        {sorted.length === 0 ? (
          <p>
            <em>No tasks yet</em>
          </p>
        ) : (
          <table className="tasks-table">
            <thead>
              <tr>
                <th style={{ width: 1 }}>✓</th>
                {["name", "customer", "startedAt", "finishedAt", "duration"].map(
                  (k) => (
                    <th
                      key={k}
                      className={hdr(k)}
                      onClick={() =>
                        setSort({
                          key: k,
                          asc: sort.key === k ? !sort.asc : true,
                        })
                      }
                    >
                      {k === "startedAt"
                        ? "Start"
                        : k === "finishedAt"
                        ? "End"
                        : k.charAt(0).toUpperCase() + k.slice(1)}
                    </th>
                  )
                )}
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const imgs = imgUrls(t.notes || "");
                const mdComponents = {
                  img: ({ node, ...props }) => (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <img
                      {...props}
                      className="shot-thumb"
                      onClick={() =>
                        setGallery({
                          urls: imgs,
                          idx: imgs.indexOf(props.src),
                        })
                      }
                    />
                  ),
                };

                return (
                  <React.Fragment key={t.id}>
                    {/* summary row */}
                    <tr
                      className="clickable-row"
                      onClick={() => setExp(expId === t.id ? null : t.id)}
                    >
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-icon"
                          title={t.tracked ? "Unmark" : "Mark as tracked"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTracked(t);
                          }}
                        >
                          {t.tracked ? "✓" : "○"}
                        </button>
                      </td>
                      <td>{t.name}</td>
                      <td>{t.customer || "—"}</td>
                      <td>{fmt(t.startedAt)}</td>
                      <td>{t.finishedAt ? fmt(t.finishedAt) : "—"}</td>
                      <td>
                        {t.finishedAt
                          ? fmtDur(diff(t.startedAt, t.finishedAt))
                          : "—"}
                      </td>
                      <td className="notes-snippet">
                        {t.notes
                          ? `${t.notes.slice(0, 60)}${
                              t.notes.length > 60 ? "…" : ""
                            }`
                          : "—"}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <a
                          href={`/api/tasks/${t.id}/images.zip`}
                          className="btn-icon"
                          title="Download task assets"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ⬇︎
                        </a>{" "}
                        <button
                          className="btn-light"
                          onClick={(e) => {
                            e.stopPropagation();
                            beginEdit(e, t);
                          }}
                        >
                          Edit
                        </button>{" "}
                        <button
                          className="btn-light"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDel(t.id);
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>

                    {/* inline edit */}
                    {editId === t.id && (
                      <tr>
                        <td colSpan={8}>
                          <form
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: ".4rem",
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditId(null);
                            }}
                          >
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: ".25rem",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={form.tracked}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    tracked: e.target.checked,
                                  })
                                }
                              />{" "}
                              Tracked
                            </label>
                            <input
                              value={form.name}
                              onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                              }
                              required
                            />
                            <input
                              value={form.customer}
                              onChange={(e) =>
                                setForm({ ...form, customer: e.target.value })
                              }
                            />
                            <input
                              type="datetime-local"
                              value={form.startedAt}
                              onChange={(e) =>
                                setForm({ ...form, startedAt: e.target.value })
                              }
                              required
                            />
                            <input
                              type="datetime-local"
                              value={form.finishedAt}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  finishedAt: e.target.value,
                                })
                              }
                            />
                            <textarea
                              rows={24}
                              style={{
                                flex: "1 1 100%",
                                fontSize: "1.05rem",
                              }}
                              placeholder="Notes…"
                              value={form.notes}
                              onChange={(e) =>
                                setForm({ ...form, notes: e.target.value })
                              }
                              onPaste={(e) =>
                                pasteFiles(e, (md) =>
                                  setForm((f) => ({
                                    ...f,
                                    notes: f.notes + md,
                                  }))
                                )
                              }
                            />
                            <button
                              type="button"
                              className="btn-light"
                              onClick={() => setContactMod(t.id)}
                            >
                              Manage contacts…
                            </button>
                            <button
                              type="button"
                              className="btn-light"
                              onClick={() => setEditId(null)}
                            >
                              Close
                            </button>
                          </form>
                        </td>
                      </tr>
                    )}

                    {/* expanded row */}
                    {expId === t.id && (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ background: "var(--row-alt)" }}
                        >
                          {t.notes && editId !== t.id && (
                            <div className="notes-full">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={mdComponents}
                              >
                                {t.notes}
                              </ReactMarkdown>
                            </div>
                          )}

                          <h4 style={{ marginTop: t.notes ? "1rem" : 0 }}>
                            Contacts
                          </h4>
                          <div className="contacts-box">
                            {contacts[t.id] == null ? (
                              <p>
                                <em>Loading…</em>
                              </p>
                            ) : contacts[t.id].length ? (
                              <table style={{ width: "100%" }}>
                                <thead>
                                  <tr>
                                    <th>Email</th>
                                    <th>Name</th>
                                    <th>Position</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {contacts[t.id].map((c) => (
                                    <tr key={c.id}>
                                      <td>{c.email}</td>
                                      <td>{c.name}</td>
                                      <td>{c.position || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p>
                                <em>No contacts</em>
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* delete-confirm */}
      {delId != null && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <p style={{ marginTop: 0 }}>Delete this task?</p>
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                gap: ".6rem",
                justifyContent: "center",
              }}
            >
              <button
                className="btn"
                onClick={async () => {
                  await onDelete(delId);
                  setDel(null);
                }}
              >
                Delete
              </button>
              <button className="btn-light" onClick={() => setDel(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* gallery */}
      {gallery && (
        <div
          className="modal-backdrop"
          onClick={() => setGallery(null)}
          style={{ cursor: "zoom-out" }}
        >
          <div
            style={{ position: "absolute", inset: 0 }}
            onClick={(e) => {
              const mid = window.innerWidth / 2;
              setGallery((g) => ({
                ...g,
                idx:
                  e.clientX > mid
                    ? (g.idx + 1) % g.urls.length
                    : (g.idx - 1 + g.urls.length) % g.urls.length,
              }));
            }}
          />
          <img
            src={gallery.urls[gallery.idx]}
            className="gallery-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* contacts modal */}
      {contactMod && (
        <ContactList taskId={contactMod} onClose={() => setContactMod(null)} />
      )}
    </>
  );
}
