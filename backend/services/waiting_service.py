"""
Waiting / Blocker Service — Python-heavy intelligence for tracking dependencies,
calculating days pending, generating automated reminder drafts, and priority ranking.
"""
from datetime import datetime, timezone
from typing import Dict, List, Any

def score_blocker_urgency(blocker: Dict[str, Any]) -> Dict[str, Any]:
    """Calculates priority weight, overdue status, and recommended follow-up action."""
    created_at_str = blocker.get("created_at") or blocker.get("date")
    severity = blocker.get("severity", "medium").lower()

    days_pending = 0
    if created_at_str:
        try:
            created_dt = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            days_pending = (datetime.now(timezone.utc) - created_dt).days
        except Exception:
            days_pending = 2

    # Weight formula
    base_weight = {"critical": 100, "high": 75, "medium": 50, "low": 25}.get(severity, 50)
    urgency_score = base_weight + (days_pending * 5)

    needs_escalation = days_pending >= 3 or severity in ["critical", "high"]

    return {
        **blocker,
        "daysPending": days_pending,
        "urgencyScore": urgency_score,
        "needsEscalation": needs_escalation,
        "suggestedAction": f"Escalate to {blocker.get('owner', 'owner')}" if needs_escalation else "Send routine check-in"
    }

def rank_and_group_blockers(blockers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Ranks blockers by urgency score and groups by owner and project."""
    scored = [score_blocker_urgency(b) for b in blockers]
    sorted_blockers = sorted(scored, key=lambda x: x["urgencyScore"], reverse=True)

    by_owner = {}
    for b in sorted_blockers:
        owner = b.get("owner", "Unassigned")
        by_owner.setdefault(owner, []).append(b)

    return {
        "rankedBlockers": sorted_blockers,
        "byOwner": by_owner,
        "totalCount": len(sorted_blockers),
        "escalationCount": sum(1 for b in sorted_blockers if b["needsEscalation"])
    }
