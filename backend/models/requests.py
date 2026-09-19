from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CopilotReq(BaseModel):
    query: str
    session_id: Optional[str] = "default"
    context: Dict[str, Any] = Field(default_factory=dict)
    memory: List[Dict[str, Any]] = Field(default_factory=list)

class CommitmentReq(BaseModel):
    sent: List[Dict[str, Any]] = Field(default_factory=list)
    inbox: List[Dict[str, Any]] = Field(default_factory=list)
    now: str = ""
    employee: Dict[str, Any] = Field(default_factory=dict)

class DraftReq(BaseModel):
    commitment: Dict[str, Any] = Field(default_factory=dict)

class OfficeSearchReq(BaseModel):
    query: str = Field(default="office", min_length=1, max_length=200)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    state: Optional[str] = Field(default=None, max_length=100)
    limit: int = Field(default=5, ge=1, le=20)

class ShuttleQuery(BaseModel):
    query: str = ""
    minutes_ahead: int = Field(default=30, ge=5, le=180)

class HITLApprovalReq(BaseModel):
    approval_id: str
    action: str = "approve"  # "approve", "reject", "modify"
    modified_payload: Optional[Dict[str, Any]] = None

class SendMailReq(BaseModel):
    to: str
    subject: str
    body: str
    cc: Optional[str] = ""

class DraftMailReq(BaseModel):
    to: Optional[str] = ""
    subject: Optional[str] = ""
    body: Optional[str] = ""
    cc: Optional[str] = ""

class MarkReadReq(BaseModel):
    mail_id: str

class FlagMailReq(BaseModel):
    mail_id: str

class ImportantMailReq(BaseModel):
    mail_id: str

class CalendarImportantReq(BaseModel):
    event_id: str
    important: bool = True
