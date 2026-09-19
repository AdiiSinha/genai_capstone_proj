import logging
from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from models.requests import SendMailReq, DraftMailReq, MarkReadReq, FlagMailReq, ImportantMailReq
from services.graph_api import send_mail, create_draft, mark_read, flag_mail, mark_important

router = APIRouter(prefix="/api/mail", tags=["Mail Operations"])
logger = logging.getLogger(__name__)

@router.post("/send")
async def send_email_endpoint(
    req: SendMailReq,
    x_graph_token: Optional[str] = Header(None, alias="X-Graph-Token")
):
    if not x_graph_token:
        raise HTTPException(status_code=401, detail="Microsoft Graph token required (X-Graph-Token).")
    try:
        await send_mail(token=x_graph_token, to=req.to, subject=req.subject, body=req.body, cc=req.cc)
        return {"ok": True, "message": f"Email sent to {req.to}"}
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/draft")
async def draft_email_endpoint(
    req: DraftMailReq,
    x_graph_token: Optional[str] = Header(None, alias="X-Graph-Token")
):
    if not x_graph_token:
        raise HTTPException(status_code=401, detail="Microsoft Graph token required (X-Graph-Token).")
    try:
        saved = await create_draft(token=x_graph_token, to=req.to or "", subject=req.subject or "", body=req.body or "", cc=req.cc or "")
        return {"ok": True, "draft": saved}
    except Exception as e:
        logger.error(f"Failed to create draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/read")
async def mark_read_endpoint(
    req: MarkReadReq,
    x_graph_token: Optional[str] = Header(None, alias="X-Graph-Token")
):
    if not x_graph_token:
        raise HTTPException(status_code=401, detail="Token required.")
    success = await mark_read(x_graph_token, req.mail_id)
    return {"ok": success}

@router.post("/flag")
async def flag_mail_endpoint(
    req: FlagMailReq,
    x_graph_token: Optional[str] = Header(None, alias="X-Graph-Token")
):
    if not x_graph_token:
        raise HTTPException(status_code=401, detail="Token required.")
    success = await flag_mail(x_graph_token, req.mail_id)
    return {"ok": success}

@router.post("/important")
async def important_mail_endpoint(
    req: ImportantMailReq,
    x_graph_token: Optional[str] = Header(None, alias="X-Graph-Token")
):
    if not x_graph_token:
        raise HTTPException(status_code=401, detail="Token required.")
    success = await mark_important(x_graph_token, req.mail_id)
    return {"ok": success}
