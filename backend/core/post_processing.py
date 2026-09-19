import re
from typing import Any, Dict, List, Union

def sanitize_ai_text(text: str) -> str:
    """
    Post-processes AI-generated text in Python:
    - Removes all bold/italic asterisks (* and **)
    - Replaces em dashes (—) and en dashes (–) with standard hyphens (-)
    - Normalizes multiple whitespace and newlines cleanly
    - Cleans up trailing/leading formatting artifacts
    """
    if not text:
        return ""
    
    t = str(text)
    
    # 1. Replace em dashes and en dashes with standard hyphen
    t = re.sub(r"[—–]", " - ", t)
    
    # 2. Remove markdown bold and italic asterisks
    t = t.replace("*", "")
    
    # 3. Clean up any accidental double spaces created around dashes
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r" - - ", " - ", t)
    t = re.sub(r"(\r?\n){3,}", "\n\n", t)
    
    return t.strip()

def post_process_ai_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively post-processes all AI response fields (answer, actions, suggestions).
    """
    if not isinstance(data, dict):
        return data

    if "answer" in data and isinstance(data["answer"], str):
        data["answer"] = sanitize_ai_text(data["answer"])

    if "actions" in data and isinstance(data["actions"], list):
        for act in data["actions"]:
            if isinstance(act, dict):
                for field in ["label", "subject", "body"]:
                    if field in act and isinstance(act[field], str):
                        act[field] = sanitize_ai_text(act[field])

    if "suggestions" in data and isinstance(data["suggestions"], list):
        data["suggestions"] = [sanitize_ai_text(s) for s in data["suggestions"] if isinstance(s, str)]

    return data
