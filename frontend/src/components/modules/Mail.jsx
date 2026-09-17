import React from "react";
import { Title } from "../common/Title";

export function Mail({ m, ask, reply, flag, important }) {
  return (
    <div className="module">
      <Title k="COMMUNICATION" t="Inbox intelligence" />
      <p className="sub">Real Microsoft Graph mail, with concise AI actions.</p>
      {m.map(x => (
        <article className="mail" key={x.id}>
          <span>{(x.from?.emailAddress?.name || "?").slice(0, 1).toUpperCase()}</span>
          <div>
            <div className="mailMeta">
              <b>{x.from?.emailAddress?.name || x.from?.emailAddress?.address || "Unknown sender"}</b>
              <small>{new Date(x.receivedDateTime).toLocaleString()}</small>
            </div>
            <h3>{x.subject || "(No subject)"}</h3>
            <p>{x.bodyPreview || "No preview available."}</p>
            <div className="mailActions">
              <button
                onClick={() =>
                  ask(
                    `Give me a short, crisp professional response for this email. Subject: ${x.subject || ""}. Body: ${x.bodyPreview || ""}`
                  )
                }
              >
                AI response
              </button>
              <button className="primaryAction" onClick={() => reply(x)}>
                Draft reply
              </button>
              <button onClick={() => flag(x)}>☆ Flag</button>
              <button onClick={() => important(x)}>! Important</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default Mail;
