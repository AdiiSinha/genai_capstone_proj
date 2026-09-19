/**
 * ProjectCard.jsx — Selector card for a single project.
 * Click to select and view detailed inspector.
 */
import React from "react";

export function ProjectCard({ project, isSelected, onSelect }) {
  return (
    <article
      className={`pjCard ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(project.id)}
    >
      <div className="pjCardHeader">
        <div className="pjCardHeaderLeft">
          <span className={`pjDotIndicator ${project.color}`} />
          <span className="pjCodeBadge">{project.code}</span>
        </div>
        <span className={`pjStatusPill ${project.color}`}>{project.status}</span>
      </div>

      <h3>{project.name}</h3>
      <p className="pjDescTruncated">{project.description}</p>

      <div className="pjCardStats">
        <div>
          <b>{project.stats.actions}</b>
          <small>Actions</small>
        </div>
        <div>
          <b className={project.blockers.length > 0 ? "redText" : ""}>{project.blockers.length}</b>
          <small>Blockers</small>
        </div>
        <div>
          <b>{project.sprint.progress}%</b>
          <small>Sprint {project.sprint.number}</small>
        </div>
      </div>

      <div className="pjMiniProgressTrack">
        <div
          className={`pjMiniProgressFill ${project.color}`}
          style={{ width: `${project.sprint.progress}%` }}
        />
      </div>
    </article>
  );
}
