/**
 * Projects.jsx — Thin container shell for the Projects Intelligence module.
 * Manages only selection & tab state. All rendering delegated to sub-components.
 */
import React, { useState } from "react";
import { detailedProjects } from "../../data";
import { Title } from "../common/Title";
import { ProjectKpiBar } from "./projects/ProjectKpiBar";
import { ProjectCard } from "./projects/ProjectCard";
import { ProjectInspector } from "./projects/ProjectInspector";

export function Projects() {
  const [selectedId, setSelectedId] = useState("phoenix");
  const [activeTab, setActiveTab] = useState("blockers");
  const [resolvedBlockers, setResolvedBlockers] = useState({});

  const activeProject = detailedProjects.find(p => p.id === selectedId) || detailedProjects[0];

  function handleResolveBlocker(blockerId) {
    setResolvedBlockers(prev => ({ ...prev, [blockerId]: true }));
  }

  return (
    <div className="module projectsModule">
      <Title k="PROJECT INTELLIGENCE" t="Project pulse & Workspace Insights" />

      <ProjectKpiBar project={activeProject} />

      <div className="cards projectCardsGrid">
        {detailedProjects.map(p => (
          <ProjectCard
            key={p.id}
            project={p}
            isSelected={p.id === selectedId}
            onSelect={setSelectedId}
          />
        ))}
      </div>

      {activeProject && (
        <ProjectInspector
          project={activeProject}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          resolvedBlockers={resolvedBlockers}
          onResolveBlocker={handleResolveBlocker}
        />
      )}
    </div>
  );
}

export default Projects;
