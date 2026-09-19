import logging
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from models.requests import CopilotReq, HITLApprovalReq
from models.responses import CopilotResponse, StandardResponse
from agents.copilot_graph import run_copilot_agent
from agents.hitl.approval_store import get_pending_approvals
from agents.hitl.handlers import handle_approval_action
from core.memory import get_memory

router = APIRouter(prefix="/api", tags=["Copilot & HITL"])
logger = logging.getLogger(__name__)

@router.post("/copilot", response_model=CopilotResponse)
async def ask_copilot(req: CopilotReq):
    try:
        # If memory not provided from client, fallback to backend session memory
        memory = req.memory if req.memory else get_memory(req.session_id or "default")
        result = await run_copilot_agent(
            query=req.query,
            raw_context=req.context,
            memory=memory,
            session_id=req.session_id or "default"
        )
        return CopilotResponse(**result)
    except Exception as e:
        logger.error(f"Copilot agent execution failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/hitl/pending")
def list_pending_approvals(session_id: Optional[str] = None):
    """Retrieve all pending Human-in-the-Loop approval requests."""
    return {"approvals": get_pending_approvals(session_id)}

@router.post("/hitl/approve")
async def process_approval(
    req: HITLApprovalReq,
    x_graph_token: Optional[str] = Header(None, alias="X-Graph-Token")
):
    """Human-in-the-Loop decision endpoint (Approve / Reject / Modify)."""
    try:
        result = await handle_approval_action(
            approval_id=req.approval_id,
            action=req.action,
            token=x_graph_token,
            modified_payload=req.modified_payload
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Approval action failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
