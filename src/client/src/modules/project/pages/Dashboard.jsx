import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import Header from "../../../components/Header.jsx";
import api from "../api.js";
import TaskForm from "../components/TaskForm.jsx";
import TaskTable from "../components/TaskTable.jsx";

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

  /* unique customers for this project */
  const customers = useMemo(
    () => [...new Set(tasks.map(t => t.customer).filter(Boolean))],
    [tasks],
  );

  return (
    <>
      <Header />
      {err && <p style={{ color: "#c00", padding: "0 1rem" }}>{err}</p>}

      <main>
        <TaskForm
          projectId={pid}
          onSave={save}
          customers={customers}
          tasks={tasks /* used for auto-fill */}
        />
        <TaskTable
          rows={tasks}
          onUpdate={update}
          onDelete={del}
          customers={customers /* used in inline edit list */}
        />
      </main>
    </>
  );
}
