import React, { useEffect, useMemo, useState } from "react";

const initialBlockers = [
  { id: 1, type: "Information request", title: "Development status update", description: "Need the latest sprint progress to complete the weekly project report.", owner: "Priya Nair", email: "priya.nair@capgemini.com", team: "Engineering", project: "Atlas Modernization", task: "Prepare weekly project report", due: Date.now() - 25 * 60000, created: "Today, 8:42 AM", updated: "Today, 11:08 AM", urgency: "Critical", status: "Overdue", reminder: "18 min ago", impact: "Manager update delayed", impactLevel: "High", affectedTasks: 2, actionPlan: "Request the current sprint status and confirm blockers before the manager update.", mitigation: "Use the last accepted sprint snapshot for the draft report.", history: ["Reminder sent 18 minutes ago", "Marked overdue 25 minutes ago", "Blocker raised today at 8:42 AM"] },
  { id: 2, type: "Approval", title: "Security review approval", description: "Approval is needed before the release candidate can move to UAT.", owner: "Marcus Chen", email: "marcus.chen@capgemini.com", team: "Security", project: "Atlas Modernization", task: "Promote release candidate", due: Date.now() + 35 * 60000, created: "Today, 9:10 AM", updated: "Today, 9:10 AM", urgency: "High", status: "Due Soon", reminder: "Never", impact: "Release gate pending", impactLevel: "Medium", affectedTasks: 1, actionPlan: "Confirm the security review outcome and capture any release conditions.", mitigation: "Prepare the UAT checklist while approval is pending.", history: ["Deadline approaching in 35 minutes", "Blocker raised today at 9:10 AM"] },
  { id: 3, type: "Document", title: "Q3 forecast workbook", description: "Waiting for the finance workbook with revised regional estimates.", owner: "Elena Rossi", email: "elena.rossi@capgemini.com", team: "Finance", project: "Growth Planning", task: "Finalize leadership pack", due: Date.now() + 25 * 3600000, created: "Yesterday, 4:28 PM", updated: "Yesterday, 4:30 PM", urgency: "Medium", status: "Waiting", reminder: "Yesterday, 4:30 PM", impact: "Leadership pack at risk", impactLevel: "Medium", affectedTasks: 3, actionPlan: "Follow up with Finance for the revised workbook and validate regional totals.", mitigation: "Use the previous forecast for internal scenario planning.", history: ["Reminder sent yesterday at 4:30 PM", "Blocker raised yesterday at 4:28 PM"] },
  { id: 4, type: "Evidence", title: "Client test evidence", description: "Need the signed evidence pack from the client validation team.", owner: "Jordan Williams", email: "jordan.williams@capgemini.com", team: "Delivery", project: "Northstar", task: "Close validation phase", due: Date.now() + 3 * 86400000, created: "Mon, 2:15 PM", updated: "Mon, 2:20 PM", urgency: "Low", status: "Waiting", reminder: "Mon, 2:20 PM", impact: "Validation closeout pending", impactLevel: "Low", affectedTasks: 1, actionPlan: "Collect the signed evidence pack and attach it to the validation record.", mitigation: "Keep the validation closeout checklist ready for immediate completion.", history: ["Reminder sent Monday at 2:20 PM", "Blocker raised Monday at 2:15 PM"] },
  { id: 5, type: "Technical dependency", title: "API contract confirmation", description: "The final payload contract is needed to finish the integration mapping.", owner: "Nikhil Shah", email: "nikhil.shah@capgemini.com", team: "Engineering", project: "Northstar", task: "Complete integration mapping", due: Date.now() - 2 * 86400000, created: "Fri, 11:05 AM", updated: "Fri, 2:00 PM", urgency: "High", status: "Completed", reminder: "Fri, 2:00 PM", impact: "Integration mapping completed", impactLevel: "High", affectedTasks: 2, actionPlan: "Archive the confirmed contract and update the integration mapping.", mitigation: "Use the approved draft contract for reference.", history: ["Resolved Friday at 2:00 PM", "Follow-up sent Friday at 1:30 PM", "Blocker raised Friday at 11:05 AM"] }
];

