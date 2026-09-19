"""
Project intelligence service — handles project metrics calculations, risk scoring,
blocker analysis, sprint velocity tracking, and manager updates.
"""
from typing import Dict, List, Any

def calculate_project_metrics(project_data: Dict[str, Any]) -> Dict[str, Any]:
    """Computes dynamic health score, blocker counts, completion percentage, and risk profile."""
    team = project_data.get("team", [])
    blockers = project_data.get("blockers", [])
    deadlines = project_data.get("deadlines", [])
    sprint = project_data.get("sprint", {})

    high_blockers = [b for b in blockers if b.get("severity") == "high"]
    completed_tasks = sprint.get("completedTasks", 0)
    total_tasks = sprint.get("totalTasks", 1)

    completion_rate = round((completed_tasks / max(total_tasks, 1)) * 100, 1)

    # Risk score calculation
    risk_score = len(high_blockers) * 25 + (100 - completion_rate) * 0.3
    if risk_score > 60:
        health = "at_risk"
    elif risk_score > 30:
        health = "needs_attention"
    else:
        health = "on_track"

    return {
        "id": project_data.get("id"),
        "name": project_data.get("name"),
        "health": health,
        "completionRate": completion_rate,
        "totalBlockers": len(blockers),
        "highBlockers": len(high_blockers),
        "teamCount": len(team),
        "nextMilestone": deadlines[0] if deadlines else None
    }

def aggregate_all_projects(projects_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generates overall portfolio summary statistics across active projects."""
    processed = [calculate_project_metrics(p) for p in projects_list]
    total_blockers = sum(p["totalBlockers"] for p in processed)
    total_high_blockers = sum(p["highBlockers"] for p in processed)
    at_risk_count = sum(1 for p in processed if p["health"] == "at_risk")

    return {
        "totalProjects": len(projects_list),
        "atRiskProjects": at_risk_count,
        "totalBlockers": total_blockers,
        "criticalBlockers": total_high_blockers,
        "projects": processed
    }
