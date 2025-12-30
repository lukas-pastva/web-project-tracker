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

  /* total duration (finished tasks only) */
  const totalMs = useMemo(
    () =>
      rows.reduce(
        (sum, t) => sum + (t.finishedAt ? diff(t.startedAt, t.finishedAt) : 0),
        0
      ),
    [rows]
  );

  /* monthly totals (finished tasks only), by startedAt month */
  const monthKey = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const monthSums = useMemo(() => {
    const sums = new Map();
    for (const t of rows) {
      if (!t.startedAt || !t.finishedAt) continue;
      const key = monthKey(t.startedAt);
      sums.set(key, (sums.get(key) || 0) + diff(t.startedAt, t.finishedAt));
    }
    return sums;
  }, [rows]);

  const fmtMonth = (key) =>
    new Date(`${key}-01T00:00:00Z`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
    });

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>Tasks</h3>
          <span className="text-muted" style={{ fontSize: "0.875rem" }}>
            {rows.length} {rows.length === 1 ? "task" : "tasks"} &middot; {fmtDur(totalMs)} total
          </span>
        </div>
        {sorted.length === 0 ? (
          <div className="empty-state">
            <p>No tasks yet. Create your first task above.</p>
          </div>
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
              {sorted.map((t, idx) => {
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

                const thisMonth = monthKey(t.startedAt);
                const nextMonth =
                  idx + 1 < sorted.length ? monthKey(sorted[idx + 1].startedAt) : null;
                const endOfMonthGroup = sort.key === "startedAt" && thisMonth !== nextMonth;

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
                      <tr className="edit-row">
                        <td colSpan={8}>
                          <form
                            className="inline-edit-form"
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditId(null);
                            }}
                          >
                            <div className="form-row">
                              <div className="form-group" style={{ flex: 2 }}>
                                <label>Task Name</label>
                                <input
                                  value={form.name}
                                  onChange={(e) =>
                                    setForm({ ...form, name: e.target.value })
                                  }
                                  required
                                />
                              </div>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label>Customer</label>
                                <input
                                  value={form.customer}
                                  onChange={(e) =>
                                    setForm({ ...form, customer: e.target.value })
                                  }
                                />
                              </div>
                              <label className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={form.tracked}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      tracked: e.target.checked,
                                    })
                                  }
                                />
                                <span>Tracked</span>
                              </label>
                            </div>

                            <div className="form-row">
                              <div className="form-group">
                                <label>Start Time</label>
                                <input
                                  type="datetime-local"
                                  value={form.startedAt}
                                  onChange={(e) =>
                                    setForm({ ...form, startedAt: e.target.value })
                                  }
                                  required
                                />
                              </div>
                              <div className="form-group">
                                <label>End Time</label>
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
                              </div>
                            </div>

                            <div className="form-group">
                              <label>Notes</label>
                              <textarea
                                rows={16}
                                placeholder="Add notes in Markdown. Paste screenshots or files directly."
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
                            </div>

                            <div className="form-actions">
                              <button
                                type="button"
                                className="btn-light"
                                onClick={() => setContactMod(t.id)}
                              >
                                Manage Contacts
                              </button>
                              <div style={{ flex: 1 }} />
                              <button
                                type="button"
                                className="btn-light"
                                onClick={() => setEditId(null)}
                              >
                                Close
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}

                    {/* month subtotal at the end of a month group (only when sorted by start) */}
                    {endOfMonthGroup && (
                      <tr className="month-subtotal">
                        <td colSpan={5} style={{ textAlign: "right", fontWeight: 600 }}>
                          {fmtMonth(thisMonth)} subtotal
                        </td>
                        <td style={{ fontWeight: 600 }}>{fmtDur(monthSums.get(thisMonth) || 0)}</td>
                        <td></td>
                        <td></td>
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
            <tfoot>
              <tr>
                <td colSpan={5} style={{ textAlign: "right", fontWeight: 600 }}>
                  Total
                </td>
                <td style={{ fontWeight: 600 }}>{fmtDur(totalMs)}</td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
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
