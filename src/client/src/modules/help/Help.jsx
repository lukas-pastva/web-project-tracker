import React from "react";
import Header from "../../components/Header.jsx";

export default function HelpPage() {
  return (
    <>
      <Header />

      <main>
        <section className="card" style={{ maxWidth: "850px" }}>
          <h2 style={{ marginTop: 0 }}>Welcome to Web-Baby 👶🍼</h2>

          <p>
            Web-Baby is a tiny <strong>React + Express</strong> app that lets
            new parents quickly log feeds, visualise intake, and track weight –
            all in a single container you can self-host anywhere.
          </p>

          <h3>Pages at a glance</h3>
          <ul>
            <li><strong>Today</strong> – add feeds; stacked bar shows <em>types + total</em>.</li>
            <li><strong>All&nbsp;days</strong> – full timeline since birth.</li>
            <li><strong>Weight</strong> – log &amp; visualise daily weight.</li>
            <li><strong>Config</strong> – theme, baby details, hidden feed types.</li>
            <li><strong>Help</strong> – you’re here!</li>
          </ul>

          <h3>Keyboard shortcuts</h3>
          <table>
            <thead><tr><th>Key</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td><kbd>T</kbd></td><td>Today</td></tr>
              <tr><td><kbd>A</kbd></td><td>All&nbsp;days</td></tr>
              <tr><td><kbd>C</kbd></td><td>Config</td></tr>
              <tr><td><kbd>W</kbd></td><td>Weight</td></tr>
              <tr><td><kbd>H</kbd></td><td>Help</td></tr>
            </tbody>
          </table>

          <h3>FAQ</h3>
          <p><strong>❓ How do I change the baby’s name or birth date?</strong><br/>
             Go to <em>Config</em>, update the fields and click <em>Save</em>.
             Changes are stored in the database instantly.</p>

          <p><strong>❓ Where is my data kept?</strong><br/>
             Everything lives in a single MariaDB / MySQL database. The Docker
             image ships with migrations that auto-create the tables on first
             run.</p>

          <p><strong>Need more help?</strong> Open an issue on GitHub – PRs and
             questions welcome 🙂</p>
        </section>
      </main>
    </>
  );
}
