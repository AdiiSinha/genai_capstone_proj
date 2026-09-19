"""
FastAPI Router for Projects Intelligence & Dynamic KPI calculations.
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, List, Any
from services.project_service import calculate_project_metrics, aggregate_all_projects

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.post("/summary")
async def get_projects_summary(payload: Dict[str, Any] = Body(...)):
    """Receives list of projects and computes portfolio analytics and KPI metrics."""
    try:
        projects_list = payload.get("projects", [])
        return aggregate_all_projects(projects_list)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/metrics")
async def get_single_project_metrics(project: Dict[str, Any] = Body(...)):
    """Calculates granular risk, blocker, and completion metrics for a single project."""
    try:
        return calculate_project_metrics(project)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
