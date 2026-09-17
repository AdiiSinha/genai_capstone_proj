import os
import json
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()
KEY = os.getenv("GENAI_API_KEY", "")
BASE = os.getenv("GENAI_BASE_URL", "").rstrip("/")
MODEL = os.getenv("GENAI_MODEL", "")

app = FastAPI(title="Workday Copilot AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class Req(BaseModel):
    query: str
    context: dict = Field(default_factory=dict)
    memory: list = Field(default_factory=list)

class CommitmentReq(BaseModel):
    sent: list = Field(default_factory=list)
    inbox: list = Field(default_factory=list)
    now: str = ""
    employee: dict = Field(default_factory=dict)

SYSTEM = """
You are Workday Copilot, a concise enterprise employee workday intelligence assistant.
Use ONLY the supplied authorized context. Never invent people, emails, deadlines, projects,
completion evidence, or actions. Mail may be real Microsoft Graph data.

Return JSON ONLY with exactly these top-level keys:
{
  "answer": "...",
  "actions": [],
  "suggestions": [],
  "context_used": []
}

For normal requests, keep answer concise and professional.
"""

COMMITMENT_SYSTEM = """
You are the Commitment Intelligence engine inside an enterprise employee copilot.
The supplied SENT emails were written by the signed-in employee. The supplied INBOX emails
were received by that employee. Analyze them semantically, not with keyword matching alone.

A commitment is a promise, planned action, or explicit intention made BY THE SIGNED-IN EMPLOYEE.
Examples include: "I'll send it by Friday", "I'll check this and get back to you",
"I'll share the report tomorrow", "Let me take this", "I'll handle the deployment",
"I can send the details later today".

Do NOT create a commitment merely because someone asked the employee to do something.
Do NOT invent a deadline when none is stated. "soon" remains no exact deadline.
Understand natural-language deadlines such as today, tomorrow, Friday, EOD, next week,
and deadlines relative to the email timestamp. Use the supplied current timestamp.

Completion detection:
- A commitment is completed only when a later supplied email contains credible evidence
  that the employee fulfilled the promised action.
- Prefer evidence from the employee's later SENT email, but an INBOX reply can corroborate
  completion (for example, "Thanks for sending the report").
- Never mark a commitment complete merely because time passed.
- If evidence is ambiguous, keep it pending and explain why.

Deduplicate multiple emails that clearly represent the same promise. Preserve the earliest
promise as the source and include later related evidence.

For every commitment return:
{
  "id": "stable local id",
  "title": "short action title",
  "action": "what the employee promised to do",
  "recipientName": "name or empty string",
  "recipientEmail": "email or empty string",
  "project": "project/topic or empty string",
  "promisedAt": "ISO timestamp",
  "dueAt": "ISO timestamp or null",
  "dueLabel": "human-readable deadline or 'No deadline'",
  "originalQuote": "exact short sentence from source email",
  "sourceId": "Graph message id",
  "sourceSubject": "subject",
  "sourceWebLink": "Graph webLink or empty string",
  "status": "completed|overdue|due_today|due_soon|pending|no_deadline",
  "priority": "high|medium|low",
  "confidence": 0,
  "confidenceReason": "brief evidence-based reason",
  "risk": "high|medium|low|none",
  "riskReason": "brief reason",
  "completionDetected": true,
  "completionAt": "ISO timestamp or null",
  "completionEvidence": "exact short evidence sentence or empty string",
  "completionSubject": "subject or empty string",
  "completionWebLink": "webLink or empty string",
  "relatedEmails": [
    {"id":"...","direction":"sent|received","subject":"...","timestamp":"...","webLink":"..."}
  ]
}

Rules:
- confidence is 0-100.
- status is based on now, dueAt, and verified completion evidence.
- A due date without a time should use a reasonable end-of-day interpretation, but dueLabel
  must preserve the wording actually stated.
- If no deadline exists, dueAt must be null.
- recipient should come from toRecipients when available; never guess a recipient.
- project/topic should only be populated when supported by subject/content.
- originalQuote must be a quote from supplied email content, not generated prose.
- Return at most 30 distinct commitments, ordered: overdue, due today, due soon, pending,
  no deadline, completed.

Return JSON ONLY:
{
  "generatedAt": "ISO timestamp",
  "summary": {"active":0,"dueToday":0,"overdue":0,"completed":0,"noDeadline":0},
  "commitments": []
}
"""

def provider_call(messages, temperature=0.1):
    if not (KEY and BASE and MODEL):
        raise RuntimeError("AI backend not configured. Fill backend/.env.")
    payload = {"model": MODEL, "temperature": temperature, "messages": messages}
    r = requests.post(
        BASE + "/chat/completions",
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
        json=payload,
        timeout=90
    )
    if not r.ok:
        raise RuntimeError(f"AI provider HTTP {r.status_code}: {r.text[:700]}")
    content = r.json()["choices"][0]["message"]["content"]
    return content.replace("```json", "").replace("```", "").strip()

def call(q, c, memory):
    compact = {
        "profile": c.get("profile"),
        "emails": c.get("emails", [])[:40],
        "calendar": c.get("calendar", [])[:25],
        "teams": c.get("teams", [])[:40],
        "tasks": c.get("tasks", [])[:25],
        "projects": c.get("projects", [])[:10],
        "workplace": c.get("workplace", {})
    }
    content = provider_call([
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content":
         "CONTEXT:\n" + json.dumps(compact, ensure_ascii=False) +
         "\nRECENT CONVERSATION MEMORY:\n" + json.dumps(memory[-12:], ensure_ascii=False) +
         "\nREQUEST:\n" + q}
    ], temperature=0.18)
    try:
        data = json.loads(content)
    except Exception:
        data = {"answer": content, "actions": [], "suggestions": [], "context_used": []}
    data.setdefault("actions", [])
    data.setdefault("suggestions", [])
    data.setdefault("context_used", [])
    data.setdefault("answer", "I couldn't generate a concise answer from the available context.")
    return data

