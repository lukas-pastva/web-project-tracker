/* Simple JSON helper */
async function json(promise) {
  const r = await promise;
  if (r.status === 204) return null;
  if (r.ok) return r.json();
  throw new Error(`HTTP ${r.status} – ${await r.text()}`);
}

export default {
  listWork()          { return json(fetch("/api/work")); },
  insertWork(body)    { return json(fetch("/api/work",       { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) })); },
  updateWork(id, body){ return json(fetch(`/api/work/${id}`, { method:"PUT",  headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) })); },
  deleteWork(id)      { return json(fetch(`/api/work/${id}`, { method:"DELETE" })); },
};
