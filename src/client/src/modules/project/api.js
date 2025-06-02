/* Simple JSON fetch helper – returns JS value or throws. */
async function json(promise) {
    const r = await promise;
    if (r.status === 204) return null;      // no-content
    if (r.ok) return r.json();
    throw new Error(`HTTP ${r.status} – ${await r.text()}`);
  }
  
  /**
   * Project-module client API.
   *
   * End-points are served by `server/src/modules/project/routes.js`
   * (see server-side code in the roadmap).
   */
  export default {
    /* ───────── tasks in one project ───────────────────────────── */
    listTasks(projectId) {
      return json(fetch(`/api/projects/${projectId}/tasks`));
    },
  
    insertTask(projectId, payload) {
      return json(
        fetch(`/api/projects/${projectId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    },
  
    updateTask(taskId, payload) {
      return json(
        fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    },
  
    deleteTask(taskId) {
      return json(fetch(`/api/tasks/${taskId}`, { method: "DELETE" }));
    },
  };
  