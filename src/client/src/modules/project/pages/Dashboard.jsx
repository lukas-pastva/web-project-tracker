import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import Header      from "../../../components/Header.jsx";
import api         from "../api.js";
import TaskForm    from "../components/TaskForm.jsx";
import TaskTable   from "../components/TaskTable.jsx";

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const pid = Number(projectId);

  const [tasks, setTasks] = useState([]);
  const [err,   setErr]   = useState("");

  /* load tasks */
  const reload = () =>
    api.listTasks(pid).then(setTasks).catch((e) => setErr(e.message));
  useEffect(reload, [pid]);

  const save   = (_, body) => api.insertTask(pid, body).then(reload).catch((e) => setErr(e.message));
  const update = (id, b)   => api.updateTask(id,  b).then(reload).catch((e) => setErr(e.message));
  const del    = (id)      => api.deleteTask(id)  .then(reload).catch((e) => setErr(e.message));

  /* unique customers for autocomplete */
  const customers = useMemo(
    () => [...new Set(tasks.map((t) => t.customer).filter(Boolean))],
    [tasks]
  );

  return (
    <>
      <Header />

      <main>
        {err && (
          <div className="error-message">
            {err}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <TaskForm
            projectId={pid}
            onSave={save}
            customers={customers}
            tasks={tasks}
          />
          <a
            className="btn-light"
            href={`/api/projects/${pid}/images.zip`}
            title="Download project assets"
            style={{ fontSize: "0.875rem" }}
          >
            Export
          </a>
        </div>

        <TaskTable
          rows={tasks}
          onUpdate={update}
          onDelete={del}
        />
      </main>
    </>
  );
}
