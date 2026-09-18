import os
import json
import re
import requests
from datetime import datetime, timedelta, timezone
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

==================================================
LEAVE MAIL AGENTIC WORKFLOW
==================================================

When the user asks to:
- "send a leave mail", "apply for leave", "send leave application",
  "mail HR for leave", "send an email for leave", "request leave",
  or any similar phrasing — with or without specific dates/reasons —

Follow this agentic workflow:

STEP 1 — Draft a complete, formal leave application letter using:
  - Employee name: from context.profile.displayName (fallback: "Employee")
  - Job title: from context.profile.jobTitle (if available)
  - Dates: extracted from the user's request (use "the requested dates" if not specified)
  - Reason: extracted from the user's request (use "personal reasons" if not specified)
  - Recipient: always "nehacrazy@outlook.com" (this is the HR contact)

STEP 2 — Return the draft as the FIRST element in the "actions" array using this EXACT schema:
{
  "label": "Review & Send Leave Mail",
  "mode": "leave",
  "to": "nehacrazy@outlook.com",
  "cc": "",
  "subject": "Leave Application – <date range or 'Requested Dates'>",
  "body": "<Full professional leave letter — see format below>"
}

LETTER FORMAT (use this structure):
---
Subject: Leave Application – <From Date> to <To Date>

Dear Neha,

I hope this message finds you well.

I am writing to formally request leave from <From Date> to <To Date> (inclusive) due to <reason>.

During my absence, I will ensure all pending tasks are handed over and I will be reachable for any urgent matters if required.

Kindly consider this request and let me know if any further information or documentation is needed.

Thank you for your time and consideration.

Warm regards,
<Employee Name>
<Job Title, if available>
---

STEP 3 — Set "answer" to a short, friendly confirmation such as:
"I've drafted your leave application for <dates>. Please review and edit the email below before sending it to your HR."

IMPORTANT RULES:
- Always pre-fill ALL fields (to, subject, body). Never leave them empty.
- The "to" field MUST always be "nehacrazy@outlook.com".
- If the user did not specify dates, use placeholder text like "<From Date>" and "<To Date>" in the draft.
- If the user did not specify a reason, use "personal reasons".
- The user will review and approve in the UI before the mail is actually sent. This is human-in-the-loop. State this clearly in "answer".
- Do NOT include any markdown formatting inside the email body — plain text only.

==================================================
"""

COMMITMENT_SYSTEM = """
You are Workday Copilot's Commitment Intelligence engine.
 
Analyze the supplied SENT_EMAILS and INBOX_EMAILS and identify commitments
made BY THE EMPLOYEE.
 
The employee is the person represented by EMPLOYEE.
 
==================================================
WHAT COUNTS AS A COMMITMENT
==================================================
 
Detect first-person promises and follow-ups such as:
 
"I'll send you tomorrow."
"I will send the document tomorrow."
"I'll send the report."
"I'll get back to you."
"I'll get back to you by EOD."
"I'll share the document by Friday."
"I'll review this and let you know."
"I'll check and update you."
"I'll follow up with them."
"I'll take care of this."
"I will prepare the presentation."
"I'll send the details soon."
"Let me get back to you."
"I can send this by Monday."
"I'll have this ready tomorrow."
 
A commitment does NOT need to contain the word:
commitment, task, action, deadline, promise.
 
Natural workplace language counts.
 
IMPORTANT:
Even "I'll get back to you" without a deadline IS a commitment.
Set its status to "no_deadline".
 
==================================================
WHOSE COMMITMENT?
==================================================
 
SENT_EMAILS are the primary source.
 
A promise made by the employee in SENT_EMAILS = employee commitment.
 
A promise made by somebody else in INBOX_EMAILS = NOT employee commitment.
 
Example:
 
Employee sends:
"I'll send the report tomorrow."
 
→ COMMITMENT.
 
Someone sends:
"I'll send you the report tomorrow."
 
→ NOT the employee's commitment.
 
==================================================
COMPLETION
==================================================
 
Use INBOX_EMAILS and later SENT_EMAILS to look for evidence that an
employee commitment was completed.
 
Do NOT assume completion just because the deadline passed.
 
Only mark completed when there is reasonable evidence.
 
==================================================
DEADLINES
==================================================
 
Understand:
 
today
tomorrow
tonight
this afternoon
this evening
EOD
end of day
soon
shortly
Monday
Friday
next week
by 5 PM
within two days
 
Use NOW to interpret relative dates.
 
If there is no explicit deadline:
 
status = "no_deadline"
dueAt = ""
dueLabel = "No deadline"
 
Do not invent dates.
 
