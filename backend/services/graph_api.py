import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)
GRAPH_BASE = "https://graph.microsoft.com/v1.0"

def _headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

async def get_profile(token: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(f"{GRAPH_BASE}/me", headers=_headers(token))
        if not res.is_success:
            logger.warning(f"Graph get_profile failed: {res.status_code} {res.text}")
            return {}
        return res.json()

async def get_mail(token: str, top: int = 40) -> list[Dict[str, Any]]:
    url = f"{GRAPH_BASE}/me/mailFolders/inbox/messages?$top={top}&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,isRead,importance,flag,webLink&$orderby=receivedDateTime desc"
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, headers=_headers(token))
        if not res.is_success:
            logger.warning(f"Graph get_mail failed: {res.status_code} {res.text}")
            return []
        return res.json().get("value", [])

async def get_sent_mail(token: str, top: int = 30) -> list[Dict[str, Any]]:
    url = f"{GRAPH_BASE}/me/mailFolders/sentitems/messages?$top={top}&$select=id,subject,from,toRecipients,ccRecipients,sentDateTime,bodyPreview,body,webLink,conversationId&$orderby=sentDateTime desc"
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, headers=_headers(token))
        if not res.is_success:
            logger.warning(f"Graph get_sent_mail failed: {res.status_code} {res.text}")
            return []
        return res.json().get("value", [])

async def get_calendar(token: str, top: int = 30) -> list[Dict[str, Any]]:
    url = f"{GRAPH_BASE}/me/events?$top={top}&$select=id,subject,start,end,location,organizer,attendees,isAllDay,isCancelled,importance,onlineMeeting,webLink&$orderby=start/dateTime asc"
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, headers=_headers(token))
        if not res.is_success:
            logger.warning(f"Graph get_calendar failed: {res.status_code} {res.text}")
            return []
        return res.json().get("value", [])

async def send_mail(token: str, to: str, subject: str, body: str, cc: Optional[str] = None) -> bool:
    recipients = [{"emailAddress": {"address": addr.strip()}} for addr in to.split(";") if addr.strip()]
    cc_recipients = [{"emailAddress": {"address": addr.strip()}} for addr in (cc or "").split(";") if addr.strip()]
    
    payload = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "Text",
                "content": body
            },
            "toRecipients": recipients,
            "ccRecipients": cc_recipients
        },
        "saveToSentItems": "true"
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(f"{GRAPH_BASE}/me/sendMail", headers=_headers(token), json=payload)
        if not res.is_success:
            raise RuntimeError(f"Graph sendMail error: {res.status_code} {res.text}")
        return True

async def create_draft(token: str, to: str, subject: str, body: str, cc: Optional[str] = None) -> Dict[str, Any]:
    recipients = [{"emailAddress": {"address": addr.strip()}} for addr in to.split(";") if addr.strip()]
    cc_recipients = [{"emailAddress": {"address": addr.strip()}} for addr in (cc or "").split(";") if addr.strip()]
    
    payload = {
        "subject": subject,
        "body": {
            "contentType": "Text",
            "content": body
        },
        "toRecipients": recipients,
        "ccRecipients": cc_recipients
    }
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(f"{GRAPH_BASE}/me/messages", headers=_headers(token), json=payload)
        if not res.is_success:
            raise RuntimeError(f"Graph createDraft error: {res.status_code} {res.text}")
        return res.json()

async def mark_read(token: str, mail_id: str) -> bool:
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.patch(f"{GRAPH_BASE}/me/messages/{mail_id}", headers=_headers(token), json={"isRead": True})
        return res.is_success

async def flag_mail(token: str, mail_id: str) -> bool:
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.patch(f"{GRAPH_BASE}/me/messages/{mail_id}", headers=_headers(token), json={"flag": {"flagStatus": "flagged"}})
        return res.is_success

async def mark_important(token: str, mail_id: str) -> bool:
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.patch(f"{GRAPH_BASE}/me/messages/{mail_id}", headers=_headers(token), json={"importance": "high"})
        return res.is_success

async def update_calendar_importance(token: str, event_id: str, important: bool) -> bool:
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.patch(f"{GRAPH_BASE}/me/events/{event_id}", headers=_headers(token), json={"importance": "high" if important else "normal"})
        return res.is_success
