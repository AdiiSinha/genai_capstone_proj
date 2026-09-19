/**
 * BlockerDetail.jsx — Side panel inspecting blocker details & history.
 */
import React from "react";

export function BlockerDetail({ blocker, onClose, onAskAI }) {
  if (!blocker) return null;

  return (
    <div className="drawerBack" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <button className="x" onClick={onClose}>×</button>
        <small className="kicker">DEPENDENCY INSPECTOR</small>
        <h2>{blocker.title}</h2>
        <p className="drawerAction">{blocker.description}</p>

        <section>
          <label>OWNER & IMPACT</label>
          <div className="grid">
            <div className="info"><small>Owner</small><b>{blocker.owner}</b></div>
            <div className="info"><small>Team</small><b>{blocker.team}</b></div>
            <div className="info"><small>Project</small><b>{blocker.project}</b></div>
            <div className="info"><small>Impact Level</small><b>{blocker.impactLevel || "Medium"}</b></div>
          </div>
        </section>

        {blocker.actionPlan && (
          <section>
            <label>RECOMMENDED ACTION PLAN</label>
            <blockquote>“{blocker.actionPlan}”</blockquote>
          </section>
        )}

        {blocker.history && (
          <section>
            <label>TIMELINE HISTORY</label>
            <div className="timeline">
              {blocker.history.map((h, i) => (
                <div key={i}>• {h}</div>
              ))}
            </div>
          </section>
        )}

        <footer>
          <button onClick={() => onAskAI(`Analyze blocker: ${blocker.title} waiting on ${blocker.owner}`)}>
            Ask Copilot →
          </button>
        </footer>
      </aside>
    </div>
  );
}
