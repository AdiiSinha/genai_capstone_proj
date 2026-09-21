import json
import re
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from core.llm import raw_provider_call

logger = logging.getLogger(__name__)

COMMITMENT_SYSTEM = """
You are Workday Copilot's Commitment Intelligence engine.
 
Analyze the supplied SENT_EMAILS and INBOX_EMAILS and identify commitments
made BY THE EMPLOYEE, plus commitments made BY OTHER PEOPLE to the employee.
 
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

GROUNDING RULE:
Every returned commitment must come from one supplied email. Copy the exact
email id into sourceId and copy an exact contiguous sentence or phrase from
that email into originalQuote. Never create a commitment, source id, title, or
quote that cannot be supported by the supplied email body.
 
IMPORTANT:
Even "I'll get back to you" without a deadline IS a commitment.
Set its status to "no_deadline".
 
==================================================
WHOSE COMMITMENT?
==================================================
 
SENT_EMAILS are the primary source.
 
A promise made by the employee in SENT_EMAILS = employee commitment.
 
A promise made by somebody else in INBOX_EMAILS = a received commitment.
 
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
 
Understand: today, tomorrow, tonight, this afternoon, this evening, EOD, end of day, soon, shortly, Monday, Friday, next week, by 5 PM, within two days.
 
Use NOW to interpret relative dates.
 
If there is no explicit deadline:
status = "no_deadline"
dueAt = ""
dueLabel = "No deadline"
 
Do not invent dates.
 
==================================================
STATUS
==================================================
"active", "due_today", "due_soon", "overdue", "completed", "no_deadline"
 
==================================================
PRIORITY
==================================================
"high", "medium", "low"
 
==================================================
OUTPUT
==================================================
Return VALID JSON ONLY.
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
    ],
    "receivedCommitments": [
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
            "commitmentType": "received",
            "completionDetected": false,
            "completionEvidence": "",
            "completionSubject": "",
            "completionAt": "",
            "risk": "none",
            "riskReason": ""
        }
  ]
}
"""

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
    "riskReason": "",
    "commitmentType": "self"
}

def normalize_commitments(value: Any) -> List[Dict[str, Any]]:
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

def parse_commitment_response(content: str) -> Dict[str, Any]:
    text = str(content or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.IGNORECASE)
    try:
        value = json.loads(text)
    except (TypeError, json.JSONDecodeError):
        return {"commitments": []}
    return value if isinstance(value, dict) else {"commitments": []}

def filter_grounded_commitments(commitments: List[Dict[str, Any]], mails: List[Dict[str, Any]], commitment_type: str) -> List[Dict[str, Any]]:
    mail_by_id = {str(mail.get("id") or ""): mail for mail in mails}
    grounded = []
    for commitment in commitments:
        source_id = str(commitment.get("sourceId") or "")
        source = mail_by_id.get(source_id)
        quote = re.sub(r"\s+", " ", str(commitment.get("originalQuote") or "")).strip().lower()
        body = re.sub(r"\s+", " ", str(source.get("body") or "")).strip().lower() if source else ""
        if not source or not quote or quote not in body:
            continue
        grounded.append({**commitment, "commitmentType": commitment_type})
    return grounded

def rebuild_commitment_summary(commitments: List[Dict[str, Any]]) -> Dict[str, int]:
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

