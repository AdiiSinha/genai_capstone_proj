import re
from datetime import datetime, timezone
from typing import List, Dict, Any
from services.static_data import TASKS, TEAMS

def _parse_iso(dt_str: str) -> datetime:
    try:
        clean = str(dt_str).replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)

def build_notifications(
    emails: List[Dict[str, Any]],
    calendar: List[Dict[str, Any]],
    commitments: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    items = []
    now_ms = datetime.now(timezone.utc).timestamp() * 1000

    # 1. Urgent task
    urgent_task = TASKS[0] if TASKS else None
    if urgent_task:
        items.append({
            "id": "task-urgent",
            "group": "Urgent tasks",
            "priority": "critical",
            "title": urgent_task["title"],
            "message": f"{urgent_task['title']} is due {urgent_task['due']} and {urgent_task['why']}",
            "time": "Due today",
            "read": False,
            "target": "home",
            "aiPrompt": f"What should I do about {urgent_task['title']}?"
        })

    # 2. Team waiting/approvals
    top_team = next((x for x in TEAMS if re.search(r"waiting|approval|demo|review", x["text"], re.IGNORECASE)), None)
    if top_team:
        is_crit = bool(re.search(r"waiting|approval", top_team["text"], re.IGNORECASE))
        items.append({
            "id": f"team-{top_team['project']}",
            "group": "Waiting for replies",
            "priority": "critical" if is_crit else "high",
            "title": f"{top_team['project']} needs follow-up",
            "message": top_team["text"],
            "time": "Needs action",
            "read": False,
            "target": "mail",
            "aiPrompt": f"Summarize the pending follow-up for {top_team['project']} and suggest the next action."
        })

    # 3. Escalations
    escalation_task = next(
        (t for i, t in enumerate(TASKS) if i > 0 and re.search(r"today|tomorrow", t["due"], re.IGNORECASE) and t["priority"] in ["critical", "high"]),
        None
    )
    if escalation_task:
        items.append({
            "id": f"deadline-{escalation_task['title']}",
            "group": "Deadlines & escalations",
            "priority": "critical" if escalation_task["priority"] == "critical" else "high",
            "title": escalation_task["title"],
            "message": f"Deadline {escalation_task['due']}. {escalation_task['why']}",
            "time": escalation_task["due"],
            "read": False,
            "target": "home",
            "aiPrompt": f"What should I do about the deadline for {escalation_task['title']}?"
        })

    # 4. Upcoming meetings (within upcoming window)
    upcoming_meetings = []
    for event in calendar:
        if event.get("isCancelled") or event.get("isAllDay"):
            continue
        dt_raw = event.get("start", {}).get("dateTime")
        if not dt_raw:
            continue
        dt = _parse_iso(dt_raw)
        if dt.timestamp() * 1000 >= now_ms:
            upcoming_meetings.append((dt, event))

    upcoming_meetings.sort(key=lambda x: x[0])
    for dt, meeting in upcoming_meetings[:3]:
        minutes_until = max(1, int((dt.timestamp() * 1000 - now_ms) / 60000))
        subject = meeting.get("subject") or "Upcoming meeting"
        items.append({
            "id": f"meeting-{meeting.get('id') or subject}",
            "group": "Meeting reminders",
            "priority": "critical" if minutes_until <= 20 else "high",
            "title": subject,
            "message": f"{subject} starts in {minutes_until} minutes. Review the agenda and relevant context before joining.",
            "time": dt.strftime("%I:%M %p"),
            "read": False,
            "target": "calendar",
            "aiPrompt": f"Prepare me for my next meeting: {subject}."
        })

    # 5. Stale unread emails
    stale_unread = None
    for mail in emails:
        if mail.get("isRead") or not mail.get("receivedDateTime"):
            continue
        dt = _parse_iso(mail["receivedDateTime"])
        if (now_ms - dt.timestamp() * 1000) >= 60 * 60000:
            stale_unread = (dt, mail)
            break

    if stale_unread:
        dt, mail = stale_unread
        age_hours = max(1, int((now_ms - dt.timestamp() * 1000) / 3600000))
        subject = mail.get("subject") or "An inbox message"
        items.append({
            "id": f"unread-{mail.get('id') or 'mail'}",
            "group": "Due today",
            "priority": "medium",
            "title": "Unread email needs attention",
            "message": f"{subject} has been unread for {age_hours} hour{'s' if age_hours != 1 else ''}.",
            "time": "Unread",
            "read": False,
            "target": "mail",
            "aiPrompt": f"Summarize this unread email and tell me whether I need to respond: {subject}."
        })

    # 6. Commitments due or overdue
    active_commitments = [c for c in commitments if c.get("status") in ["overdue", "due_today", "due_soon"]]
    for commitment in active_commitments[:3]:
        is_overdue = commitment.get("status") == "overdue"
        action = commitment.get("action") or commitment.get("title") or "Commitment"
        items.append({
            "id": f"commitment-{commitment.get('id') or commitment.get('title')}",
            "group": "Deadlines & escalations",
            "priority": "critical" if is_overdue or commitment.get("priority") == "high" else "high",
            "title": commitment.get("title") or action,
            "message": f"{action} is overdue." if is_overdue else f"{action} is {commitment.get('dueLabel') or commitment.get('status', '').replace('_', ' ')}.",
            "time": commitment.get("dueLabel") or commitment.get("status", "").replace("_", " "),
            "read": False,
            "target": "commit",
            "aiPrompt": f"What is the next action for this commitment: {action}?"
        })

    # 7. Quick follow-up for latest mail
    if emails:
        latest = emails[0]
        subj = latest.get("subject") or "Latest email"
        items.append({
            "id": f"mail-{latest.get('id') or 'latest'}",
            "group": "Due today",
            "priority": "medium",
            "title": "Inbox action needed",
            "message": f"{subj} may need a response before the end of the day.",
            "time": "Quick follow-up",
            "read": False,
            "target": "mail",
            "aiPrompt": f"Draft a short and professional response for this email: {subj}."
        })

    return items[:8]