const formatTime = ms => {
  const total = Math.abs(Math.round(ms / 60000));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}h ${minutes ? `${minutes}m` : ""}`.trim();
};

function deadlineText(blocker, now) {
  if (blocker.status === "Completed") return "Resolved";
  const remaining = blocker.due - now;
  return remaining < 0 ? `${formatTime(remaining)} overdue` : remaining < 3600000 ? `Due in ${formatTime(remaining)}` : `Due ${new Date(blocker.due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function isOverdue(blocker, now) {
  return blocker.status !== "Completed" && blocker.due < now;
}

function isDueSoon(blocker, now) {
  return blocker.status !== "Completed" && blocker.due >= now && blocker.due - now < 3600000;
}

function makeDraft(blocker) {
  return {
    subject: `Follow-up: ${blocker.title}`,
    body: `Hi ${blocker.owner.split(" ")[0]},\n\nJust following up on the ${blocker.title.toLowerCase()} I was waiting for. I need this information to ${blocker.task.toLowerCase()}.\n\nCould you please share the latest update when you get a chance?\n\nThanks,\nAlex Morgan`
  };
}

export function Waiting({ ask }) {
  const [blockers, setBlockers] = useState(initialBlockers);
  const [now, setNow] = useState(Date.now());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [complete, setComplete] = useState(null);
  const [resolution, setResolution] = useState("");
  const [notice, setNotice] = useState("");
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const active = blockers.filter(x => x.status !== "Completed");
  const overdue = blockers.filter(blocker => isOverdue(blocker, now));
  const dueSoon = blockers.filter(blocker => isDueSoon(blocker, now));
  const visible = useMemo(() => blockers.filter(x => {
    const matchesQuery = `${x.title} ${x.owner} ${x.project} ${x.team}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All"
      || (filter === "Active" && x.status !== "Completed")
      || (filter === "Overdue" && isOverdue(x, now))
      || (filter === "Due Soon" && isDueSoon(x, now))
      || (filter === "Completed" && x.status === "Completed");
    return matchesQuery && matchesFilter;
  }), [blockers, filter, now, query]);

  const teamCounts = blockers.filter(blocker => blocker.status !== "Completed").reduce((counts, blocker) => {
    counts[blocker.team] = (counts[blocker.team] || 0) + 1;
    return counts;
  }, {});

  function notify(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  function updateStatus(id, status) {
    setBlockers(items => items.map(item => item.id === id ? { ...item, status } : item));
  }

  function prepareFollowUp(blocker) {
    setDraft(makeDraft(blocker));
    updateStatus(blocker.id, "Follow-up ready");
  }

  function saveBlocker(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const owner = data.get("owner");
    const newBlocker = { id: Date.now(), title: data.get("title"), description: data.get("description"), owner, email: data.get("email"), team: data.get("team"), project: data.get("project"), task: data.get("task"), due: now + Number(data.get("deadline")) * 60000, created: "Just now", urgency: data.get("urgency"), status: "Waiting", reminder: "Never", impact: data.get("task") };
    setBlockers(items => [newBlocker, ...items]);
    setFormOpen(false);
    notify(`Blocker raised and tracking started for ${owner}.`);
  }

  function resolveBlocker() {
    updateStatus(complete.id, "Completed");
    setComplete(null);
    setResolution("");
    notify("Blocker resolved and moved to Completed History.");
  }

  return (
    <div className="tracker module">
      {notice && <div className="trackerNotice"><span>✓</span>{notice}</div>}
      <div className="trackerHeader">
        <div><small>DEPENDENCY CONTROL CENTER</small><h2>Dependency &amp; Blocker Tracker</h2><p>Keep work moving by making every dependency visible, owned, and time-bound.</p></div>
        <button className="raiseButton" onClick={() => setFormOpen(true)}><span>+</span> Raise blocker</button>
      </div>
      <div className="trackerToolbar">
        <label className="trackerSearch"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search blockers, people, projects" /></label>
        <div className="trackerFilters">{["All", "Active", "Overdue", "Due Soon", "Completed"].map(item => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item === "Overdue" ? `Overdue (${overdue.length})` : item}{item === "Overdue" && overdue.length > 0 ? <b aria-label={`${overdue.length} overdue alert`}>!</b> : null}</button>)}</div>
      </div>
      <div className="trackerStats">
        <div><span className="statIcon cyan">◌</span><div className="statCopy"><strong>{active.length}</strong><small>Active Blockers</small><em>+2 this week</em></div></div>
        <div><span className="statIcon red">!</span><div className="statCopy"><strong>{overdue.length}</strong><small>Overdue</small><em className="danger">Needs attention</em></div></div>
        <div><span className="statIcon amber">◷</span><div className="statCopy"><strong>{dueSoon.length}</strong><small>Due Soon</small><em>Next deadline</em></div></div>
        <div><span className="statIcon green">✓</span><div className="statCopy"><strong>{blockers.filter(x => x.status === "Completed").length}</strong><small>Completed</small><em>71% resolution rate</em></div></div>
      </div>
      <div className="trackerGrid">
        <section className="trackerMain"><div className="sectionHeading"><div><small>MY QUEUE</small><h3>Work requiring attention <span>{visible.length}</span></h3></div><button onClick={() => setFilter("Completed")}>View completed history →</button></div>
          {visible.map(blocker => <BlockerCard key={blocker.id} blocker={blocker} now={now} onFollowUp={prepareFollowUp} onComplete={setComplete} onDetails={setDetails} />)}
          {!visible.length && <div className="trackerEmpty"><span>⌕</span><h3>{filter === "Overdue" ? "No overdue blockers found." : filter === "Due Soon" ? "No blockers due soon." : filter === "Completed" ? "No completed blockers found." : "No blockers match these filters."}</h3><p>{filter === "Overdue" || filter === "Due Soon" ? "All dependencies are currently on track." : "Try a different search or raise a new blocker."}</p></div>}
        </section>
        <aside className="trackerRail"><section className="waitingOn"><div className="sectionHeading"><div><small>DEPENDENCY MAP</small><h3>Waiting on</h3></div><button onClick={() => setFilter("Active")}>See all</button></div>{active.slice(0, 3).map(blocker => <div className="waitingPerson" key={blocker.id}><span className={`personAvatar ${blocker.urgency.toLowerCase()}`}>{blocker.owner.split(" ").map(x => x[0]).join("")}</span><div><strong>{blocker.owner}</strong><p>{blocker.title}</p></div><em className={blocker.due < now ? "overdueText" : ""}>{deadlineText(blocker, now)}</em></div>)}</section>
          <section className="chainPanel"><small>DEPENDENCY CHAIN</small><h3>Weekly project report</h3><div className="chain"><div><span>MY TASK</span><b>Prepare weekly project report</b></div><i>↓</i><div><span>WAITING FOR</span><b>Priya Nair · Engineering</b></div><i>↓</i><div><span>IMPACT</span><b>Manager update delayed</b></div></div><div className="chainStatus"><span>!</span> Overdue by 25 minutes</div></section>
          <section className="visibilityPanel"><div className="sectionHeading"><div><small>VISIBILITY</small><h3>Team pulse</h3></div></div>{Object.entries(teamCounts).map(([team, count]) => <div className="pulseRow" key={team}><span>{team}</span><b>{count} {count === 1 ? "dependency" : "dependencies"}</b><i><u style={{ width: `${Math.min(100, count / Math.max(active.length, 1) * 100)}%` }} /></i></div>)}<footer><span>Avg. resolution time</span><strong>3h 42m</strong></footer></section>
        </aside>
      </div>
      {formOpen && <BlockerForm onClose={() => setFormOpen(false)} onSave={saveBlocker} />}
      {draft && <DraftModal draft={draft} setDraft={setDraft} onSent={() => { setDraft(null); notify("Follow-up marked as sent."); }} />}
      {details && <DetailsModal blocker={details} now={now} onClose={() => setDetails(null)} />}
      {complete && <div className="trackerOverlay"><div className="trackerModal smallModal"><button className="closeTracker" onClick={() => setComplete(null)}>×</button><small>RESOLVE DEPENDENCY</small><h2>Mark as complete</h2><p>Add an optional note about how this blocker was resolved.</p><textarea value={resolution} onChange={event => setResolution(event.target.value)} placeholder="e.g. Received the approved document from the owner..." /><footer><button onClick={() => setComplete(null)}>Cancel</button><button className="modalPrimary" onClick={resolveBlocker}>Mark resolved</button></footer></div></div>}
    </div>
  );
}

function BlockerCard({ blocker, now, onFollowUp, onComplete, onDetails }) {
  const overdue = isOverdue(blocker, now);
  return <article className={`blockerCard ${overdue ? "isOverdue" : ""} ${blocker.status === "Completed" ? "isCompleted" : ""}`}><div className="blockerTop"><span className={`urgencyBadge ${blocker.urgency.toLowerCase()}`}><i />{blocker.urgency}</span><span className={`statusBadge ${blocker.status.toLowerCase().replaceAll(" ", "-")}`}>{blocker.status}</span></div><div className="blockerContent"><div className="blockerIdentity"><span className="personAvatar">{blocker.owner.split(" ").map(x => x[0]).join("")}</span><div><h3>{blocker.title}</h3><p>{blocker.description}</p></div></div><div className="blockerMeta"><span><small>WAITING ON</small><b>{blocker.owner}</b><em>{blocker.team}</em></span><span><small>PROJECT / TASK</small><b>{blocker.project}</b><em>{blocker.task}</em></span><span><small>RAISED</small><b>{blocker.created}</b><em>Last reminder: {blocker.reminder}</em></span></div><div className="blockerDeadline"><div><small>{overdue ? "OVERDUE BY" : "EXPECTED RESOLUTION"}</small><strong className={overdue ? "overdueText" : ""}>{deadlineText(blocker, now)}</strong></div><div className="deadlineLine"><i style={{ width: overdue ? "100%" : blocker.urgency === "Low" ? "24%" : "68%" }} /></div><span>{overdue ? "Action required" : new Date(blocker.due).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div></div><div className="blockerActions"><button onClick={() => onDetails(blocker)}>View details</button>{blocker.status !== "Completed" && <><button onClick={() => onFollowUp(blocker)} className="followUp">✉ Prepare follow-up</button><button onClick={() => onComplete(blocker)} className="completeButton">✓ Mark complete</button></>}</div></article>;
}

function DetailsModal({ blocker, now, onClose }) {
  const detailRows = [["Blocker ID", `BLK-${String(blocker.id).padStart(4, "0")}`], ["Blocker type", blocker.type || "Dependency"], ["Priority", blocker.urgency], ["Status", blocker.status], ["Owner", blocker.owner], ["Project name", blocker.project], ["Created date", blocker.created], ["Due date", new Date(blocker.due).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })], ["Last updated", blocker.updated || blocker.created]];
  return <div className="trackerOverlay detailsOverlay"><div className="trackerModal detailsModal"><button className="closeTracker" onClick={onClose}>×</button><small>BLOCKER RECORD · BLK-{String(blocker.id).padStart(4, "0")}</small><h2>Blocker Details - {blocker.title}</h2><div className="detailsStatus"><span className={`urgencyBadge ${blocker.urgency.toLowerCase()}`}><i />{blocker.urgency} priority</span><span className={`statusBadge ${blocker.status.toLowerCase().replaceAll(" ", "-")}`}>{blocker.status}</span><span className={blocker.due < now && blocker.status !== "Completed" ? "overdueText" : ""}>{deadlineText(blocker, now)}</span></div><div className="detailsSection"><h3>Blocker details</h3><div className="detailsGrid">{detailRows.map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div></div><div className="detailsSection"><h3>Description</h3><p className="detailsDescription">{blocker.description}</p></div><div className="detailsSection"><h3>Dependency information</h3><div className="detailsGrid"><div><small>Related dependency</small><b>{blocker.title}</b></div><div><small>Impacted team</small><b>{blocker.team}</b></div><div><small>Impact level</small><b>{blocker.impactLevel || blocker.urgency}</b></div><div><small>Affected tasks</small><b>{blocker.affectedTasks || 1}</b></div></div></div><div className="detailsSection"><h3>Resolution tracking</h3><div className="resolutionBox"><div><small>Current action plan</small><p>{blocker.actionPlan || "Follow up with the dependency owner and confirm the required update."}</p></div><div><small>Mitigation steps</small><p>{blocker.mitigation || "Prepare an interim update while the dependency is pending."}</p></div><div><small>Expected resolution date</small><p>{new Date(blocker.due).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div></div><div className="historyTimeline">{(blocker.history || ["Blocker record created"]).map((item, index) => <div key={`${item}-${index}`}><i /><span>{item}</span></div>)}</div></div><footer><button onClick={onClose}>Close details</button></footer></div></div>;
}

function BlockerForm({ onClose, onSave }) { return <div className="trackerOverlay"><form className="trackerModal blockerForm" onSubmit={onSave}><button type="button" className="closeTracker" onClick={onClose}>×</button><small>NEW DEPENDENCY</small><h2>Raise a blocker</h2><p>Make the dependency clear, owned, and time-bound.</p><div className="formGrid"><label>Blocker title<input required name="title" placeholder="e.g. Waiting for project status update" /></label><label>Person I am waiting on<input required name="owner" placeholder="Full name" /></label><label>Their email<input required type="email" name="email" placeholder="name@company.com" /></label><label>Team / department<input required name="team" placeholder="e.g. Engineering" /></label><label>Project<input required name="project" placeholder="Project name" /></label><label>Task affected<input required name="task" placeholder="What is being blocked?" /></label><label className="wide">Detailed description<textarea required name="description" placeholder="What do you need from this person?" /></label><label>Required within<select name="deadline"><option value="30">30 minutes</option><option value="60" defaultValue>1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="480">End of day</option></select></label><label>Urgency<select name="urgency"><option>Critical</option><option>High</option><option defaultValue>Medium</option><option>Low</option></select></label></div><footer><button type="button" onClick={onClose}>Cancel</button><button className="modalPrimary" type="submit">Start tracking</button></footer></form></div> }

function DraftModal({ draft, setDraft, onSent }) { return <div className="trackerOverlay"><div className="trackerModal draftModal"><button className="closeTracker" onClick={() => setDraft(null)}>×</button><small>AI-ASSISTED FOLLOW-UP</small><h2>Prepare follow-up</h2><p>Review the draft before sending. Nothing is sent automatically.</p><label>Subject<input value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} /></label><label>Message<textarea value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} /></label><footer><button onClick={() => navigator.clipboard?.writeText(`${draft.subject}\n\n${draft.body}`)}>Copy</button><button onClick={() => window.open(`mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`, "_blank")}>Open in Outlook</button><button className="modalPrimary" onClick={onSent}>Mark as sent</button></footer></div></div> }

export default Waiting;
