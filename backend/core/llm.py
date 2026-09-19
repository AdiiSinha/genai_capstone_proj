import json
import logging
import requests
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, BaseMessage
from core.config import settings

logger = logging.getLogger(__name__)

def get_chat_model(temperature: float = 0.1) -> ChatOpenAI:
    if not (settings.GENAI_API_KEY and settings.GENAI_BASE_URL and settings.GENAI_MODEL):
        raise RuntimeError("AI backend not configured. Ensure GENAI_API_KEY, GENAI_BASE_URL, and GENAI_MODEL are in .env.")
    
    # LangChain ChatOpenAI configured with custom base_url
    return ChatOpenAI(
        model=settings.GENAI_MODEL,
        openai_api_key=settings.GENAI_API_KEY,
        openai_api_base=settings.GENAI_BASE_URL,
        temperature=temperature,
        timeout=90
    )

def raw_provider_call(messages: list[dict], temperature: float = 0.1) -> str:
    """Direct provider call fallback or structured JSON completion."""
    if not (settings.GENAI_API_KEY and settings.GENAI_BASE_URL and settings.GENAI_MODEL):
        raise RuntimeError("AI backend not configured. Fill backend/.env.")
    
    payload = {
        "model": settings.GENAI_MODEL,
        "temperature": temperature,
        "messages": messages
    }
    r = requests.post(
        settings.GENAI_BASE_URL + "/chat/completions",
        headers={"Authorization": "Bearer " + settings.GENAI_API_KEY, "Content-Type": "application/json"},
        json=payload,
        timeout=90
    )
    if not r.ok:
        raise RuntimeError(f"AI provider HTTP {r.status_code}: {r.text[:700]}")
    content = r.json()["choices"][0]["message"]["content"]
    return content.replace("```json", "").replace("```", "").strip()
