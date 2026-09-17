import React from "react";
import { projects } from "../../data";
import { Title } from "../common/Title";

export function Projects() {
  return (
    <div className="module">
      <Title k="PROJECT INTELLIGENCE" t="Project pulse" />
      <div className="cards">
        {projects.map(x => (
          <article className="project" key={x[0]}>
            <i className={x[4]} />
            <h3>{x[0]}</h3>
            <span>{x[1]}</span>
            <div>
              <b>
                {x[2]}
                <small> Actions</small>
              </b>
              <b>
                {x[3]}
                <small> Blockers</small>
              </b>
            </div>
            <hr />
          </article>
        ))}
      </div>
    </div>
  );
}

export default Projects;
