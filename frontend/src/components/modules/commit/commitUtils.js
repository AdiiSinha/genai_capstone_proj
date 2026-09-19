/**
 * commitUtils.js — Helper functions and API clients for Commitments module.
 */
const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const OVERRIDES = "wdCommitmentOverrides";

export const clean = (v = "") => {
  const d = document.createElement("div"); d.innerHTML = String(v);
  return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
};

export const fmt = v => {
  if (!v) return "Not specified";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

export const initials = s => String(s || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "?";

export const relative = v => {
  if (!v) return "No deadline";
  const n = new Date(v).getTime() - Date.now();
  const m = Math.round(Math.abs(n) / 60000);
  if (n < 0) return m < 60 ? `${m}m overdue` : m < 1440 ? `${Math.round(m / 60)}h overdue` : `${Math.round(m / 1440)}d overdue`;
  return m < 60 ? `in ${m}m` : m < 1440 ? `in ${Math.round(m / 60)}h` : `in ${Math.round(m / 1440)}d`;
};

export function mailShape(m, direction) {
  const body = typeof m?.body === "string" ? m.body : m?.body?.content;
  const timestamp = m?.sentDateTime || m?.receivedDateTime || "";
  return {
    id: m?.id || "",
    direction,
    subject: m?.subject || "(No subject)",
    from: m?.from?.emailAddress || {},
    toRecipients: m?.toRecipients || [],
    ccRecipients: m?.ccRecipients || [],
    timestamp,
    sentDateTime: direction === "sent" ? timestamp : "",
    receivedDateTime: direction === "received" ? timestamp : "",
    body: clean(body || m?.bodyPreview || "").slice(0, 6500),
    webLink: m?.webLink || "",
    conversationId: m?.conversationId || ""
  };
}

export function overrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES) || "{}"); } catch { return {}; }
}

export function withOverrides(list) {
  const o = overrides();
  return list.map(x => o[x.id] ? { ...x, ...o[x.id] } : x);
}

export async function analyzeAI(sent, inbox, employee) {
  const r = await fetch(`${API}/api/commitments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sent, inbox, employee, now: new Date().toISOString() })
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.detail || "Commitment AI failed");
  return d;
}

export async function draftAI(commitment) {
  const r = await fetch(`${API}/api/commitments/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commitment })
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.detail || "Draft AI failed");
  return d;
}
