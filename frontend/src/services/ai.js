export const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const BASE_SUGGESTIONS = [
  "Catch me up",
  "What's urgent?",
  "What should I do next?",
  "What am I waiting for?",
  "What have I promised?",
  "Prepare me for my next meeting",
  "Send leave mail to HR"
];

export async function ai(payload) {
  const r = await fetch(`${API}/api/copilot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.detail || "AI request failed");
  return d;
}

export async function getPendingHITL(sessionId = "default") {
  try {
    const r = await fetch(`${API}/api/hitl/pending?session_id=${encodeURIComponent(sessionId)}`);
    if (!r.ok) return [];
    const data = await r.json();
    return data.approvals || [];
  } catch (e) {
    console.warn("HITL pending check failed:", e);
    return [];
  }
}

export async function approveHITL(approvalId, action = "approve", token = "", modifiedPayload = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-Graph-Token"] = token;
  const r = await fetch(`${API}/api/hitl/approve`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      approval_id: approvalId,
      action,
      modified_payload: modifiedPayload
    })
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.detail || "HITL approval failed");
  return d;
}

export async function fetchEnterpriseContext(token = "") {
  const headers = {};
  if (token) headers["X-Graph-Token"] = token;
  const r = await fetch(`${API}/api/context`, { headers });
  if (!r.ok) throw Error("Failed to fetch enterprise context");
  return await r.json();
}

export async function fetchBackendNotifications(payload, token = "") {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["X-Graph-Token"] = token;
  const r = await fetch(`${API}/api/notifications`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  if (!r.ok) return [];
  const data = await r.json();
  return data.notifications || [];
}

export function dynamicFallback(text) {
  const x = text.toLowerCase();
  if (x.includes("meeting")) return ["Prepare for the next meeting", "What's due before this meeting?", "What changed today?"];
  if (x.includes("mail")) return ["Summarize important mail", "Draft replies", "What needs a response?"];
  if (x.includes("leave")) return ["Send leave mail to HR", "What is my leave balance?", "Draft out of office reply"];
  return BASE_SUGGESTIONS;
}

export function fallback(text, d, teamsLength = 0) {
  const x = text.toLowerCase();
  if (x.includes("urgent") || x.includes("next")) return "1. Review the Phoenix deployment approval — due today at 5 PM. It blocks deployment.\n2. Verify the Atlas login defect before the 4 PM client demo.";
  if (x.includes("waiting")) return "1. Database credentials — waiting for DevOps.\nThis is blocking Atlas work.";
  if (x.includes("promised")) return "1. Nova test report — committed for EOD.";
  if (x.includes("leave")) return "I can draft your formal leave application and send it to your HR after your approval.";
  if (x.includes("meeting")) return "Next meeting: client demo. Review the Atlas login defect and Phoenix deployment status before joining.";
  if (x.includes("catch")) return `1. ${d.m[0]?.subject || "No new important email"}\n${d.m[0]?.bodyPreview || "Your inbox is quiet right now."}`;
  return `Connected with Workday enterprise AI backend.`;
}
