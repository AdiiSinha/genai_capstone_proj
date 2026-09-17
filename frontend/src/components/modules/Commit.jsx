import React from "react";
import { tasks } from "../../data";
import { Title } from "../common/Title";

export function Commit({ ask }) {
  return (
    <div className="module">
      <Title k="MEMORY & FOLLOW-UP" t="Your commitments" />
      <p className="sub">Extracted from email + synthetic Teams context.</p>
      {tasks.slice(0, 3).map(x => (
        <article className="commit" key={x[0]}>
          <b>◎</b>
          <div>
            <h3>{x[0]}</h3>
            <small>
              {x[2]} · {x[1]}
            </small>
            <p>Detected as an action/commitment that needs follow-up.</p>
          </div>
          <button onClick={() => ask(`How should I follow up on ${x[0]}?`)}>Ask AI →</button>
        </article>
      ))}
    </div>
  );
}

export default Commit;
