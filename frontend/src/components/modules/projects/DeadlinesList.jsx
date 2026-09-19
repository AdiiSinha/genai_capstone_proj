/**
 * DeadlinesList.jsx — Deadlines & Milestones tab panel for the project inspector.
 */
import React from "react";

export function DeadlinesList({ deadlines }) {
  return (
    <div className="pjTabSection">
      <div className="pjDeadlinesList">
        {deadlines.map((d, idx) => (
          <div className="pjDeadlineItem" key={idx}>
            <div className="pjDeadlineDate">
              <span>📆</span>
              <strong>{d.date}</strong>
            </div>
            <div className="pjDeadlineDetails">
              <h4>{d.title}</h4>
              <span className={`pjRiskTag ${d.risk.toLowerCase()}`}>Risk: {d.risk}</span>
            </div>
            <span className="pjDeadlineStatus">{d.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
