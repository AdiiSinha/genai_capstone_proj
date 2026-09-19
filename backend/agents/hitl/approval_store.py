import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

# In-memory store for pending HITL approval items
# Key: approval_id -> { id, session_id, action_type, payload, status, created_at, user_reviewed }
_approvals: Dict[str, Dict[str, Any]] = {}

def create_approval(
    action_type: str,
    payload: Dict[str, Any],
    session_id: str = "default",
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    approval_id = f"hitl-{uuid.uuid4().hex[:10]}"
    record = {
        "id": approval_id,
        "session_id": session_id,
        "action_type": action_type,  # e.g. "leave_mail", "send_mail", "draft_mail"
        "payload": payload,
        "status": "pending",  # "pending", "approved", "rejected", "modified"
        "created_at": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata or {}
    }
    _approvals[approval_id] = record
    return record

def get_approval(approval_id: str) -> Optional[Dict[str, Any]]:
    return _approvals.get(approval_id)

def get_pending_approvals(session_id: Optional[str] = None) -> List[Dict[str, Any]]:
    items = [v for v in _approvals.values() if v["status"] == "pending"]
    if session_id:
        items = [v for v in items if v["session_id"] == session_id]
    return sorted(items, key=lambda x: x["created_at"], reverse=True)

def update_approval_status(
    approval_id: str,
    status: str,
    modified_payload: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    record = _approvals.get(approval_id)
    if not record:
        return None
    record["status"] = status
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    if modified_payload:
        record["payload"] = {**record["payload"], **modified_payload}
    return record
