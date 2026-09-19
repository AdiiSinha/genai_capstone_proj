from typing import Dict, Any
from agents.nodes.leave_mail import process_leave_mail_node
from agents.nodes.respond import generate_llm_response
from services.shuttle import retrieve_shuttles

def route_and_execute(
    intent: str,
    query: str,
    context: Dict[str, Any],
    memory: list,
    session_id: str = "default"
) -> Dict[str, Any]:
    if intent == "leave_mail":
        return process_leave_mail_node(query=query, context=context, session_id=session_id)
    
    if intent == "shuttle":
        shuttle_res = retrieve_shuttles(query, minutes_ahead=30)
        return {
            "answer": shuttle_res["answer"],
            "actions": [],
            "suggestions": [
                "Next shuttle to Whitefield",
                "Show all running campus shuttles",
                "Buggy ETA at Main Gate"
            ],
            "context_used": ["Campus Transport Knowledge Base"]
        }
    
    # Default: LLM Response
    return generate_llm_response(query=query, context=context, memory=memory)
