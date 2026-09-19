/**
 * CommitFilters.jsx — Toolbar containing search box, category tabs, and dropdown filters.
 */
import React from "react";

export function CommitFilters({
  tab,
  setTab,
  q,
  setQ,
  person,
  setPerson,
  project,
  setProject,
  items,
  summary,
  people,
  projects
}) {
  const tabs = [
    ["all", "All", items.length],
    ["due_today", "Due today", summary.dueToday || 0],
    ["due_soon", "Due soon", items.filter(x => x.status === "due_soon").length],
    ["overdue", "Overdue", summary.overdue || 0],
    ["completed", "Completed", summary.completed || 0]
  ];

  return (
    <div className="cToolbar">
      <div className="cTabs">
        {tabs.map(([id, l, n]) => (
          <button
            key={id}
            className={tab === id ? "on" : ""}
            onClick={() => setTab(id)}
          >
            {l}<em>{n}</em>
          </button>
        ))}
      </div>
      <label className="cSearch">
        ⌕
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search commitments…"
        />
      </label>
      <select value={person} onChange={e => setPerson(e.target.value)}>
        <option value="all">Everyone</option>
        {people.map(x => <option key={x}>{x}</option>)}
      </select>
      <select value={project} onChange={e => setProject(e.target.value)}>
        <option value="all">All projects</option>
        {projects.map(x => <option key={x}>{x}</option>)}
      </select>
    </div>
  );
}
