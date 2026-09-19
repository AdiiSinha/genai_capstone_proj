import re
from typing import Dict, Any
from core.config import settings
from agents.hitl.approval_store import create_approval

def extract_leave_details(query: str) -> Dict[str, str]:
    q = query.strip()
    
    # Try to extract dates (e.g. "from 1st Oct to 5th Oct", "tomorrow", "next Monday to Wednesday", etc.)
    from_to_match = re.search(r"from\s+([a-zA-Z0-9\s,]+?)\s+to\s+([a-zA-Z0-9\s,]+?)(?:for|due\s+to|\.|$)", q, re.IGNORECASE)
    if from_to_match:
        from_date = from_to_match.group(1).strip()
        to_date = from_to_match.group(2).strip()
    else:
        # Check single date or general mention
        date_match = re.search(r"(?:on|for)\s+([a-zA-Z0-9\s,]+?)(?:for|due\s+to|\.|$)", q, re.IGNORECASE)
        if date_match and not any(k in date_match.group(1).lower() for k in ["leave", "hr", "mail", "application"]):
            from_date = date_match.group(1).strip()
            to_date = date_match.group(1).strip()
        else:
            from_date = "<From Date>"
            to_date = "<To Date>"

    # Try to extract reason
    reason_match = re.search(r"(?:due\s+to|for|reason:?)\s+([a-zA-Z0-9\s,]+?)(?:\.|$)", q, re.IGNORECASE)
    if reason_match:
        reason_candidate = reason_match.group(1).strip()
        # Filter out false matches like "for leave"
        if not re.search(r"^(leave|hr|application|days?)$", reason_candidate, re.IGNORECASE):
            reason = reason_candidate
        else:
            reason = "personal reasons"
    else:
        reason = "personal reasons"

    return {
        "from_date": from_date,
        "to_date": to_date,
        "reason": reason
    }

def process_leave_mail_node(query: str, context: Dict[str, Any], session_id: str = "default") -> Dict[str, Any]:
    profile = context.get("profile") or {}
    employee_name = profile.get("displayName") or "Employee"
    job_title = profile.get("jobTitle") or ""
    
    details = extract_leave_details(query)
    from_date = details["from_date"]
    to_date = details["to_date"]
    reason = details["reason"]

    subject = f"Leave Application – {from_date} to {to_date}" if from_date != "<From Date>" else "Leave Application – Requested Dates"
    
    body = (
        f"Dear Neha,\n\n"
        f"I hope this message finds you well.\n\n"
        f"I am writing to formally request leave from {from_date} to {to_date} (inclusive) due to {reason}.\n\n"
        f"During my absence, I will ensure all pending tasks are handed over and I will be reachable for any urgent matters if required.\n\n"
        f"Kindly consider this request and let me know if any further information or documentation is needed.\n\n"
        f"Thank you for your time and consideration.\n\n"
        f"Warm regards,\n"
        f"{employee_name}\n"
        f"{job_title}".strip()
    )

    action_payload = {
        "label": "Review & Send Leave Mail",
        "mode": "leave",
        "to": settings.HR_EMAIL,
        "cc": "",
        "subject": subject,
        "body": body
    }

    # Register in HITL approval store
    approval = create_approval(
        action_type="leave_mail",
        payload=action_payload,
        session_id=session_id,
        metadata={"query": query, "employee": employee_name}
    )

    action_payload["approval_id"] = approval["id"]

    answer = (
        f"I've drafted your formal leave application addressed to Neha ({settings.HR_EMAIL}) "
        f"for {from_date} to {to_date}. Please review and approve the email draft below before it is sent."
    )

    return {
        "answer": answer,
        "actions": [action_payload],
        "suggestions": [
            "Send leave mail to HR",
            "What is my current leave balance?",
            "Show calendar conflicts",
            "Draft out-of-office autoreply"
        ],
        "context_used": ["HR Portal", "Leave Workflow", "Employee Profile"],
        "hitl_pending": approval
    }
