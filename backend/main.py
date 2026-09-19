import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

# Import routers
from routers.copilot import router as copilot_router
from routers.context import router as context_router
from routers.mail import router as mail_router
from routers.calendar import router as calendar_router
from routers.commitments import router as commitments_router
from routers.notifications import router as notifications_router
from routers.transport import router as transport_router
from routers.projects import router as projects_router

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Workday Copilot AI - Modular Enterprise Agent Backend",
    version="2.0.0",
    description="Python backend powered by LangChain, LangGraph, and Human-in-the-Loop workflows."
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routers
app.include_router(copilot_router)
app.include_router(context_router)
app.include_router(mail_router)
app.include_router(calendar_router)
app.include_router(commitments_router)
app.include_router(notifications_router)
app.include_router(transport_router)
app.include_router(projects_router)

@app.get("/health")
def health():
    return {
        "ok": True,
        "configured": bool(settings.GENAI_API_KEY and settings.GENAI_BASE_URL and settings.GENAI_MODEL),
        "model": settings.GENAI_MODEL or None,
        "frameworks": ["LangChain", "LangGraph", "FastAPI", "HITL"]
    }
