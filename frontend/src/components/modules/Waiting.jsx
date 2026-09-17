import React from "react";
import { Title } from "../common/Title";

export function Waiting({ ask }) {
  return (
    <div className="module">
      <Title k="DEPENDENCIES" t="What am I waiting for?" />
      <article className="waiting">
        <b>⌛</b>
        <div>
          <em>BLOCKING</em>
          <h3>Database credentials</h3>
          <p>Waiting for DevOps. This is blocking Atlas work.</p>
          <small>Last mentioned · Today 11:08 AM</small>
        </div>
        <button onClick={() => ask("What should I do about the database credentials dependency?")}>
          Prepare follow-up →
        </button>
      </article>
    </div>
  );
}

export default Waiting;
