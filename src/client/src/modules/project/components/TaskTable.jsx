import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

/* browser-locale, 24-hour clock formatter */
const fmt = (iso) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(iso));

/* helpers for <input type="datetime-local"> */
const isoToInput = (iso) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const inputToIso = (val) => new Date(val).toISOString();

export default function TaskTable({ rows, onUpdate, onDelete, customers }) {
  const [editingId, setEdit]    = useState(null);
  const [form,      setForm]    = useState({});
  const [expandedId, setExpanded] = useState(null);
  const [deleteId,   setDeleteId] = useState(null);

  /* toggle notes for a row (skip if that row is in edit mode) */
  const toggle = (id) =>
    editingId === id
      ? null
      : setExpanded(expandedId === id ? null : id);

  /* begin inline edit */
  function beginEdit(e, t) {
    e.stopPropagation();                 // stop row toggle
    setForm({
      name       : t.name,
      customer   : t.customer ?? "",
      startedAt  : isoToInput(t.startedAt),
      finishedAt : t.finishedAt ? isoToInput(t.finishedAt) : "",
      notes      : t.notes ?? "",
    });
    setEdit(t.id);
  }

  /* save inline edit */
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

  return (
    <>
      <section className="card">
        <h3>Tasks</h3>
        {rows.length === 0 && <p><em>No tasks yet</em></p>}

        {rows.length > 0 && (
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Customer</th>
                <th>Start</th>
                <th>End</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((t) => (
                <React.Fragment key={t.id}>
                  {/* clickable main row */}
                  <tr
                    className="clickable-row"
                    onClick={() => toggle(t.id)}
                  >
                    <td>{t.name}</td>
                    <td>{t.customer || "—"}</td>
                    <td>{fmt(t.startedAt)}</td>
                    <td>{t.finishedAt ? fmt(t.finishedAt) : "—"}</td>
                    <td className="notes-snippet">
                      {t.notes
                        ? `${t.notes.slice(0, 60)}${t.notes.length > 60 ? "…" : ""}`
                        : "—"}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(t.id);
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>

                  {/* inline edit row */}
                  {editingId === t.id && (
                    <tr>
                      <td colSpan={6}>
                        <form
                          onSubmit={save}
                          style={{
                            display: "flex",
                            gap: ".4rem",
                            flexWrap: "wrap",
                            alignItems: "flex-start",
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
                            list="customers-edit"
                            value={form.customer}
                            onChange={(e) =>
                              setForm({ ...form, customer: e.target.value })
                            }
                          />
                          <datalist id="customers-edit">
                            {customers.map((c) => (
                              <option key={c} value={c} />
                            ))}
                          </datalist>
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

                  {/* expanded notes row */}
                  {expandedId === t.id && t.notes && (
                    <tr>
                      <td colSpan={6} className="notes-full">
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

      {/* delete-confirm modal (unchanged) */}
      {deleteId !== null && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <p style={{ marginTop: 0 }}>Delete this task?</p>
            <div style={{ marginTop: "1rem", display: "flex", gap: ".6rem", justifyContent: "center" }}>
              <button
                className="btn"
                onClick={async () => {
                  await onDelete(deleteId);
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
