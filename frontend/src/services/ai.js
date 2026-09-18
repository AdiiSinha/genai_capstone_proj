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

export function dynamicFallback(text) {
  const x = text.toLowerCase();
  if (x.includes("meeting")) return ["Prepare for the next meeting", "What's due before this meeting?", "What changed today?"];
  if (x.includes("mail")) return ["Summarize important mail", "Draft replies", "What needs a response?"];
  return BASE_SUGGESTIONS;
}

export function fallback(text, d, teamsLength = 0) {
  const x = text.toLowerCase();
  if (x.includes("urgent") || x.includes("next")) return "1. Review the Phoenix deployment approval — due today at 5 PM. It blocks deployment.\n2. Verify the Atlas login defect before the 4 PM client demo.";
  if (x.includes("waiting")) return "1. Database credentials — waiting for DevOps.\nThis is blocking Atlas work.";
  if (x.includes("promised")) return "1. Nova test report — committed for EOD.";
  if (x.includes("meeting")) return "Next meeting: client demo. Review the Atlas login defect and Phoenix deployment status before joining.";
  if (x.includes("catch")) return `1. ${d.m[0]?.subject || "No new important email"}\n${d.m[0]?.bodyPreview || "Your inbox is quiet right now."}`;
  return `I can use your connected mail (${d.m?.length || 0}), calendar (${d.c?.length || 0}) and synthetic Teams context (${teamsLength}) for this prototype.`;
}
