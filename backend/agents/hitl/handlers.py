import logging
from typing import Dict, Any, Optional
from agents.hitl.approval_store import get_approval, update_approval_status
from services.graph_api import send_mail, create_draft

logger = logging.getLogger(__name__)

async def handle_approval_action(
    approval_id: str,
    action: str,  # "approve", "reject", "modify"
    token: Optional[str] = None,
    modified_payload: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    record = get_approval(approval_id)
    if not record:
        raise ValueError(f"Approval with ID '{approval_id}' not found.")
    
    if action == "reject":
        update_approval_status(approval_id, "rejected")
        return {
            "status": "rejected",
            "message": "Action was cancelled by the user."
        }
    
    # Process approval
    updated = update_approval_status(approval_id, "approved", modified_payload)
    final_payload = updated["payload"]
    action_type = updated["action_type"]
    
    result_message = "Action approved successfully."
    
    if action_type in ["leave_mail", "send_mail"]:
        to_email = final_payload.get("to")
        subject = final_payload.get("subject", "No Subject")
        body = final_payload.get("body", "")
        cc = final_payload.get("cc", "")
        
        if token and to_email:
            try:
                await send_mail(token=token, to=to_email, subject=subject, body=body, cc=cc)
                result_message = f"Email successfully sent to {to_email} via Microsoft Graph."
            except Exception as e:
                logger.error(f"Graph send failed during HITL execution: {e}")
                result_message = f"Approved, but sending failed: {str(e)}"
        else:
            result_message = f"Email to {to_email} approved and ready for dispatch."
            
    elif action_type == "draft_mail":
        to_email = final_payload.get("to", "")
        subject = final_payload.get("subject", "Draft")
        body = final_payload.get("body", "")
        cc = final_payload.get("cc", "")
        
        if token:
            try:
                saved = await create_draft(token=token, to=to_email, subject=subject, body=body, cc=cc)
                result_message = "Draft successfully saved to Outlook Drafts."
            except Exception as e:
                result_message = f"Draft approved, but save failed: {str(e)}"
    
    return {
        "status": "approved",
        "action_type": action_type,
        "message": result_message,
        "payload": final_payload
    }
