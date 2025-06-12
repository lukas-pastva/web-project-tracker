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

  const reload = () =>
    api.listTasks(pid).then(setTasks).catch(e => setErr(e.message));
  useEffect(reload, [pid]);

  const save   = (_, body) => api.insertTask(pid, body).then(reload).catch(e => setErr(e.message));
  const update = (id, b)   => api.updateTask(id,  b).then(reload).catch(e => setErr(e.message));
  const del    = id        => api.deleteTask(id)  .then(reload).catch(e => setErr(e.message));

  const customers = useMemo(
    () => [...new Set(tasks.map(t => t.customer).filter(Boolean))],
    [tasks],
  );

  return (
    <>
      <Header />
      {err && <p style={{ color: "#c00", padding: "0 1rem" }}>{err}</p>}

      <main>
        {/* subtle, icon-only project download */}
        <div style={{ textAlign:"right", padding:"0 1rem .3rem" }}>
          <a
            className="btn-icon"
            href={`/api/projects/${pid}/images.zip`}
            title="Download all images for this project (zip)"
          >
            ⬇︎
          </a>
        </div>

        <TaskForm
          projectId={pid}
          onSave={save}
          customers={customers}
          tasks={tasks}
        />
        <TaskTable
          rows={tasks}
          onUpdate={update}
          onDelete={del}
          customers={customers}
        />
      </main>
    </>
  );
}
