import React from "react";
import { rooms } from "../../data";
import { Title } from "../common/Title";

export function Rooms() {
  return (
    <div className="module">
      <Title k="WORKPLACE" t="Meeting room availability" />
      <div className="cards">
        {rooms.map(x => (
          <article className="room" key={x[0]}>
            <i className={x[3] ? "green" : "red"} />
            <h3>{x[0]}</h3>
            <p>
              {x[1]} · {x[2]} seats
            </p>
            <b className={x[3] ? "green" : "red"}>{x[3] ? "Available" : "Busy"}</b>
            <small>{x[3] ? `Available until ${x[4]}` : `Booked until ${x[4]}`}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

export default Rooms;
