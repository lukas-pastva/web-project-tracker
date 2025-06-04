import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import ContactList   from "./ContactList.jsx";

/* ─────────────────────────── helpers ──────────────────────────── */
const fmt = (iso) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
    hour12   : false,
  }).format(new Date(iso));

const isoToInput  = (iso) => iso?.slice(0, 16);
const inputToIso  = (val) => (val ? new Date(val).toISOString() : null);

const diffMs      = (a, b) => new Date(b) - new Date(a);
const fmtDuration = (ms) =>
  ms == null ? "—" :
  `${Math.floor(ms / 3_600_000)}h ${(Math.floor(ms / 60_000) % 60)
    .toString()
    .padStart(2, "0")}m`;

/* ─────────────────────────── component ────────────────────────── */
export default function TaskTable({ rows, onUpdate, onDelete }) {
  /* CRUD / UI state */
  const [editingId,   setEdit]         = useState(null);
  const [form,        setForm]         = useState({});
  const [expandedId,  setExpanded]     = useState(null);
  const [deleteId,    setDeleteId]     = useState(null);
  const [contactTaskId, setContactTaskId] = useState(null);

  /* sorting */
  const [sort, setSort] = useState({ key: "startedAt", asc: true });
  const clickSort = (key) =>
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));

  const sortedRows = useMemo(() => {
    const dir = sort.asc ? 1 : -1;
    return [...rows].sort((a, b) => {
      /* virtual “duration” key */
      if (sort.key === "duration") {
        const dx = diffMs(a.startedAt, a.finishedAt);
        const dy = diffMs(b.startedAt, b.finishedAt);
        return dx === dy ? 0 : dx > dy ? dir : -dir;
      }
      const x = a[sort.key];
      const y = b[sort.key];
      if (x == null && y == null) return 0;
      if (x == null) return -dir;
      if (y == null) return dir;
      return x > y ? dir : -dir;
    });
  }, [rows, sort]);

  /* begin edit */
  function beginEdit(e, t) {
    e.stopPropagation();
    setForm({
      name       : t.name,
      customer   : t.customer ?? "",
      startedAt  : isoToInput(t.startedAt),
      finishedAt : t.finishedAt ? isoToInput(t.finishedAt) : "",
      notes      : t.notes ?? "",
    });
    setEdit(t.id);
  }

  /* save edit */
  async function save(e) {
    e.preventDefault();
    await onUpdate(editingId, {
      name       : form.name,
      customer   : form.customer,
      startedAt  : inputToIso(form.startedAt),
      finishedAt : form.finishedAt ? inputToIso(form.finishedAt) : null,
      notes      : form.notes.trim() || null,
    });
    setEdit(null);
  }

  /* header class helper */
  const hdrClass = (k) =>
    `sortable${sort.key === k ? (sort.asc ? " sort-asc" : " sort-desc") : ""}`;

  /* ─────────────────────────── render ──────────────────────────── */
  return (
    <>
      <section className="card">
        <h3>Tasks</h3>
        {sortedRows.length === 0 ? (
          <p><em>No tasks yet</em></p>
        ) : (
          <table className="tasks-table">
            <thead>
              <tr>
                <th className={hdrClass("name")}       onClick={() => clickSort("name")}>Name</th>
                <th className={hdrClass("customer")}   onClick={() => clickSort("customer")}>Customer</th>
                <th className={hdrClass("startedAt")}  onClick={() => clickSort("startedAt")}>Start</th>
                <th className={hdrClass("finishedAt")} onClick={() => clickSort("finishedAt")}>End</th>
                <th className={hdrClass("duration")}   onClick={() => clickSort("duration")}>Duration</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {sortedRows.map((t) => (
                <React.Fragment key={t.id}>
                  {/* main row -------------------------------------------------- */}
                  <tr>
                    <td>{t.name}</td>
                    <td>{t.customer || "—"}</td>
                    <td>{fmt(t.startedAt)}</td>
                    <td>{t.finishedAt ? fmt(t.finishedAt) : "—"}</td>
                    <td>{t.finishedAt ? fmtDuration(diffMs(t.startedAt, t.finishedAt)) : "—"}</td>
                    <td>
                      {t.notes ? (
                        <>
                          {t.notes.slice(0, 60)}
                          {t.notes.length > 60 && "…"}
                          <button
                            className="btn-light"
                            style={{ marginLeft: ".4rem" }}
                            onClick={() =>
                              setExpanded(expandedId === t.id ? null : t.id)
                            }
                          >
                            {expandedId === t.id ? "Hide" : "Show"}
                          </button>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        className="btn-light"
                        onClick={(e) => beginEdit(e, t)}
                      >
                        Edit
                      </button>{" "}
                      <button
                        className="btn-light"
                        onClick={() => setDeleteId(t.id)}
                      >
                        ×
                      </button>{" "}
                      <button
                        className="btn-light"
                        onClick={() => setContactTaskId(t.id)}
                      >
                        Contacts
                      </button>
                    </td>
                  </tr>

                  {/* inline edit row ------------------------------------------ */}
                  {editingId === t.id && (
                    <tr>
                      <td colSpan={7}>
                        <form
                          onSubmit={save}
                          style={{
                            display      : "flex",
                            gap          : ".4rem",
                            flexWrap     : "wrap",
                            alignItems   : "flex-start",
                          }}
                        >
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
                              setForm({ ...form, finishedAt: e.target.value })
                            }
                          />
                          <textarea
                            value={form.notes}
                            onChange={(e) =>
                              setForm({ ...form, notes: e.target.value })
                            }
                            rows={3}
                            placeholder="Notes (Markdown)"
                            style={{ flex: "1 1 100%" }}
                          />

                          <button className="btn">Save</button>
                          <button
                            type="button"
                            className="btn-light"
                            onClick={() => setEdit(null)}
                          >
                            Cancel
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}

                  {/* expanded Markdown row ----------------------------------- */}
                  {expandedId === t.id && t.notes && (
                    <tr>
                      <td colSpan={7} style={{ background: "var(--row-alt)" }}>
                        <ReactMarkdown>{t.notes}</ReactMarkdown>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* delete-confirm modal */}
      {deleteId !== null && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <p style={{ marginTop: 0 }}>Delete this task?</p>
            <div
              style={{
                marginTop   : "1rem",
                display     : "flex",
                gap         : ".6rem",
                justifyContent: "center",
              }}
            >
              <button
                className="btn"
                onClick={async () => {
                  await onDelete(deleteId);
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

      {/* contacts modal */}
      {contactTaskId !== null && (
        <ContactList
          taskId={contactTaskId}
          onClose={() => setContactTaskId(null)}
        />
      )}
    </>
  );
}