==================================================
STATUS
==================================================
 
Use exactly one:
 
"active"
"due_today"
"due_soon"
"overdue"
"completed"
"no_deadline"
 
==================================================
PRIORITY
==================================================
 
Use:
 
"high"
"medium"
"low"
 
Use high only for clearly urgent/time-sensitive commitments.
 
==================================================
OUTPUT
==================================================
 
Return VALID JSON ONLY.
 
Use exactly this structure:
 
{
  "generatedAt": "",
  "summary": {
    "active": 0,
    "dueToday": 0,
    "overdue": 0,
    "completed": 0,
    "noDeadline": 0
  },
  "commitments": [
    {
      "id": "",
      "title": "",
      "action": "",
      "status": "active",
      "confidence": 95,
      "confidenceReason": "",
      "priority": "medium",
 
      "recipientName": "",
      "recipientEmail": "",
 
      "project": "",
 
      "dueAt": "",
      "dueLabel": "",
 
      "promisedAt": "",
 
      "originalQuote": "",
 
      "sourceId": "",
      "sourceSubject": "",
      "sourceWebLink": "",
 
      "completionDetected": false,
      "completionEvidence": "",
      "completionSubject": "",
      "completionAt": "",
 
      "risk": "none",
      "riskReason": ""
    }
  ]
}
 
==================================================
FIELD RULES
==================================================
 
id:
Create a stable unique ID based on the source email and commitment.
 
title:
Short human-readable title.
 
Examples:
 
"I'll send the report tomorrow."
→ "Send the report"
 
"I'll get back to you."
→ "Get back to recipient"
 
"I'll review this and let you know."
→ "Review and respond"
 
action:
A short description of the actual promised action.
 
confidence:
0-100 confidence that this is a real employee commitment.
 
originalQuote:
Copy the exact relevant commitment sentence from the email.
Do not invent it.
 
sourceId:
Must be the actual source email id.
 
sourceSubject:
Must be the actual source email subject.
 
sourceWebLink:
Use the source email webLink if available.
 
promisedAt:
Use the source email timestamp.
 
recipientName:
Use the recipient's name if available.
 
recipientEmail:
Use the recipient's email if available.
 
project:
Only use a project explicitly supported by the email.
Otherwise use "".
 
completionEvidence:
Only provide this when completionDetected is true.
 
risk:
Use:
"none"
"low"
"medium"
"high"
 
Do not invent risk.
 
==================================================
IMPORTANT EXTRACTION RULE
==================================================
 
DO NOT return an empty commitments array merely because the email is short.
 
For example:
 
"I'll send you tomorrow"
 
MUST produce a commitment.
 
"I'll get back to you"
 
MUST produce a commitment.
 
"I'll send the doc soon"
 
MUST produce a commitment.
 
If the supplied SENT_EMAILS contain a first-person promise, detect it.
 
Do not create commitments from:
 
"Thanks"
"Okay"
"Noted"
"Received"
"How are you?"
"Can you send me..."
"Please send..."
"Are you available?"
 
Those are not employee commitments unless the employee explicitly promises
to perform an action.
 
Return JSON only. No markdown. No explanation.
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


