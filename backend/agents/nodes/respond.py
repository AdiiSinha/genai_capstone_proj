import json
import logging
from typing import Dict, Any, List
from core.llm import raw_provider_call, get_chat_model
from langchain_core.messages import SystemMessage, HumanMessage
from services.suggestions import dynamic_fallback_suggestions

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are Workday Copilot, a concise enterprise employee workday intelligence assistant.
Use ONLY the supplied authorized context. Never invent people, emails, deadlines, projects,
completion evidence, or actions. Mail may be real Microsoft Graph data.

Return JSON ONLY with exactly these top-level keys:
{
  "answer": "...",
  "actions": [],
  "suggestions": [],
  "context_used": []
}

For normal requests, keep answer concise, helpful, and professional.

==================================================
ACTION SCHEMA
==================================================
If the user asks to compose, reply, draft, or email someone, provide an action item:
{
  "label": "Review & Send Email",
  "mode": "mail",  // "mail", "reply", "leave"
  "to": "email@example.com",
  "cc": "",
  "subject": "Subject text",
  "body": "Body text"
}
"""

def generate_llm_response(query: str, context: Dict[str, Any], memory: List[Dict[str, Any]]) -> Dict[str, Any]:
    compact_context = {
        "profile": context.get("profile"),
        "emails": context.get("emails", [])[:40],
        "calendar": context.get("calendar", [])[:25],
        "teams": context.get("teams", [])[:40],
        "tasks": context.get("tasks", [])[:25],
        "projects": context.get("projects", [])[:10],
        "workplace": context.get("workplace", {})
    }

    user_payload = (
        "CONTEXT:\n" + json.dumps(compact_context, ensure_ascii=False) +
        "\nRECENT CONVERSATION MEMORY:\n" + json.dumps(memory[-12:], ensure_ascii=False) +
        "\nREQUEST:\n" + query
    )

    try:
        # 1. Try LangChain Chat Model
        chat = get_chat_model(temperature=0.18)
        response_msg = chat.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_payload)
        ])
        content = str(response_msg.content).replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
    except Exception as e:
        logger.warning(f"LangChain call had issue ({e}); trying raw provider call...")
        try:
            content = raw_provider_call([
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_payload}
            ], temperature=0.18)
            data = json.loads(content)
        except Exception as ex:
            logger.error(f"Both LLM attempts failed: {ex}")
            data = {
                "answer": f"I analyzed your request, but could not complete the query against the current model: {ex}",
                "actions": [],
                "suggestions": dynamic_fallback_suggestions(query),
                "context_used": []
            }

    data.setdefault("actions", [])
    data.setdefault("suggestions", dynamic_fallback_suggestions(query))
    data.setdefault("context_used", ["Enterprise Context"])
    data.setdefault("answer", "I couldn't generate a concise answer from the available context.")
    
    # Post-processing: clean asterisks and em dashes
    if "answer" in data and isinstance(data["answer"], str):
        data["answer"] = data["answer"].replace("*", "").replace("—", " - ").replace("–", " - ")

    return data
