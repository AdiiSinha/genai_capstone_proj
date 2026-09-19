/**
 * CommitDetail.jsx — Side drawer for detailed commitment evidence and source email.
 */
import React from "react";
import { clean, fmt } from "./commitUtils";

function Info({ l, v }) {
  return (
    <div className="info">
      <small>{l}</small>
      <b>{v}</b>
    </div>
  );
}

export function CommitDetail({ c, source, close, ask, draft }) {
  return (
    <div className="drawerBack" onClick={close}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <button className="x" onClick={close}>×</button>
        <small className="kicker">COMMITMENT EVIDENCE</small>
        <h2>{c.title || c.action}</h2>
        <p className="drawerAction">{c.action}</p>
        <section>
          <label>WHAT YOU PROMISED</label>
          <blockquote>“{c.originalQuote}”</blockquote>
          <small>AI confidence {c.confidence || 0}% · {c.confidenceReason || "Semantic workplace commitment detected."}</small>
        </section>
        <section>
          <label>WHO · WHEN · WHERE</label>
          <div className="grid">
            <Info l="Promised to" v={c.recipientName || c.recipientEmail || "Not identified"} />
            <Info l="Deadline" v={c.dueLabel || "No deadline"} />
            <Info l="Promised on" v={fmt(c.promisedAt)} />
            <Info l="Project / topic" v={c.project || "Not identified"} />
            <Info l="Subject" v={c.sourceSubject || "Not available"} />
            <Info l="Source" v="Microsoft Outlook" />
          </div>
        </section>
        <section>
          <label>ORIGINAL EMAIL</label>
          {source ? (
            <div className="email">
              <b>{source.subject || c.sourceSubject}</b>
              <small>{source.from?.emailAddress?.name || source.from?.emailAddress?.address || "You"} → {(source.toRecipients || []).map(x => x.emailAddress?.name || x.emailAddress?.address).filter(Boolean).join(", ")}</small>
              <small>{fmt(source.sentDateTime || source.receivedDateTime)}</small>
              <p>{clean(source.body?.content || source.bodyPreview || "Email body unavailable.")}</p>
            </div>
          ) : (
            <div className="loadingEvidence">Loading original Graph message…</div>
          )}
        </section>
        {c.completionDetected && (
          <section>
            <label>COMPLETION DETECTION</label>
            <div className="timeline">
              <b>Promise</b>
              <span>{fmt(c.promisedAt)}</span>
              <p>{c.originalQuote}</p>
              <hr />
              <b>Completion evidence</b>
              <span>{fmt(c.completionAt)}</span>
              <p>{c.completionEvidence || "Later email evidence matched the promise."}</p>
            </div>
          </section>
        )}
        <section>
          <label>AI REASONING</label>
          <div className="reason">
            <b>Detection</b>
            <p>{c.confidenceReason || "The model found first-person commitment intent in the source email."}</p>
            <b>Risk</b>
            <p>{c.riskReason || "No additional risk signal."}</p>
          </div>
        </section>
        <footer>
          {c.sourceWebLink && <a href={c.sourceWebLink} target="_blank" rel="noreferrer">Open original email ↗</a>}
          <button onClick={() => ask(`Explain this commitment using only the source evidence. Did I complete it?\n${c.originalQuote}`)}>Ask AI →</button>
          {c.status !== "completed" && <button className="primary" onClick={() => draft(c)}>Draft follow-up</button>}
        </footer>
      </aside>
    </div>
  );
}
