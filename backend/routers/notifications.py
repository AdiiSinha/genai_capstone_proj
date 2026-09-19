from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Header, Body
from services.notifications import build_notifications
from services.graph_api import get_mail, get_calendar

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.post("")
async def generate_notifications(
    payload: Dict[str, Any] = Body(default_factory=dict),
    x_graph_token: Optional[str] = Header(None, alias="X-Graph-Token")
):
    emails = payload.get("emails", [])
    calendar = payload.get("calendar", [])
    commitments = payload.get("commitments", [])

    if x_graph_token and (not emails or not calendar):
        try:
            if not emails:
                emails = await get_mail(x_graph_token, top=40)
            if not calendar:
                calendar = await get_calendar(x_graph_token, top=30)
        except Exception:
            pass

    items = build_notifications(emails, calendar, commitments)
    return {"notifications": items}
