import React, { useMemo, useState } from "react";
import { Title } from "../common/Title";

const URGENT_PATTERN = /urgent|asap|immediately|critical|high priority|action required|time[- ]sensitive/i;
const APPROVAL_PATTERN = /approval|approve|sign[- ]off|authori[sz]e|go[- ]ahead/i;
const DEADLINE_PATTERN = /deadline|due (today|tomorrow|soon)|by (\d{1,2}(?::\d{2})?\s*(?:am|pm)?|eod|end of day)|before (\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i;
const LEAD_PATTERN = /manager|lead|director|head|vp|vice president|principal|owner|architect/i;

function getImportantReasons(mail, projectNames) {
  const subject = mail.subject || "";
  const body = mail.bodyPreview || "";
  const text = `${subject} ${body}`;
  const sender = mail.from?.emailAddress?.name || mail.from?.emailAddress?.address || "";
  const reasons = [];

  if (mail.importance === "high") reasons.push("Outlook important");
  if (URGENT_PATTERN.test(text)) reasons.push("Urgent language");
  if (DEADLINE_PATTERN.test(text)) reasons.push("Deadline detected");
  if (APPROVAL_PATTERN.test(text)) reasons.push("Approval request");
  if (mail.direction === "received" && !mail.isRead) reasons.push("Unread");
  if (mail.flag?.flagStatus === "flagged") reasons.push("Flagged");
  if (LEAD_PATTERN.test(sender)) reasons.push("Leadership sender");
  if (projectNames.some(project => project && text.toLowerCase().includes(project.toLowerCase()))) {
    reasons.push("Project context");
  }

  return reasons;
}

export function Mail({ m, junk = [], sent = [], ask, reply, flag, important, markRead, projects = [], onRefresh, refreshing = false }) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const projectNames = projects.flatMap(project => Array.isArray(project) ? project : [project])
    .filter(Boolean)
    .map(String);

  const allMail = useMemo(() => [
    ...m.map(mail => ({ ...mail, direction: "received" })),
    ...junk.map(mail => ({ ...mail, direction: "received", isJunk: true })),
    ...sent.map(mail => ({ ...mail, direction: "sent" }))
  ].map(mail => ({
    ...mail,
    importantReasons: getImportantReasons(mail, projectNames)
  })), [m, sent, projectNames]);

  const filteredMail = useMemo(() => {
    const search = query.trim().toLowerCase();

    return allMail.filter(mail => {
      const matchesTab = tab === "all"
        || (tab === "received" && mail.direction === "received")
        || (tab === "junk" && mail.isJunk)
        || (tab === "sent" && mail.direction === "sent")
        || (tab === "unread" && mail.direction === "received" && !mail.isRead)
        || (tab === "important" && mail.importantReasons.length > 0);

      const searchable = [
        mail.from?.emailAddress?.name,
        mail.from?.emailAddress?.address,
        mail.subject,
        mail.bodyPreview,
        ...projectNames
      ].filter(Boolean).join(" ").toLowerCase();

      return matchesTab && (!search || searchable.includes(search));
    });
  }, [allMail, projectNames, query, tab]);

  return (
    <div className="module">
      <div className="mailHeading">
        <Title k="COMMUNICATION" t="Inbox intelligence" />
        <button className="mailRefresh" onClick={onRefresh} disabled={refreshing}>
          <span className={refreshing ? "refreshSpin" : ""}>↻</span>
          {refreshing ? "Refreshing" : "Refresh"}
        </button>
      </div>
      <p className="sub">Real Microsoft Graph mail, with concise AI actions.</p>

      <div className="mailToolbar">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search sender, subject, project or keyword"
          aria-label="Search inbox"
        />
        <div className="mailTabs" role="tablist" aria-label="Mail filters">
          {[
            ["all", "All", allMail.length],
            ["received", "Received", m.length],
            ["junk", "Junk", junk.length],
            ["sent", "Sent", sent.length],
            ["unread", "Unread", m.filter(mail => !mail.isRead).length],
            ["important", "Important", allMail.filter(mail => mail.importantReasons.length > 0).length]
          ].map(([value, label, count]) => (
            <button
              key={value}
              className={tab === value ? "active" : ""}
              onClick={() => setTab(value)}
              role="tab"
              aria-selected={tab === value}
            >
              {label}
              <span>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {!filteredMail.length && <div className="mailEmpty">No emails match this view.</div>}

      {filteredMail.map(x => (
        <article className={`mail ${x.direction === "sent" ? "mailSent" : ""} ${x.direction === "received" && !x.isRead ? "mailUnread" : ""}`} key={`${x.direction}-${x.id}`}>
          <span>{(x.from?.emailAddress?.name || "?").slice(0, 1).toUpperCase()}</span>
          <div>
            <div className="mailMeta">
              <b>{x.direction === "received" && !x.isRead && <i className="mailUnreadDot" />}{x.direction === "sent" && <i className="mailDirection">SENT</i>}{x.from?.emailAddress?.name || x.from?.emailAddress?.address || "Unknown sender"}</b>
              <small>{new Date(x.receivedDateTime || x.sentDateTime).toLocaleString()}</small>
            </div>
            <h3>{x.subject || "(No subject)"}</h3>
            <p>{x.bodyPreview || "No preview available."}</p>
            {x.importantReasons.length > 0 && (
              <div className="mailImportanceReasons" aria-label="Why this email is important">
                {x.importantReasons.slice(0, 3).map(reason => <span key={reason}>{reason}</span>)}
              </div>
            )}
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
              {x.direction === "received" && !x.isRead && <button onClick={() => markRead(x)}>Mark as read</button>}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default Mail;
