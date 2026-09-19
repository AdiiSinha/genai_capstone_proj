/**
 * ActionsList.jsx — Action Items tab panel for the project inspector.
 */
import React from "react";

export function ActionsList({ actions }) {
  return (
    <div className="pjTabSection">
      <div className="pjActionsList">
        {actions.map((act, idx) => (
          <div className="pjActionItem" key={idx}>
            <div className="pjActionLeft">
              <span className={`pjPrioDot ${act.priority}`} />
              <div>
                <h4>{act.title}</h4>
                <p>{act.why}</p>
              </div>
            </div>
            <div className="pjActionRight">
              <span className="pjDuePill">{act.due}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
