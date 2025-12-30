import React from "react";
import Header from "../../components/Header.jsx";

export default function HelpPage() {
  return (
    <>
      <Header />

      <main>
        <section className="card help-content" style={{ maxWidth: 800 }}>
          <h2>Getting Started</h2>

          <p className="text-muted">
            Project Tracker helps you manage projects, track time spent on tasks,
            and organize contacts. It's a self-hosted solution built with React
            and Express.
          </p>

          <div className="help-section">
            <h3>Features Overview</h3>
            <div className="feature-grid">
              <div className="feature-item">
                <strong>Projects</strong>
                <span className="text-muted">Create and manage multiple projects</span>
              </div>
              <div className="feature-item">
                <strong>Task Tracking</strong>
                <span className="text-muted">Log tasks with start/end times and notes</span>
              </div>
              <div className="feature-item">
                <strong>Time Summary</strong>
                <span className="text-muted">Monthly and total duration calculations</span>
              </div>
              <div className="feature-item">
                <strong>Contacts</strong>
                <span className="text-muted">Associate contacts with tasks</span>
              </div>
              <div className="feature-item">
                <strong>File Attachments</strong>
                <span className="text-muted">Paste screenshots directly into notes</span>
              </div>
              <div className="feature-item">
                <strong>Export</strong>
                <span className="text-muted">Download all data and assets</span>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h3>Tips</h3>
            <ul className="help-list">
              <li>
                <strong>Quick task entry:</strong> Click "+ New Task" to expand
                the form. The customer field auto-completes from previous entries.
              </li>
              <li>
                <strong>Paste screenshots:</strong> In any notes field, paste images
                directly from your clipboard. They'll be uploaded and embedded automatically.
              </li>
              <li>
                <strong>Inline editing:</strong> Click any task row to expand it,
                then click "Edit" to modify details.
              </li>
              <li>
                <strong>Sorting:</strong> Click column headers to sort the task list.
                Monthly subtotals appear when sorted by start date.
              </li>
              <li>
                <strong>Export data:</strong> Use the "Export" button to download
                all project assets including images, notes, and contacts.
              </li>
            </ul>
          </div>

          <div className="help-section">
            <h3>Keyboard Navigation</h3>
            <p className="text-muted">
              In image galleries, use arrow keys to navigate and Escape to close.
              Press Escape while editing to close the edit form.
            </p>
          </div>

          <div className="help-section">
            <h3>Data Storage</h3>
            <p className="text-muted">
              All data is stored in a MariaDB database. The application runs in a
              Docker container and can be self-hosted anywhere. Database migrations
              run automatically on first startup.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
