import logging
from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from models.requests import CalendarImportantReq
from services.graph_api import get_calendar, update_calendar_importance

router = APIRouter(prefix="/api/calendar", tags=["Calendar"])
logger = logging.getLogger(__name__)

@router.get("")
async def get_calendar_events(
    x_graph_token: Optional[str] = Header(None, alias="X-Graph-Token")
):
    if not x_graph_token:
        return {"value": []}
    try:
        events = await get_calendar(x_graph_token, top=40)
        return {"value": events}
    except Exception as e:
        logger.error(f"Error fetching calendar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/important")
async def toggle_calendar_important(
    req: CalendarImportantReq,
    x_graph_token: Optional[str] = Header(None, alias="X-Graph-Token")
):
    if not x_graph_token:
        raise HTTPException(status_code=401, detail="Token required.")
    success = await update_calendar_importance(x_graph_token, req.event_id, req.important)
    return {"ok": success}
