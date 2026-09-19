/**
 * ProjectKpiBar.jsx — Dynamic KPI summary bar for the active project.
 * Values update automatically when user selects a different project.
 */
import React from "react";

export function ProjectKpiBar({ project }) {
  if (!project) return null;

  const taskCount = project.actions.length + project.stats.openDefects;
  const hasBlockers = project.blockers.length > 0;

  return (
    <div className="pjKpiBar">
      <div className="pjKpi">
        <span className="pjKpiLabel">Active Tasks</span>
        <b className="pjKpiVal">{taskCount} Tasks</b>
        <small className="pjKpiSub">{project.name} Project</small>
      </div>
      <div className="pjKpi">
        <span className="pjKpiLabel">Active Blockers</span>
        <b className={`pjKpiVal ${hasBlockers ? "redText" : "greenText"}`}>
          {project.blockers.length}
        </b>
        <small className="pjKpiSub">
          {hasBlockers
            ? `${project.blockers[0].severity} Blocker`
            : "All Clear · 0 Blockers"}
        </small>
      </div>
      <div className="pjKpi">
        <span className="pjKpiLabel">Pending Actions</span>
        <b className="pjKpiVal cyanText">{project.stats.actions}</b>
        <small className="pjKpiSub">For {project.name}</small>
      </div>
      <div className="pjKpi">
        <span className="pjKpiLabel">Current Sprint</span>
        <b className="pjKpiVal">Sprint {project.sprint.number}</b>
        <small className="pjKpiSub">
          {project.sprint.progress}% · {project.sprint.daysLeft}d left
        </small>
      </div>
    </div>
  );
}
