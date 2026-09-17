import React from "react";
import { Title } from "../common/Title";

export function Calendar({ c, ask }) {
  return (
    <div className="module">
      <Title k="TIME & FOCUS" t="Calendar intelligence" />
      <p className="sub">Your next 7 days from Microsoft Graph.</p>
      {c.map(x => (
        <article className="cal" key={x.id}>
          <strong>{new Date(x.start.dateTime).toLocaleDateString([], { day: "2-digit" })}</strong>
          <div>
            <small>
              {new Date(x.start.dateTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </small>
            <h3>{x.subject}</h3>
            <p>{x.location?.displayName || "No location"}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export default Calendar;
