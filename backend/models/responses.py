from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ActionItem(BaseModel):
    label: str
    mode: str = "mail"
    to: Optional[str] = ""
    cc: Optional[str] = ""
    subject: Optional[str] = ""
    body: Optional[str] = ""
    approval_id: Optional[str] = None
    sourceMeeting: Optional[Dict[str, Any]] = None
    sourceMail: Optional[Dict[str, Any]] = None

class CopilotResponse(BaseModel):
    answer: str
    actions: List[Dict[str, Any]] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    context_used: List[str] = Field(default_factory=list)
    hitl_pending: Optional[Dict[str, Any]] = None

class NotificationItem(BaseModel):
    id: str
    group: str
    priority: str
    title: str
    message: str
    time: str
    read: bool = False
    target: str = "home"
    aiPrompt: Optional[str] = None

class StandardResponse(BaseModel):
    ok: bool = True
    message: str = ""
    data: Optional[Any] = None
