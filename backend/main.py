import os
import json
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()
KEY = os.getenv("GENAI_API_KEY", "")
BASE = os.getenv("GENAI_BASE_URL", "").rstrip("/")
MODEL = os.getenv("GENAI_MODEL", "")

app = FastAPI(title="Workday Copilot AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


def call(q, c, memory):
    if not (KEY and BASE and MODEL):
        raise RuntimeError("AI backend not configured. Fill backend/.env.")

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
        "model": MODEL,
        "temperature": 0.18,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content":
             "CONTEXT:\n" + json.dumps(compact, ensure_ascii=False) +
             "\nRECENT CONVERSATION MEMORY:\n" + json.dumps(memory[-12:], ensure_ascii=False) +
             "\nREQUEST:\n" + q}
        ]
    }
    r = requests.post(
        BASE + "/chat/completions",
        headers={"Authorization": "Bearer " + KEY, "Content-Type": "application/json"},
        json=payload,
        timeout=60
    )
    if not r.ok:
        raise RuntimeError(f"AI provider HTTP {r.status_code}: {r.text[:700]}")

    content = r.json()["choices"][0]["message"]["content"].replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(content)
    except Exception:
        data = {"answer": content, "actions": [], "suggestions": [], "context_used": []}

    # Keep the frontend contract stable even if a model omits optional fields.
    data.setdefault("actions", [])
    data.setdefault("suggestions", [])
    data.setdefault("context_used", [])
    data.setdefault("answer", "I couldn't generate a concise answer from the available context.")
    return data

@app.get("/health")
def health():
    return {"ok": True, "configured": bool(KEY and BASE and MODEL), "model": MODEL or None}

@app.post("/api/copilot")
def copilot(x: Req):
    try:
        return call(x.query, x.context, x.memory)
    except Exception as e:
        raise HTTPException(500, str(e))
