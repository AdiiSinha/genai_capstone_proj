/**
 * BlockersList.jsx — Blockers & Risks tab panel for the project inspector.
 */
import React from "react";

export function BlockersList({ blockers, projectName, resolvedBlockers, onResolve }) {
  if (blockers.length === 0) {
    return (
      <div className="pjTabSection">
        <div className="pjEmptyState">
          <span className="pjEmptyIcon">🎉</span>
          <h4>No Active Blockers</h4>
          <p>All dependencies cleared for {projectName}. Development is proceeding smoothly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pjTabSection">
      <div className="pjBlockersList">
        {blockers.map(b => {
          const isResolved = resolvedBlockers[b.id];
          return (
            <div
              className={`pjBlockerCard ${b.severity.toLowerCase()} ${isResolved ? "resolved" : ""}`}
              key={b.id}
            >
              <div className="pjBlockerTop">
                <span className={`pjSevTag ${b.severity.toLowerCase()}`}>
                  {b.severity} Blocker
                </span>
                <span className="pjBlockerId">{b.id}</span>
                <span className="pjBlockerDate">Reported: {b.reportedDate}</span>
              </div>

              <h4>{b.title}</h4>
              <p className="pjImpactText"><strong>Impact:</strong> {b.impact}</p>

              <div className="pjBlockerFooter">
                <div className="pjOwnerInfo">
                  <span className="pjOwnerLabel">Owner / Lead:</span>
                  <span className="pjOwnerName">👤 {b.owner}</span>
                </div>
                <div className="pjBlockerActions">
                  {isResolved ? (
                    <span className="pjResolvedBadge">✓ Marked Resolved</span>
                  ) : (
                    <button className="pjResolveBtn" onClick={() => onResolve(b.id)}>
                      ⚡ Escalate & Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
