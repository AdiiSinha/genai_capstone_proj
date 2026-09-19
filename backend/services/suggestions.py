import re
from typing import List

BASE_SUGGESTIONS = [
    "What are my critical priorities today?",
    "Send leave mail to HR",
    "Which project needs immediate action?",
    "What meetings do I have coming up?",
    "Summarize my unread emails",
    "Show my commitments"
]

def dynamic_fallback_suggestions(query: str) -> List[str]:
    q = (query or "").lower()
    if "leave" in q or "holiday" in q or "vacation" in q:
        return [
            "Send leave mail to HR",
            "What is my leave balance?",
            "What meetings conflict with my leave?",
            "Draft out of office reply"
        ]
    if "mail" in q or "inbox" in q or "unread" in q:
        return [
            "Summarize my unread emails",
            "Show high priority emails",
            "Draft a reply to latest email",
            "Find emails needing follow-up"
        ]
    if "meeting" in q or "calendar" in q or "schedule" in q:
        return [
            "What meetings do I have today?",
            "Prepare me for my next meeting",
            "Show free slots this afternoon",
            "Find room Orion 1 availability"
        ]
    if "commit" in q or "deadline" in q or "promise" in q:
        return [
            "Show all overdue commitments",
            "What did I promise to send today?",
            "Draft follow-up for pending tasks",
            "Show commitment summary"
        ]
    if "transport" in q or "shuttle" in q or "bus" in q:
        return [
            "Next shuttle to Whitefield",
            "Show all running campus shuttles",
            "Buggy ETA at Main Gate",
            "Campus transport schedule"
        ]
    return BASE_SUGGESTIONS
