import logging
from fastapi import APIRouter, Header, HTTPException
from typing import Optional, Dict, Any
from services.graph_api import get_profile, get_mail, get_sent_mail, get_calendar
from services.static_data import TEAMS, TASKS, ROOMS, BUSES, NEWS, PROJECTS

router = APIRouter(prefix="/api/context", tags=["Context"])
logger = logging.getLogger(__name__)

@router.get("")
async def get_assembled_context(
    x_graph_token: Optional[str] = Header(None, alias="X-Graph-Token")
) -> Dict[str, Any]:
    """
    Fetches and aggregates all user data from Microsoft Graph along with
    central enterprise knowledge (teams, tasks, workplace, projects) in Python.
    """
    profile = {}
    emails = []
    sent_emails = []
    calendar = []

    if x_graph_token:
        try:
            profile = await get_profile(x_graph_token)
            emails = await get_mail(x_graph_token, top=40)
            sent_emails = await get_sent_mail(x_graph_token, top=30)
            calendar = await get_calendar(x_graph_token, top=30)
        except Exception as e:
            logger.warning(f"Error fetching Graph data in context aggregator: {e}")

    return {
        "profile": profile,
        "emails": emails,
        "sentEmails": sent_emails,
        "calendar": calendar,
        "teams": TEAMS,
        "tasks": TASKS,
        "projects": PROJECTS,
        "workplace": {
            "rooms": ROOMS,
            "buses": BUSES,
            "news": NEWS
        }
    }
