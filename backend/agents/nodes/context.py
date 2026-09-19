from typing import Dict, Any
from services.static_data import TEAMS, TASKS, ROOMS, BUSES, NEWS, PROJECTS

def assemble_context(raw_context: Dict[str, Any]) -> Dict[str, Any]:
    """Prepares clean context, merging dynamic Microsoft Graph data with static mock enterprise knowledge."""
    profile = raw_context.get("profile") or {}
    emails = raw_context.get("emails") or []
    calendar = raw_context.get("calendar") or []
    sent_emails = raw_context.get("sentEmails") or []
    
    teams_data = raw_context.get("teams") or TEAMS
    tasks_data = raw_context.get("tasks") or TASKS
    projects_data = raw_context.get("projects") or PROJECTS
    workplace_data = raw_context.get("workplace") or {
        "rooms": ROOMS,
        "buses": BUSES,
        "news": NEWS
    }
    
    return {
        "profile": profile,
        "emails": emails[:40],
        "sentEmails": sent_emails[:30],
        "calendar": calendar[:25],
        "teams": teams_data[:40],
        "tasks": tasks_data[:25],
        "projects": projects_data[:10],
        "workplace": workplace_data
    }
