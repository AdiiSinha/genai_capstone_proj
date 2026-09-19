from datetime import datetime, timezone
from typing import Dict, List, Any

# In-memory store for session memories (keyed by session_id or user)
_session_memories: Dict[str, List[Dict[str, Any]]] = {}

def get_memory(session_id: str = "default") -> List[Dict[str, Any]]:
    return _session_memories.get(session_id, [])

def save_memory(session_id: str, question: str, answer: str) -> None:
    if session_id not in _session_memories:
        _session_memories[session_id] = []
    
    _session_memories[session_id].append({
        "q": question,
        "a": answer,
        "at": datetime.now(timezone.utc).isoformat()
    })
    # Keep last 40 exchanges
    _session_memories[session_id] = _session_memories[session_id][-40:]

def clear_memory(session_id: str = "default") -> None:
    if session_id in _session_memories:
        _session_memories[session_id] = []
