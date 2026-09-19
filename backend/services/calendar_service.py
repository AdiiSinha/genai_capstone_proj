"""
Calendar Service — Meeting intelligence, reminder thresholds, and schedule conflict resolution.
"""
from datetime import datetime, timezone
from typing import Dict, List, Any

def process_calendar_events(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyzes upcoming calendar events for meeting alerts, preparation notes, and room bookings."""
    now = datetime.now(timezone.utc)
    upcoming_reminders = []
    busy_slots = []

    for event in events:
        if event.get("isCancelled") or event.get("isAllDay"):
            continue

        start_str = event.get("start", {}).get("dateTime")
        if not start_str:
            continue

        try:
            start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
            mins_left = (start_dt - now).total_seconds() / 60.0

            if 0 <= mins_left <= 15:
                upcoming_reminders.append({
                    "eventId": event.get("id"),
                    "subject": event.get("subject", "Meeting"),
                    "minutesLeft": int(mins_left),
                    "location": event.get("location", {}).get("displayName", "Online"),
                    "isUrgent": mins_left <= 5
                })

            busy_slots.append({
                "subject": event.get("subject"),
                "start": start_str,
                "end": event.get("end", {}).get("dateTime")
            })
        except Exception:
            continue

    return {
        "reminders": upcoming_reminders,
        "busySlots": busy_slots,
        "totalEvents": len(events)
    }
