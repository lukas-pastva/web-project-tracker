import React, { useState } from "react";

export default function TaskTable({ rows, onUpdate, onDelete }) {
  const [editingId, setEdit] = useState(null);
  const [form, setForm] = useState({});

  function beginEdit(t) {
    setForm({
      name       : t.name,
      customer   : t.customer ?? "",
      startedAt  : t.startedAt.slice(0, 16),
      finishedAt : t.finishedAt ? t.finishedAt.slice(0, 16) : "",
      notes      : t.notes ?? "",
    });
    setEdit(t.id);
  }

  async function save(e) {
    e.preventDefault();
    await onUpdate(editingId, {
      name       : form.name,
      customer   : form.customer,
      startedAt  : form.startedAt,
      finishedAt : form.finishedAt || null,
      notes      : form.notes.trim() || null,
    });
    setEdit(null);
  }

  return (
    <section className="card">
      <h3>Tasks</h3>
      {rows.length === 0 && <p><em>No tasks yet</em></p>}

      {rows.length > 0 && (
        <table>
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
                <tr>
                  <td>{t.name}</td>
                  <td>{t.customer || "—"}</td>
                  <td>{new Date(t.startedAt).toLocaleString()}</td>
                  <td>
                    {t.finishedAt
                      ? new Date(t.finishedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    {t.notes ? t.notes.slice(0, 60) + (t.notes.length > 60 ? "…" : "") : "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="btn-light" onClick={() => beginEdit(t)}>
                      Edit
                    </button>{" "}
                    <button className="btn-light" onClick={() => onDelete(t.id)}>
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
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
