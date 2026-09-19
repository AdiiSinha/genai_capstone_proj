import re
from typing import Dict, Any

def classify_intent(query: str, context: Dict[str, Any]) -> str:
    q = query.lower().strip()
    
    # 1. Leave application intent
    leave_patterns = [
        r"\bleave\b",
        r"\bapply\s+for\s+leave\b",
        r"\bsend\s+(a\s+)?(mail|email)\s+for\s+leave\b",
        r"\bsend\s+leave\s+(mail|email|application)\b",
        r"\bmail\s+hr\s+for\s+leave\b",
        r"\brequest\s+leave\b",
        r"\bvacation\b",
        r"\btime\s+off\b",
        r"\bsick\s+leave\b",
        r"\bpto\b"
    ]
    if any(re.search(pat, q) for pat in leave_patterns):
        return "leave_mail"
    
    # 2. Campus Shuttle / Transport intent
    shuttle_patterns = [
        r"\bshuttle\b",
        r"\bbus\b",
        r"\bbuggy\b",
        r"\btransport\b",
        r"\bnext\s+bus\b",
        r"\bgate\s+\d\b"
    ]
    if any(re.search(pat, q) for pat in shuttle_patterns):
        return "shuttle"
    
    # 3. Commitment intent
    commitment_patterns = [
        r"\bcommitments?\b",
        r"\bpromises?\b",
        r"\bwhat\s+did\s+i\s+promise\b",
        r"\boverdue\b",
        r"\bwhat\s+do\s+i\s+owe\b"
    ]
    if any(re.search(pat, q) for pat in commitment_patterns):
        return "commitments"

    # Default to general enterprise chat
    return "chat"