def build_fallback_commitments(sent, now):
    """
    Deterministic fallback for obvious first-person commitments.
 
    This is used only when the AI returns no commitments.
    It does NOT replace AI analysis.
    """
 
    patterns = [
        r"\bi['’]ll\b",
        r"\bi\s+will\b",
        r"\bi\s+can\b",
        r"\bi\s+plan\s+to\b",
        r"\bi\s+intend\s+to\b",
        r"\blet\s+me\b"
    ]
 
    commitment_items = []
 
    for mail in sent:
 
        body = str(mail.get("body") or "").strip()
 
        if not body:
            continue
 
        # Split email into sentences.
        sentences = re.split(r"(?<=[.!?])\s+|\n+", body)
 
        for sentence in sentences:
 
            sentence = sentence.strip()
 
            if not sentence:
                continue
 
            # Ignore obvious non-commitment phrases.
            lower = sentence.lower()
 
            if lower in {
                "thanks",
                "thank you",
                "okay",
                "ok",
                "noted",
                "received"
            }:
                continue
 
            matched = False
 
            for pattern in patterns:
                if re.search(pattern, sentence, re.IGNORECASE):
                    matched = True
                    break
 
            if not matched:
                continue
 
            # ---------------------------------------
            # Determine action/title
            # ---------------------------------------
 
            clean_sentence = sentence.strip()
 
            if re.search(r"\bsend\b|\bsent\b", lower):
                title = "Send the requested item"
                action = "Send the requested item"
 
            elif "get back" in lower:
                title = "Get back to recipient"
                action = "Get back to recipient"
 
            elif "review" in lower:
                title = "Review and respond"
                action = "Review and respond"
 
            elif "check" in lower:
                title = "Check and provide an update"
                action = "Check and provide an update"
 
            elif "follow up" in lower:
                title = "Follow up"
                action = "Follow up"
 
            elif "share" in lower:
                title = "Share the requested item"
                action = "Share the requested item"
 
            elif "prepare" in lower:
                title = "Prepare the requested item"
                action = "Prepare the requested item"
 
            elif "update" in lower:
                title = "Provide an update"
                action = "Provide an update"
 
            else:
                title = "Follow up on promised action"
                action = clean_sentence
 
            # ---------------------------------------
            # Deadline detection
            # ---------------------------------------
 
            status = "no_deadline"
            due_label = "No deadline"
            due_at = ""
 
            source_time = mail.get("timestamp") or now
            try:
                source_date = datetime.fromisoformat(
                    str(source_time).replace("Z", "+00:00")
                )
            except ValueError:
                source_date = datetime.now(timezone.utc)

            if source_date.tzinfo is None:
                source_date = source_date.replace(tzinfo=timezone.utc)

            due_date = None

            if re.search(r"\btomorrow\b", lower):
                due_date = source_date + timedelta(days=1)
 
                status = "due_soon"
                due_label = "Tomorrow"
 
            elif re.search(
                r"\btoday\b|\beod\b|\bend of day\b|\btonight\b",
                lower
            ):
                due_date = source_date
                status = "due_today"
                due_label = "Today"
 
            elif re.search(
                r"\bsoon\b|\bshortly\b|\bthis week\b",
                lower
            ):
 
                status = "due_soon"
                due_label = "Soon"

            if due_date:
                due_at = due_date.astimezone(timezone.utc).isoformat()
 
            # ---------------------------------------
            # Recipient
            # ---------------------------------------
 
            recipient_name = ""
            recipient_email = ""
 
            recipients = mail.get("toRecipients") or []
 
            if recipients:
 
                first = recipients[0] or {}
                email_data = first.get("emailAddress") or {}
 
                recipient_name = email_data.get("name") or ""
                recipient_email = email_data.get("address") or ""
 
            # ---------------------------------------
            # Stable ID
            # ---------------------------------------
 
            source_id = mail.get("id") or ""
 
            commitment_id = (
                "fallback-"
                + source_id[-20:]
                + "-"
                + str(len(commitment_items) + 1)
            )
 
            commitment_items.append({
                "id": commitment_id,
 
                "title": title,
 
                "action": action,
 
                "status": status,
 
                "confidence": 90,
 
                "confidenceReason":
                    "A first-person promise/action phrase was detected "
                    "directly in the employee's sent email.",
 
                "priority": "medium",
 
                "recipientName": recipient_name,
 
                "recipientEmail": recipient_email,
 
                "project": "",
 
                "dueAt": due_at,
 
                "dueLabel": due_label,
 
                "promisedAt": mail.get("timestamp") or "",
 
                "originalQuote": clean_sentence,
 
                "sourceId": source_id,
 
                "sourceSubject":
                    mail.get("subject") or "(No subject)",
 
                "sourceWebLink":
                    mail.get("webLink") or "",
 
                "completionDetected": False,
 
                "completionEvidence": "",
 
                "completionSubject": "",
 
                "completionAt": "",
 
                "risk": "none",
 
                "riskReason": ""
            })
 
    return commitment_items


COMMITMENT_DEFAULTS = {
    "id": "",
    "title": "Follow up on promised action",
    "action": "Follow up on promised action",
    "status": "pending",
    "confidence": 0,
    "confidenceReason": "",
    "priority": "medium",
    "recipientName": "",
    "recipientEmail": "",
    "project": "",
    "dueAt": "",
    "dueLabel": "No deadline",
    "promisedAt": "",
    "originalQuote": "",
    "sourceId": "",
    "sourceSubject": "(No subject)",
    "sourceWebLink": "",
    "completionDetected": False,
    "completionEvidence": "",
    "completionSubject": "",
    "completionAt": "",
    "risk": "none",
    "riskReason": ""
}


def normalize_commitments(value):
    if not isinstance(value, list):
        return []

    normalized = []
    for item in value:
        if not isinstance(item, dict):
            continue
        commitment = {**COMMITMENT_DEFAULTS, **item}
        commitment["id"] = str(commitment["id"] or "commitment-" + str(len(normalized) + 1))
        try:
            confidence = int(commitment["confidence"] or 0)
        except (TypeError, ValueError):
            confidence = 0
        commitment["confidence"] = max(0, min(100, confidence))
        normalized.append(commitment)
    return normalized


