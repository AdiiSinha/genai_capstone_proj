import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from models.requests import OfficeSearchReq, ShuttleQuery
from services.shuttle import retrieve_shuttles
from services.office_rag import office_rag, OfficeRAGError

router = APIRouter(prefix="/api", tags=["Workplace & Transport"])
logger = logging.getLogger(__name__)

@router.post("/offices/nearby")
def nearby_offices(req: OfficeSearchReq):
    try:
        supplied_location = None
        if req.latitude is not None and req.longitude is not None:
            supplied_location = {"latitude": req.latitude, "longitude": req.longitude, "state": req.state or ""}
        return office_rag.search(req.query, supplied_location, req.limit)
    except OfficeRAGError as exc:
        logger.error("Office lookup failed: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

@router.post("/shuttle/search")
def shuttle_search(req: ShuttleQuery):
    result = retrieve_shuttles(req.query, req.minutes_ahead)
    grouped = result["groups"]
    return {
        "query": req.query,
        "generatedAt": datetime.now().astimezone().isoformat(),
        "source": "mock campus transport knowledge base",
        "results": grouped,
        "answer": result["answer"],
        "counts": {key: len(value) for key, value in grouped.items()}
    }
