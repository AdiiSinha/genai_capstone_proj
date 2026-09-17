import os
import json
import re
from pathlib import Path
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Resolve .env path relative to this file so it works regardless of CWD
_ENV_PATH = Path(__file__).resolve().parent / ".env"

# Initial load at startup
load_dotenv(dotenv_path=_ENV_PATH, override=True)

app = FastAPI(title="Workday Copilot AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class Req(BaseModel):
    query: str
    context: dict = Field(default_factory=dict)
    memory: list = Field(default_factory=list)

SYSTEM = """
You are Workday Copilot, a concise enterprise employee workday intelligence assistant.

Your job is to turn the supplied authorized context into a short, useful answer.
Use ONLY the supplied context. Do not invent people, emails, deadlines, meetings or actions.
Teams/project/task data in this prototype is synthetic. Mail and calendar may be real Microsoft Graph data.

STYLE RULES:
- Be crisp and professional. Prefer 1-5 short lines or bullets.
- Do not dump raw JSON, IDs, timestamps, sender metadata, Graph fields, or technical implementation details.
- For email-related requests, focus on SUBJECT and BODY/content only unless the user asks for sender/date/details.
- If there are many emails, summarize only the important/actionable ones. Group duplicates or repeated information.
- For 'catch me up', return only the most relevant updates, each as: Subject — concise body summary.
- For 'what is urgent', prioritize deadlines, blockers and business impact.
- For 'what should I do next', give one primary next action, then at most two follow-ups.
- For commitments, say what was promised and by when.
- For waiting/dependencies, say what is blocked and who/what is awaited if known.
- For meeting preparation, return the meeting plus only the 2-4 most relevant preparation points.
- Never claim an action was executed. Important actions require human approval.

ACTIONS:
Return optional UI actions only when genuinely useful. Supported action objects:
{"label":"Draft reply","type":"draft_reply","to":"email","subject":"...","body":"..."}
{"label":"Save draft","type":"save_draft","to":"email","subject":"...","body":"..."}
{"label":"Mark important","type":"important"}
{"label":"Flag for follow-up","type":"flag"}
If you cannot safely determine the exact recipient, do not create a draft action.

SUGGESTIONS:
Return 3-6 short follow-up commands that are directly grounded in the current answer/context. Avoid generic suggestions when a specific useful next action is obvious.
Examples: "Draft a reply", "What is due before 4 PM?", "Prepare for the client demo", "Show important mail".

Return JSON ONLY:
{
  "answer": "short professional answer",
  "actions": [],
  "suggestions": ["..."],
  "context_used": []
}
"""


def get_config():
    # Reload environment variables on the fly in case .env was modified after startup
    load_dotenv(dotenv_path=_ENV_PATH, override=True)
    key = os.getenv("GENAI_API_KEY", "").strip()
    base = os.getenv("GENAI_BASE_URL", "").rstrip("/")
    model = os.getenv("GENAI_MODEL", "").strip()
    return key, base, model


def extract_json(text: str):
    # Remove markdown code blocks if present
    cleaned = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except Exception:
        # Fallback: search for first JSON object {...}
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
    return None


def call(q, c, memory):
    key, base, model = get_config()
    if not (key and base and model):
        raise RuntimeError("AI backend not configured. Please fill GENAI_API_KEY, GENAI_BASE_URL, and GENAI_MODEL in backend/.env.")

    compact = {
        "profile": c.get("profile"),
        "emails": c.get("emails", [])[:40],
        "calendar": c.get("calendar", [])[:25],
        "teams": c.get("teams", [])[:40],
        "tasks": c.get("tasks", [])[:25],
        "projects": c.get("projects", [])[:10],
        "workplace": c.get("workplace", {})
    }
    payload = {
        "model": model,
        "temperature": 0.18,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content":
             "CONTEXT:\n" + json.dumps(compact, ensure_ascii=False) +
             "\nRECENT CONVERSATION MEMORY:\n" + json.dumps(memory[-12:], ensure_ascii=False) +
             "\nREQUEST:\n" + q}
        ]
    }
    try:
        r = requests.post(
            f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json=payload,
            timeout=60
        )
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Failed to connect to AI provider: {str(e)}")

    if not r.ok:
        raise RuntimeError(f"AI provider HTTP {r.status_code}: {r.text[:700]}")

    try:
        res_json = r.json()
    except Exception:
        raise RuntimeError(f"AI provider returned non-JSON response: {r.text[:500]}")

    if "error" in res_json:
        err_msg = res_json["error"].get("message") if isinstance(res_json["error"], dict) else str(res_json["error"])
        raise RuntimeError(f"AI provider error: {err_msg}")

    choices = res_json.get("choices", [])
    if not choices:
        raise RuntimeError(f"AI provider returned empty choices: {r.text[:500]}")

    content = choices[0].get("message", {}).get("content", "")
    data = extract_json(content)
    if data is None or not isinstance(data, dict):
        data = {"answer": content, "actions": [], "suggestions": [], "context_used": []}

    # Keep the frontend contract stable even if a model omits optional fields.
    data.setdefault("actions", [])
    data.setdefault("suggestions", [])
    data.setdefault("context_used", [])
    data.setdefault("answer", "I couldn't generate a concise answer from the available context.")
    return data


@app.get("/health")
def health():
    key, base, model = get_config()
    return {
        "ok": True,
        "configured": bool(key and base and model),
        "model": model or None,
        "base_url": base or None
    }


@app.post("/api/copilot")
def copilot(x: Req):
    try:
        return call(x.query, x.context, x.memory)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