def parse_commitment_response(content):
    text = str(content or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
    try:
        value = json.loads(text)
    except (TypeError, json.JSONDecodeError):
        return {"commitments": []}
    return value if isinstance(value, dict) else {"commitments": []}


def rebuild_commitment_summary(commitments):
    summary = {"active": 0, "dueToday": 0, "overdue": 0, "completed": 0, "noDeadline": 0}
    for commitment in commitments:
        status = commitment.get("status")
        if status == "completed":
            summary["completed"] += 1
        elif status == "due_today":
            summary["dueToday"] += 1
            summary["active"] += 1
        elif status == "overdue":
            summary["overdue"] += 1
            summary["active"] += 1
        elif status == "no_deadline":
            summary["noDeadline"] += 1
            summary["active"] += 1
        else:
            summary["active"] += 1
    return summary
 

@app.post("/api/commitments")
def commitments(x: CommitmentReq):
    try:
        print("\n")
        print("========================================")
        print("       COMMITMENT API DEBUG START")
        print("========================================")
 
        print("Employee:", x.employee)
        print("NOW:", x.now)
 
        print("Incoming sent emails:", len(x.sent or []))
        print("Incoming inbox emails:", len(x.inbox or []))
 
        # ----------------------------------------
        # Compact email data
        # ----------------------------------------
        def compact_mail(m, direction):
            raw_body = m.get("body")
            body = (
                raw_body.get("content", "")
                if isinstance(raw_body, dict)
                else raw_body or m.get("bodyPreview") or ""
            )
 
            return {
                "id": m.get("id", ""),
                "direction": direction,
                "subject": m.get("subject", ""),
                "from": m.get("from", {}),
                "toRecipients": m.get("toRecipients", []),
                "ccRecipients": m.get("ccRecipients", []),
                "timestamp": (
                    m.get("timestamp")
                    or m.get("sentDateTime")
                    or m.get("receivedDateTime")
                    or ""
                ),
                "body": str(body)[:3500],
                "webLink": m.get("webLink", ""),
                "conversationId": m.get("conversationId", "")
            }
 
        sent = [
            compact_mail(m, "sent")
            for m in (x.sent or [])[:30]
        ]

        # ============================================
        # FIND OBVIOUS FIRST-PERSON COMMITMENT PHRASES
        # ============================================

        commitment_patterns = re.compile(
            r"\b("
            r"I['’]?ll\b|"
            r"I\s+will\b|"
            r"I\s+can\b|"
            r"I\s+plan\s+to\b|"
            r"I\s+intend\s+to\b|"
            r"let\s+me\b"
            r")",
            re.IGNORECASE
        )

        candidate_commitments = []

        for mail in sent:
            body = mail.get("body", "")

            if not body:
                continue

            sentences = re.split(
                r"(?<=[.!?])\s+",
                body
            )

            for sentence in sentences:
                sentence = sentence.strip()

                if not sentence:
                    continue

                if commitment_patterns.search(sentence):
                    candidate_commitments.append({
                        "emailId": mail.get("id"),
                        "subject": mail.get("subject"),
                        "quote": sentence[:500],
                        "timestamp": mail.get("timestamp"),
                        "from": mail.get("from"),
                        "toRecipients": mail.get("toRecipients", []),
                        "webLink": mail.get("webLink", "")
                    })

        print("\n========================================")
        print("   DETECTED COMMITMENT CANDIDATES")
        print("========================================")
        print(
            "Candidate count:",
            len(candidate_commitments)
        )

        for candidate in candidate_commitments:
            print(
                "→",
                candidate["quote"]
            )

        print("========================================\n")
 
        inbox = [
            compact_mail(m, "received")
            for m in (x.inbox or [])[:30]
        ]

        
        
 
        print("Compacted sent emails:", len(sent))
        print("Compacted inbox emails:", len(inbox))
 
        # ----------------------------------------
        # Check actual email content
        # ----------------------------------------
        if sent:
            print("\nFIRST SENT EMAIL")
            print("----------------")
            print("Subject:", sent[0].get("subject"))
            print("From:", sent[0].get("from"))
            print("To:", sent[0].get("toRecipients"))
            print("Body length:", len(sent[0].get("body", "")))
            print("Body preview:", sent[0].get("body", "")[:500])
 
        if inbox:
            print("\nFIRST INBOX EMAIL")
            print("-----------------")
            print("Subject:", inbox[0].get("subject"))
            print("From:", inbox[0].get("from"))
            print("Body length:", len(inbox[0].get("body", "")))
            print("Body preview:", inbox[0].get("body", "")[:500])
 
        # ----------------------------------------
        # Build AI input
        # ----------------------------------------
        user_content = {
    "NOW": x.now or datetime.now(timezone.utc).isoformat(),
    "EMPLOYEE": x.employee,
    "SENT_EMAILS": sent,
    "INBOX_EMAILS": inbox,
    "OBVIOUS_COMMITMENT_CANDIDATES": candidate_commitments
}
 
        payload = json.dumps(
            user_content,
            ensure_ascii=False
        )
 
        print("\nAI PAYLOAD")
        print("----------------")
        print("Payload characters:", len(payload))
 
        print("System prompt characters:", len(COMMITMENT_SYSTEM))
 
        # ----------------------------------------
        # CALL AI PROVIDER
        # ----------------------------------------
        print("\nCalling provider_call()...")
        
        try:
            content = provider_call(
                [
                    {
                        "role": "system",
                        "content": COMMITMENT_SYSTEM
                    },
                    {
                        "role": "user",
                        "content": payload
                    }
                ],
                temperature=0.05
            )
        except Exception as e:
            print("AI provider unavailable; using deterministic fallback:", repr(e))
            content = ""
 
        print("\nAI PROVIDER RESPONSE RECEIVED")
        print("-----------------------------")
        print("Response type:", type(content))
        print("Response length:", len(str(content)))
        print("Raw AI response:")
        print(str(content)[:3000])
 
        # ----------------------------------------
        # Parse AI JSON
        # ----------------------------------------
        print("\nParsing AI JSON...")

        data = parse_commitment_response(content)
 
        print("JSON parsing SUCCESS")
        print("Returned keys:", list(data.keys()))
 
        data.setdefault(
            "generatedAt",
            datetime.now(timezone.utc).isoformat()
        )
 
        data.setdefault("summary", {})
        data.setdefault("commitments", [])

        # ============================================
        # FALLBACK FOR OBVIOUS COMMITMENTS
        # ============================================
 
        print("\nChecking deterministic commitment fallback...")
 
        fallback_commitments = build_fallback_commitments(
            sent,
            x.now or datetime.now(timezone.utc).isoformat()
        )
 
        print(
            "Fallback commitments detected:",
            len(fallback_commitments)
        )
 
        for fc in fallback_commitments:
            print(
                "FALLBACK →",
                fc["originalQuote"]
            )
 
        # --------------------------------------------
        # If AI missed obvious commitments,
        # use deterministic candidates.
        # --------------------------------------------
 
        model_commitments = normalize_commitments(data.get("commitments"))
        if not model_commitments and fallback_commitments:
 
            print(
                "\nAI returned 0 commitments."
                "\nUsing deterministic fallback."
            )
 
            data["commitments"] = fallback_commitments

        else:
            data["commitments"] = model_commitments

        # ============================================
        # REBUILD SUMMARY FROM FINAL COMMITMENTS
        # ============================================
 
        final_commitments = normalize_commitments(data.get("commitments"))
        data["commitments"] = final_commitments
        data["summary"] = rebuild_commitment_summary(final_commitments)
 
        print("\nFINAL COMMITMENT COUNT:")
        print(len(final_commitments))
 
        print("\nFINAL SUMMARY:")
        print(data["summary"])
 
        print("\nFINAL COMMITMENTS:")
 
        for c in final_commitments:
 
            print(
                "→",
                c.get("title"),
                "|",
                c.get("status"),
                "|",
                c.get("originalQuote")
            )
 
 
        print("Commitments returned:", len(data["commitments"]))
 
        print("\n========================================")
        print("        COMMITMENT API SUCCESS")
        print("========================================")
        print("\n")
 
        return data
 
    except json.JSONDecodeError as e:
 
        print("\n")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("       COMMITMENT JSON ERROR")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("JSON error:", repr(e))
        print("AI content was:")
        print(str(content)[:5000] if "content" in locals() else "NO AI RESPONSE")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("\n")
 
        raise HTTPException(
            status_code=500,
            detail=f"Commitment AI returned invalid JSON: {e}"
        )
 
    except Exception as e:
 
        import traceback
 
        print("\n")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("       COMMITMENT BACKEND ERROR")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("Error type:", type(e).__name__)
        print("Error:", repr(e))
        print("\nFULL TRACEBACK:")
        traceback.print_exc()
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("\n")
 
        raise HTTPException(
            status_code=500,
            detail=f"Commitment backend error: {str(e)}"
        )
 

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
