import React, { useEffect, useState, useMemo } from "react";
import Header from "../../components/Header.jsx";
import api from "../project/api.js";           // re-use the same API helper

export default function ContactsPage() {
  /* raw data ---------------------------------------------------- */
  const [rows, setRows] = useState([]);
  const [err,  setErr]  = useState("");

  /* filters ----------------------------------------------------- */
  const [q, setQ] = useState({ name:"", email:"", position:"", project:"", customer:"" });

  useEffect(() => {
    api.listAllContacts()
       .then(setRows)
       .catch((e) => setErr(e.message));
  }, []);

  /* derived, client-side filtered list -------------------------- */
  const filtered = useMemo(() => {
    const keys = Object.keys(q).filter((k) => q[k].trim());
    if (keys.length === 0) return rows;
    const inc = (a,b) => a.toLowerCase().includes(b.toLowerCase());
    return rows.filter((r) =>
      keys.every((k) => inc(String(r[k] ?? ""), q[k].trim())),
    );
  }, [rows, q]);

  /* UI ----------------------------------------------------------- */
  return (
    <>
      <Header />
      <main style={{ padding: "1rem" }}>
        <section className="card" style={{ maxWidth: 950 }}>
          <h2 style={{ marginTop: 0 }}>Contacts</h2>

          {err && <p style={{ color: "#c00" }}>{err}</p>}

          {/* filters */}
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
            {["name","email","position","project","customer"].map((k)=>(
              <input
                key={k}
                placeholder={k[0].toUpperCase()+k.slice(1)}
                value={q[k]}
                onChange={(e)=>setQ({...q,[k]:e.target.value})}
              />
            ))}
          </div>

          {/* table */}
          <div style={{ overflowX:"auto", marginTop: "1rem" }}>
            {filtered.length === 0 ? (
              <p><em>No contacts found</em></p>
            ) : (
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Position</th>
                    <th>Project</th><th>Customer</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c)=>(
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.email}</td>
                      <td>{c.position || "—"}</td>
                      <td>{c.project}</td>
                      <td>{c.customer || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