def build_fallback_commitments(sent: List[Dict[str, Any]], now: str, commitment_type: str = "self") -> List[Dict[str, Any]]:
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
        sentences = re.split(r"(?<=[.!?])\s+|\n+", body)
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            lower = sentence.lower()
            if lower in {"thanks", "thank you", "okay", "ok", "noted", "received"}:
                continue
            matched = any(re.search(p, sentence, re.IGNORECASE) for p in patterns)
            if not matched:
                continue

            clean_sentence = sentence.strip()
            if re.search(r"\bsend\b|\bsent\b", lower):
                title = action = "Send the requested item"
            elif "get back" in lower:
                title = action = "Get back to recipient"
            elif "review" in lower:
                title = action = "Review and respond"
            elif "check" in lower:
                title = action = "Check and provide an update"
            elif "follow up" in lower:
                title = action = "Follow up"
            elif "share" in lower:
                title = action = "Share the requested item"
            elif "prepare" in lower:
                title = action = "Prepare the requested item"
            elif "update" in lower:
                title = action = "Provide an update"
            else:
                title = "Follow up on promised action"
                action = clean_sentence

            status = "no_deadline"
            due_label = "No deadline"
            due_at = ""
            source_time = mail.get("timestamp") or now
            try:
                source_date = datetime.fromisoformat(str(source_time).replace("Z", "+00:00"))
            except ValueError:
                source_date = datetime.now(timezone.utc)
            if source_date.tzinfo is None:
                source_date = source_date.replace(tzinfo=timezone.utc)

            due_date = None
            if re.search(r"\btomorrow\b", lower):
                due_date = source_date + timedelta(days=1)
                status = "due_soon"
                due_label = "Tomorrow"
            elif re.search(r"\btoday\b|\beod\b|\bend of day\b|\btonight\b", lower):
                due_date = source_date
                status = "due_today"
                due_label = "Today"
            elif re.search(r"\bsoon\b|\bshortly\b|\bthis week\b", lower):
                status = "due_soon"
                due_label = "Soon"

            if due_date:
                due_at = due_date.astimezone(timezone.utc).isoformat()

            recipient_name = ""
            recipient_email = ""
            recipients = mail.get("toRecipients") or []
            if commitment_type == "received":
                sender = mail.get("from") or {}
                recipients = [{"emailAddress": sender.get("emailAddress") or {}}]
            if recipients:
                first = recipients[0] or {}
                email_data = first.get("emailAddress") or {}
                recipient_name = email_data.get("name") or ""
                recipient_email = email_data.get("address") or ""

            source_id = mail.get("id") or ""
            commitment_id = f"fallback-{source_id[-20:]}-{len(commitment_items) + 1}"

            commitment_items.append({
                "id": commitment_id,
                "title": title,
                "action": action,
                "status": status,
                "confidence": 90,
                "confidenceReason": "A first-person promise/action phrase was detected directly in sent email.",
                "priority": "medium",
                "recipientName": recipient_name,
                "recipientEmail": recipient_email,
                "project": "",
                "dueAt": due_at,
                "dueLabel": due_label,
                "promisedAt": mail.get("timestamp") or "",
                "originalQuote": clean_sentence,
                "sourceId": source_id,
                "sourceSubject": mail.get("subject") or "(No subject)",
                "sourceWebLink": mail.get("webLink") or "",
                "completionDetected": False,
                "completionEvidence": "",
                "completionSubject": "",
                "completionAt": "",
                "risk": "none",
                "riskReason": "",
                "commitmentType": commitment_type
            })
    return commitment_items

def extract_commitments(sent: List[Dict[str, Any]], inbox: List[Dict[str, Any]], employee: Dict[str, Any], now: str) -> Dict[str, Any]:
    def compact_mail(m, direction):
        raw_body = m.get("body")
        body = raw_body.get("content", "") if isinstance(raw_body, dict) else raw_body or m.get("bodyPreview") or ""
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

    compact_sent = [compact_mail(m, "sent") for m in (sent or [])[:30]]
    compact_inbox = [compact_mail(m, "received") for m in (inbox or [])[:30]]

    # Pattern candidates
    commitment_patterns = re.compile(r"\b(I['’]?ll\b|I\s+will\b|I\s+can\b|I\s+plan\s+to\b|I\s+intend\s+to\b|let\s+me\b)", re.IGNORECASE)
    candidate_commitments = []
    for mail in compact_sent:
        body = mail.get("body", "")
        if not body:
            continue
        for sentence in re.split(r"(?<=[.!?])\s+", body):
            sentence = sentence.strip()
            if sentence and commitment_patterns.search(sentence):
                candidate_commitments.append({
                    "emailId": mail.get("id"),
                    "subject": mail.get("subject"),
                    "quote": sentence[:500],
                    "timestamp": mail.get("timestamp"),
                    "from": mail.get("from"),
                    "toRecipients": mail.get("toRecipients", []),
                    "webLink": mail.get("webLink", "")
                })

    user_content = {
        "NOW": now or datetime.now(timezone.utc).isoformat(),
        "EMPLOYEE": employee,
        "SENT_EMAILS": compact_sent,
        "INBOX_EMAILS": compact_inbox,
        "OBVIOUS_COMMITMENT_CANDIDATES": candidate_commitments
    }

    try:
        content = raw_provider_call([
            {"role": "system", "content": COMMITMENT_SYSTEM},
            {"role": "user", "content": json.dumps(user_content, ensure_ascii=False)}
        ], temperature=0.05)
    except Exception as e:
        logger.warning(f"AI provider unavailable for commitments; returning no commitments: {e}")
        content = ""

    data = parse_commitment_response(content)
    data.setdefault("generatedAt", datetime.now(timezone.utc).isoformat())
    model_commitments = normalize_commitments(data.get("commitments"))
    model_received = normalize_commitments(data.get("receivedCommitments"))
    data["commitments"] = filter_grounded_commitments(model_commitments, compact_sent, "self")
    data["receivedCommitments"] = filter_grounded_commitments(model_received, compact_inbox, "received")
    final_commitments = data["commitments"] + data["receivedCommitments"]
    data["summary"] = rebuild_commitment_summary(final_commitments)
    return data
