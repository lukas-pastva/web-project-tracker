/* Simple JSON fetch helper – returns JS value or throws. */
async function json(promise) {
  const r = await promise;
  if (r.status === 204) return null;      // no-content
  if (r.ok) return r.json();
  throw new Error(`HTTP ${r.status} – ${await r.text()}`);
}

/**
 * Project-module client API – now includes Contacts.
 */
export default {
  /* ───────── tasks ────────────────────────────────────────────── */
  listTasks(projectId) {
    return json(fetch(`/api/projects/${projectId}/tasks`));
  },

  insertTask(projectId, payload) {
    return json(
      fetch(`/api/projects/${projectId}/tasks`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(payload),
      })
    );
  },

  updateTask(taskId, payload) {
    return json(
      fetch(`/api/tasks/${taskId}`, {
        method : "PUT",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(payload),
      })
    );
  },

  deleteTask(taskId) {
    return json(fetch(`/api/tasks/${taskId}`, { method: "DELETE" }));
  },

  /* ───────── contacts (NEW) ───────────────────────────────────── */
  listContacts(taskId) {
    return json(fetch(`/api/tasks/${taskId}/contacts`));
  },

  insertContact(taskId, payload) {
    return json(
      fetch(`/api/tasks/${taskId}/contacts`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(payload),
      })
    );
  },

  updateContact(contactId, payload) {
    return json(
      fetch(`/api/contacts/${contactId}`, {
        method : "PUT",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(payload),
      })
    );
  },

  deleteContact(contactId) {
    return json(fetch(`/api/contacts/${contactId}`, { method: "DELETE" }));
  },
};
