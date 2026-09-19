import json
import logging
from fastapi import APIRouter, HTTPException
from models.requests import CommitmentReq, DraftReq
from services.commitment import extract_commitments
from core.llm import raw_provider_call

router = APIRouter(prefix="/api/commitments", tags=["Commitments"])
logger = logging.getLogger(__name__)

DRAFT_SYSTEM = """
You draft concise professional workplace follow-up emails.
Use only the supplied commitment. Do not invent project facts or deadlines.
If a recipient email is present, use it. If not, return an empty `to`.
Return JSON ONLY: {"to":"","subject":"","body":""}.
The message should politely reference the commitment and ask for/communicate the next step.
If the commitment is overdue, acknowledge the follow-up without inventing an excuse.
"""

@router.post("")
def commitments_endpoint(req: CommitmentReq):
    try:
        return extract_commitments(
            sent=req.sent,
            inbox=req.inbox,
            employee=req.employee,
            now=req.now
        )
    except Exception as e:
        logger.error(f"Commitment endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/draft")
def commitment_draft_endpoint(req: DraftReq):
    try:
        content = raw_provider_call([
            {"role": "system", "content": DRAFT_SYSTEM},
            {"role": "user", "content": json.dumps(req.commitment, ensure_ascii=False)}
        ], temperature=0.2)
        data = json.loads(content)
        return {
            "to": data.get("to", ""),
            "subject": data.get("subject", f"Follow-up: {req.commitment.get('title', 'Commitment')}"),
            "body": data.get("body", "")
        }
    except Exception as e:
        logger.error(f"Commitment draft failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
