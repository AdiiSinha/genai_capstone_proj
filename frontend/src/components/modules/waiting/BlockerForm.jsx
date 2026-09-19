/**
 * BlockerForm.jsx — Form modal for tracking a new dependency/blocker.
 */
import React from "react";

export function BlockerForm({ onClose, onSubmit }) {
  return (
    <div className="drawerBack" onClick={onClose}>
      <form className="draft" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <button type="button" className="x" onClick={onClose}>×</button>
        <small className="kicker">NEW DEPENDENCY</small>
        <h2>Track a New Blocker</h2>

        <label>
          Title
          <input name="title" required placeholder="e.g. Q3 Forecast Excel workbook" />
        </label>
        <label>
          Description
          <textarea name="description" rows="3" required placeholder="What are you waiting for?" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label>
            Owner Name
            <input name="owner" required placeholder="e.g. Elena Rossi" />
          </label>
          <label>
            Owner Email
            <input name="email" type="email" required placeholder="elena.rossi@company.com" />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label>
            Team
            <input name="team" required placeholder="e.g. Finance" />
          </label>
          <label>
            Project
            <input name="project" required placeholder="e.g. Growth Planning" />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label>
            Task Affected
            <input name="task" required placeholder="e.g. Finalize leadership pack" />
          </label>
          <label>
            Deadline (Hours from now)
            <input name="deadline" type="number" defaultValue="24" required />
          </label>
        </div>
        <label>
          Urgency
          <select name="urgency" defaultValue="Medium">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </label>

        <footer>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">✦ Start Tracking</button>
        </footer>
      </form>
    </div>
  );
}
