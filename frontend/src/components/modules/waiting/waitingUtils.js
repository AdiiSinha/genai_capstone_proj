/**
 * waitingUtils.js — Initial data, status checkers, and draft helpers for Waiting / Blocker tracking module.
 */
export const initialBlockers = [
  { id: 1, type: "Information request", title: "Development status update", description: "Need the latest sprint progress to complete the weekly project report.", owner: "Priya Nair", email: "priya.nair@capgemini.com", team: "Engineering", project: "Atlas Modernization", task: "Prepare weekly project report", due: Date.now() - 25 * 60000, created: "Today, 8:42 AM", updated: "Today, 11:08 AM", urgency: "Critical", status: "Overdue", reminder: "18 min ago", impact: "Manager update delayed", impactLevel: "High", affectedTasks: 2, actionPlan: "Request the current sprint status and confirm blockers before the manager update.", mitigation: "Use the last accepted sprint snapshot for the draft report.", history: ["Reminder sent 18 minutes ago", "Marked overdue 25 minutes ago", "Blocker raised today at 8:42 AM"] },
  { id: 2, type: "Approval", title: "Security review approval", description: "Approval is needed before the release candidate can move to UAT.", owner: "Marcus Chen", email: "marcus.chen@capgemini.com", team: "Security", project: "Atlas Modernization", task: "Promote release candidate", due: Date.now() + 35 * 60000, created: "Today, 9:10 AM", updated: "Today, 9:10 AM", urgency: "High", status: "Due Soon", reminder: "Never", impact: "Release gate pending", impactLevel: "Medium", affectedTasks: 1, actionPlan: "Confirm the security review outcome and capture any release conditions.", mitigation: "Prepare the UAT checklist while approval is pending.", history: ["Deadline approaching in 35 minutes", "Blocker raised today at 9:10 AM"] },
  { id: 3, type: "Document", title: "Q3 forecast workbook", description: "Waiting for the finance workbook with revised regional estimates.", owner: "Elena Rossi", email: "elena.rossi@capgemini.com", team: "Finance", project: "Growth Planning", task: "Finalize leadership pack", due: Date.now() + 25 * 3600000, created: "Yesterday, 4:28 PM", updated: "Yesterday, 4:30 PM", urgency: "Medium", status: "Waiting", reminder: "Yesterday, 4:30 PM", impact: "Leadership pack at risk", impactLevel: "Medium", affectedTasks: 3, actionPlan: "Follow up with Finance for the revised workbook and validate regional totals.", mitigation: "Use the previous forecast for internal scenario planning.", history: ["Reminder sent yesterday at 4:30 PM", "Blocker raised yesterday at 4:28 PM"] },
  { id: 4, type: "Evidence", title: "Client test evidence", description: "Need the signed evidence pack from the client validation team.", owner: "Jordan Williams", email: "jordan.williams@capgemini.com", team: "Delivery", project: "Northstar", task: "Close validation phase", due: Date.now() + 3 * 86400000, created: "Mon, 2:15 PM", updated: "Mon, 2:20 PM", urgency: "Low", status: "Waiting", reminder: "Mon, 2:20 PM", impact: "Validation closeout pending", impactLevel: "Low", affectedTasks: 1, actionPlan: "Collect the signed evidence pack and attach it to the validation record.", mitigation: "Keep the validation closeout checklist ready for immediate completion.", history: ["Reminder sent Monday at 2:20 PM", "Blocker raised Monday at 2:15 PM"] },
  { id: 5, type: "Technical dependency", title: "API contract confirmation", description: "The final payload contract is needed to finish the integration mapping.", owner: "Nikhil Shah", email: "nikhil.shah@capgemini.com", team: "Engineering", project: "Northstar", task: "Complete integration mapping", due: Date.now() - 2 * 86400000, created: "Fri, 11:05 AM", updated: "Fri, 2:00 PM", urgency: "High", status: "Completed", reminder: "Fri, 2:00 PM", impact: "Integration mapping completed", impactLevel: "High", affectedTasks: 2, actionPlan: "Archive the confirmed contract and update the integration mapping.", mitigation: "Use the approved draft contract for reference.", history: ["Resolved Friday at 2:00 PM", "Follow-up sent Friday at 1:30 PM", "Blocker raised Friday at 11:05 AM"] }
];

export const formatTime = ms => {
  const total = Math.abs(Math.round(ms / 60000));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}h ${minutes ? `${minutes}m` : ""}`.trim();
};

export function deadlineText(blocker, now) {
  if (blocker.status === "Completed") return "Resolved";
  const remaining = blocker.due - now;
  return remaining < 0 ? `${formatTime(remaining)} overdue` : remaining < 3600000 ? `Due in ${formatTime(remaining)}` : `Due ${new Date(blocker.due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function isOverdue(blocker, now) {
  return blocker.status !== "Completed" && blocker.due < now;
}

export function isDueSoon(blocker, now) {
  return blocker.status !== "Completed" && blocker.due >= now && blocker.due - now < 3600000;
}

export function makeDraft(blocker) {
  return {
    subject: `Follow-up: ${blocker.title}`,
    body: `Hi ${blocker.owner.split(" ")[0]},\n\nJust following up on the ${blocker.title.toLowerCase()} I was waiting for. I need this information to ${blocker.task.toLowerCase()}.\n\nCould you please share the latest update when you get a chance?\n\nThanks,\nAlex Morgan`
  };
}
