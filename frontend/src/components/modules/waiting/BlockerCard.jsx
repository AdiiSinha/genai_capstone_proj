/**
 * BlockerCard.jsx — Card rendering a single dependency/blocker item.
 */
import React from "react";
import { deadlineText, isDueSoon, isOverdue } from "./waitingUtils";

export function BlockerCard({
  blocker,
  now,
  onPrepareFollowUp,
  onResolveClick,
  onDetailsClick,
  onAskAI
}) {
  const overdue = isOverdue(blocker, now);
  const dueSoon = isDueSoon(blocker, now);

  return (
    <article className={`waitingCard ${overdue ? "overdue" : dueSoon ? "dueSoon" : blocker.status === "Completed" ? "completed" : ""}`}>
      <div className="waitingCardTop">
        <div>
          <span className="waitingTag">{blocker.team}</span>
          <h3>{blocker.title}</h3>
          <p>{blocker.description}</p>
        </div>
        <span className={`urgencyBadge ${blocker.urgency.toLowerCase()}`}>
          {blocker.urgency} Priority
        </span>
      </div>

      <div className="waitingMetaGrid">
        <div>
          <small>Waiting on</small>
          <strong>{blocker.owner}</strong>
        </div>
        <div>
          <small>Project</small>
          <strong>{blocker.project}</strong>
        </div>
        <div>
          <small>Deadline</small>
          <strong>{deadlineText(blocker, now)}</strong>
        </div>
        <div>
          <small>Impact</small>
          <strong>{blocker.impact}</strong>
        </div>
      </div>

      <div className="waitingActions">
        {blocker.status !== "Completed" && (
          <button className="primary" onClick={() => onPrepareFollowUp(blocker)}>
            ✦ Draft Follow-up
          </button>
        )}
        {blocker.status !== "Completed" && (
          <button onClick={() => onResolveClick(blocker)}>
            ✓ Mark Resolved
          </button>
        )}
        <button onClick={() => onDetailsClick(blocker)}>
          Inspect Details
        </button>
        <button
          className="ask"
          onClick={() => onAskAI(`What is the status of ${blocker.title}? Who am I waiting for and what is the impact on ${blocker.project}?`)}
        >
          Ask Copilot →
        </button>
      </div>
    </article>
  );
}
