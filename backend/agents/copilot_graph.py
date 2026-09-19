import logging
from typing import TypedDict, Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from agents.nodes.intent import classify_intent
from agents.nodes.context import assemble_context
from agents.nodes.leave_mail import process_leave_mail_node
from agents.nodes.respond import generate_llm_response
from services.shuttle import retrieve_shuttles
from core.memory import save_memory
from core.post_processing import post_process_ai_response

logger = logging.getLogger(__name__)

class CopilotState(TypedDict):
    query: str
    session_id: str
    raw_context: Dict[str, Any]
    context: Dict[str, Any]
    memory: List[Dict[str, Any]]
    intent: str
    result: Dict[str, Any]
    hitl_pending: Optional[Dict[str, Any]]

# Node functions
def classify_node(state: CopilotState) -> Dict[str, Any]:
    intent = classify_intent(state["query"], state.get("raw_context", {}))
    return {"intent": intent}

def context_node(state: CopilotState) -> Dict[str, Any]:
    ctx = assemble_context(state.get("raw_context", {}))
    return {"context": ctx}

def leave_mail_node(state: CopilotState) -> Dict[str, Any]:
    result = process_leave_mail_node(
        query=state["query"],
        context=state["context"],
        session_id=state.get("session_id", "default")
    )
    return {"result": result, "hitl_pending": result.get("hitl_pending")}

def shuttle_node(state: CopilotState) -> Dict[str, Any]:
    shuttle_res = retrieve_shuttles(state["query"], minutes_ahead=30)
    result = {
        "answer": shuttle_res["answer"],
        "actions": [],
        "suggestions": [
            "Next shuttle to Whitefield",
            "Show all running campus shuttles",
            "Buggy ETA at Main Gate"
        ],
        "context_used": ["Campus Transport Knowledge Base"]
    }
    return {"result": result}

def llm_chat_node(state: CopilotState) -> Dict[str, Any]:
    result = generate_llm_response(
        query=state["query"],
        context=state["context"],
        memory=state.get("memory", [])
    )
    return {"result": result}

def memory_save_node(state: CopilotState) -> Dict[str, Any]:
    res = state.get("result", {})
    answer = res.get("answer", "")
    session_id = state.get("session_id", "default")
    if answer:
        save_memory(session_id, state["query"], answer)
    return {}

# Router condition
def route_intent(state: CopilotState) -> str:
    intent = state.get("intent", "chat")
    if intent == "leave_mail":
        return "leave_mail_node"
    elif intent == "shuttle":
        return "shuttle_node"
    return "llm_chat_node"

# Build the LangGraph StateGraph
builder = StateGraph(CopilotState)

builder.add_node("classify", classify_node)
builder.add_node("assemble_context", context_node)
builder.add_node("leave_mail_node", leave_mail_node)
builder.add_node("shuttle_node", shuttle_node)
builder.add_node("llm_chat_node", llm_chat_node)
builder.add_node("save_memory", memory_save_node)

builder.set_entry_point("classify")
builder.add_edge("classify", "assemble_context")
builder.add_conditional_edges("assemble_context", route_intent, {
    "leave_mail_node": "leave_mail_node",
    "shuttle_node": "shuttle_node",
    "llm_chat_node": "llm_chat_node"
})
builder.add_edge("leave_mail_node", "save_memory")
builder.add_edge("shuttle_node", "save_memory")
builder.add_edge("llm_chat_node", "save_memory")
builder.add_edge("save_memory", END)

copilot_graph = builder.compile()

async def run_copilot_agent(
    query: str,
    raw_context: Dict[str, Any],
    memory: List[Dict[str, Any]],
    session_id: str = "default"
) -> Dict[str, Any]:
    initial_state: CopilotState = {
        "query": query,
        "session_id": session_id,
        "raw_context": raw_context,
        "context": {},
        "memory": memory,
        "intent": "",
        "result": {},
        "hitl_pending": None
    }
    final_state = await copilot_graph.ainvoke(initial_state)
    result = final_state.get("result", {})
    return post_process_ai_response(result)