@app.get("/health")
def health():
    return {"ok": True, "configured": bool(KEY and BASE and MODEL), "model": MODEL or None}

@app.post("/api/copilot")
def copilot(x: Req):
    try:
        return call(x.query, x.context, x.memory)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/api/commitments")
def commitments(x: CommitmentReq):
    try:
        # Keep enough context for semantic matching while limiting provider payload size.
        def compact_mail(m, direction):
            body = ((m.get("body") or {}).get("content") if isinstance(m.get("body"), dict) else None) or m.get("bodyPreview") or ""
            return {
                "id": m.get("id", ""),
                "direction": direction,
                "subject": m.get("subject", ""),
                "from": m.get("from", {}),
                "toRecipients": m.get("toRecipients", []),
                "ccRecipients": m.get("ccRecipients", []),
                "timestamp": m.get("timestamp") or m.get("sentDateTime") or m.get("receivedDateTime") or "",
                "body": str(body)[:3500],
                "webLink": m.get("webLink", ""),
                "conversationId": m.get("conversationId", "")
            }
        sent = [compact_mail(m, "sent") for m in x.sent[:30]]
        inbox = [compact_mail(m, "received") for m in x.inbox[:30]]
        user_content = {
            "NOW": x.now or datetime.now(timezone.utc).isoformat(),
            "EMPLOYEE": x.employee,
            "SENT_EMAILS": sent,
            "INBOX_EMAILS": inbox
        }
        content = provider_call([
            {"role": "system", "content": COMMITMENT_SYSTEM},
            {"role": "user", "content": json.dumps(user_content, ensure_ascii=False)}
        ], temperature=0.05)
        data = json.loads(content)
        data.setdefault("generatedAt", datetime.now(timezone.utc).isoformat())
        data.setdefault("summary", {})
        data.setdefault("commitments", [])
        return data
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Commitment AI returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))

class DraftReq(BaseModel):
    commitment: dict = Field(default_factory=dict)

DRAFT_SYSTEM = """
You draft concise professional workplace follow-up emails.
Use only the supplied commitment. Do not invent project facts or deadlines.
If a recipient email is present, use it. If not, return an empty `to`.
Return JSON ONLY: {"to":"","subject":"","body":""}.
The message should politely reference the commitment and ask for/communicate the next step.
If the commitment is overdue, acknowledge the follow-up without inventing an excuse.
"""

@app.post("/api/commitments/draft")
def commitment_draft(x: DraftReq):
    try:
        content = provider_call([
            {"role": "system", "content": DRAFT_SYSTEM},
            {"role": "user", "content": json.dumps(x.commitment, ensure_ascii=False)}
        ], temperature=0.2)
        data = json.loads(content)
        return {
            "to": data.get("to", ""),
            "subject": data.get("subject", f"Follow-up: {x.commitment.get('title', 'Commitment')}"),
            "body": data.get("body", "")
        }
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"Draft AI returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))
