/**
 * ProjectInspector.jsx — The deep-dive project inspector panel.
 * Renders hero, manager card, sprint tracker, tabs and tab content.
 * Imports sub-panels BlockersList, TeamGrid, DeadlinesList, ActionsList.
 */
import React from "react";
import { BlockersList } from "./BlockersList";
import { TeamGrid } from "./TeamGrid";
import { DeadlinesList } from "./DeadlinesList";
import { ActionsList } from "./ActionsList";

const TABS = [
  { id: "blockers", label: "🚨 Blockers & Risks", countKey: "blockers" },
  { id: "team", label: "👥 Team Members", countKey: "team" },
  { id: "deadlines", label: "📅 Deadlines & Milestones", countKey: "deadlines" },
  { id: "actions", label: "⚡ Action Items", countKey: "actions" }
];

export function ProjectInspector({ project, activeTab, onTabChange, resolvedBlockers, onResolveBlocker }) {
  if (!project) return null;

  return (
    <div className="pjDetailInspector">
      {/* Hero Banner */}
      <div className="pjHero">
        <div className="pjHeroMain">
          <div className="pjHeroHeader">
            <h2>{project.name} <span className="pjHeroCode">{project.code}</span></h2>
            <span className={`pjStatusBadge ${project.color}`}>● {project.status}</span>
          </div>
          <p className="pjHeroDesc">{project.description}</p>
        </div>

        {/* Manager Card */}
        <div className="pjManagerBox">
          <div className="pjAvatar">{project.manager.avatar}</div>
          <div className="pjManagerDetails">
            <small>Engineering Manager</small>
            <strong>{project.manager.name}</strong>
            <span>{project.manager.role}</span>
          </div>
          <a href={`mailto:${project.manager.email}`} className="pjContactBtn" title="Email Manager">
            ✉ Email
          </a>
        </div>
      </div>

      {/* Sprint Progress */}
      <div className="pjSprintWidget">
        <div className="pjSprintMeta">
          <div>
            <strong>🏃 {project.sprint.title}</strong>
            <span>{project.sprint.startDate} — {project.sprint.endDate}</span>
          </div>
          <div className="pjSprintRight">
            <b>{project.sprint.progress}% Complete</b>
            <small>{project.sprint.daysLeft} days remaining</small>
          </div>
        </div>
        <div className="pjProgressBarTrack">
          <div className="pjProgressBarFill" style={{ width: `${project.sprint.progress}%` }} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="pjTabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`pjTab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label} ({project[tab.countKey]?.length ?? 0})
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "blockers" && (
        <BlockersList
          blockers={project.blockers}
          projectName={project.name}
          resolvedBlockers={resolvedBlockers}
          onResolve={onResolveBlocker}
        />
      )}
      {activeTab === "team" && <TeamGrid team={project.team} />}
      {activeTab === "deadlines" && <DeadlinesList deadlines={project.deadlines} />}
      {activeTab === "actions" && <ActionsList actions={project.actions} />}
    </div>
  );
}
