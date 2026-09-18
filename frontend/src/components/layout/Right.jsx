import React from "react";
import { rooms, news } from "../../data";
import Shuttle from "../modules/shuttle";

export function Right({ set }) {
  return (
    <div className="right">
      <small>
        WORKPLACE PULSE <em>● LIVE</em>
      </small>
      <section>
        <b>
          MEETING ROOMS <button onClick={() => set("rooms")}>View all</button>
        </b>
        {rooms.map(x => (
          <div className="rrow" key={x[0]}>
            <span>
              <strong>{x[0]}</strong>
              <small>{x[1]} · {x[2]} seats</small>
            </span>
            <em className={x[3] ? "green" : "red"}>{x[3] ? "Available" : "Busy"}</em>
          </div>
        ))}
      </section>
      <section>
        <b>CAMPUS UPDATES</b>
        {news.map(x => (
          <div className="rnews" key={x[1]}>
            <span>{x[0]}</span>
            <p>
              <strong>{x[1]}</strong>
              <small>{x[2]}</small>
            </p>
          </div>
        ))}
      </section>
      <section>
        <Shuttle compact />
      </section>
    </div>
  );
}

export default Right;
