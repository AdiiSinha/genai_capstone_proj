/**
 * CommitCard.jsx — Individual commitment card component.
 */
import React from "react";
import { fmt, initials, relative } from "./commitUtils";

export function CommitCard({ c, i, complete, evidence, draft, ask }) {
  const done = c.status === "completed";
  const label = {
    overdue: "OVERDUE",
    due_today: "DUE TODAY",
    due_soon: "DUE SOON",
    pending: "PENDING",
    no_deadline: "NO DEADLINE",
    completed: "COMPLETED"
  }[c.status] || "PENDING";

  return (
    <article className={`cCard ${c.status}`} style={{ animationDelay: `${i * 50}ms` }}>
      <div className="cAccent" />
      <div className="cTop">
        <div className="cOrb">{done ? "✓" : "◎"}</div>
        <div className="cMain">
          <div className="cMeta">
            <span className={`badge ${c.status}`}>{label}</span>
            <span>AI {c.confidence || 0}%</span>
            {c.priority === "high" && <b>HIGH PRIORITY</b>}
          </div>
          <h3>{c.title || c.action}</h3>
          <p>{c.action}</p>
          <div className="facts">
            <span>👤 {c.recipientName || c.recipientEmail || "Recipient not identified"}</span>
            {c.project && <span>◇ {c.project}</span>}
            <span>◷ {c.dueLabel || "No deadline"}</span>
            {c.dueAt && <span>{relative(c.dueAt)}</span>}
          </div>
        </div>
        <button className="details" onClick={() => evidence(c)}>Details →</button>
      </div>
      <div className="quote">
        <b>“</b>
        <p>{c.originalQuote || "No source phrase returned."}</p>
        <small>{fmt(c.promisedAt)} · {c.sourceSubject || "Email"}</small>
      </div>
      <div className="cBottom">
        <div className="who">
          <span>{initials(c.recipientName || c.recipientEmail)}</span>
          <div>
            <b>{c.recipientName || c.recipientEmail || "Unknown recipient"}</b>
            <small>Promised via Outlook · {fmt(c.promisedAt)}</small>
          </div>
        </div>
        <div className="actions">
          {c.sourceWebLink && <a href={c.sourceWebLink} target="_blank" rel="noreferrer">Open email ↗</a>}
          {!done && <button onClick={() => complete(c)}>✓ Complete</button>}
          {!done && <button onClick={() => draft(c)}>✦ Draft follow-up</button>}
          <button className="ask" onClick={() => ask(`Why was this commitment detected? Where did I promise it and what should I do next?\n\nCommitment: ${c.action}\nRecipient: ${c.recipientName || c.recipientEmail}\nDue: ${c.dueLabel}\nEvidence: ${c.originalQuote}`)}>Ask AI →</button>
        </div>
      </div>
      {c.completionDetected && c.completionEvidence && (
        <div className="proof">
          ✓ <div>
            <b>AI detected completion evidence</b>
            <p>“{c.completionEvidence}”</p>
            <small>{c.completionSubject || "Later email"} · {c.completionAt ? fmt(c.completionAt) : ""}</small>
          </div>
        </div>
      )}
      {c.risk && c.risk !== "none" && !done && (
        <div className={`risk ${c.risk}`}>
          ⚠ <b>{c.risk === "high" ? "Needs attention" : "Potential risk"}</b>
          <span>{c.riskReason}</span>
        </div>
      )}
    </article>
  );
}
