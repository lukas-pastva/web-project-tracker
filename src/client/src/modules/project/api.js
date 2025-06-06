/* Simple JSON fetch helper – returns JS value or throws. */
async function json(promise) {
  const r = await promise;
  if (r.status === 204) return null;
  if (r.ok) return r.json();
  throw new Error(`HTTP ${r.status} – ${await r.text()}`);
}

/**
 * Project-module client API – tasks, contacts **and screenshot upload**.
 */
export default {
  /* ─── tasks ─────────────────────────────────────────────────── */
  listTasks(projectId) {
    return json(fetch(`/api/projects/${projectId}/tasks`));
  },
  insertTask(projectId, body) {
    return json(
      fetch(`/api/projects/${projectId}/tasks`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(body),
      })
    );
  },
  updateTask(id, body) {
    return json(
      fetch(`/api/tasks/${id}`, {
        method : "PUT",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(body),
      })
    );
  },
  deleteTask(id) {
    return json(fetch(`/api/tasks/${id}`, { method: "DELETE" }));
  },

  /* ─── contacts ─────────────────────────────────────────────── */
  listContacts(taskId)   { return json(fetch(`/api/tasks/${taskId}/contacts`)); },
  insertContact(tid, p)  { return json(fetch(`/api/tasks/${tid}/contacts`,   { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(p) })); },
  updateContact(cid, p)  { return json(fetch(`/api/contacts/${cid}`,         { method:"PUT",  headers:{ "Content-Type":"application/json" }, body:JSON.stringify(p) })); },
  deleteContact(cid)     { return json(fetch(`/api/contacts/${cid}`,         { method:"DELETE" })); },
  listAllContacts(f = {}) {
    const qs = new URLSearchParams(f).toString();
    return json(fetch(`/api/contacts${qs ? "?" + qs : ""}`));
  },

  /* ─── screenshot upload  ───────────────────────────────── */
  uploadImage(blob) {
    const fd = new FormData();
    fd.append("file", blob, "screenshot.png");
    return json(fetch("/api/uploads", { method: "POST", body: fd }));
  },
};