import re
from datetime import datetime, timedelta
from typing import Dict, Any, List

SHUTTLE_KNOWLEDGE = [
    {"route": "Shuttle A", "direction": "Whitefield to Campus", "stops": ["Main Gate", "Library", "Tech Block"], "gate": "Gate 1", "offset": 6, "frequency": "Every 20 minutes", "status": "running"},
    {"route": "Shuttle C", "direction": "Bellandur to Campus", "stops": ["Main Gate", "Tech Block", "East Loop"], "gate": "Gate 3", "offset": 4, "frequency": "Every 30 minutes", "status": "running"},
    {"route": "Shuttle F", "direction": "Main Gate to Library", "stops": ["Main Gate", "Library"], "gate": "Main Gate", "offset": 0, "frequency": "Every 10 minutes", "status": "running"},
    {"route": "Shuttle G", "direction": "Main Gate to Tech Block", "stops": ["Main Gate", "Tech Block"], "gate": "Main Gate", "offset": 2, "frequency": "Every 10 minutes", "status": "running"},
    {"route": "Buggy 03", "direction": "Campus loop", "stops": ["Main Gate", "Library", "Tech Block", "East Loop"], "gate": "Main Lobby", "offset": -2, "frequency": "Every 10 minutes", "status": "running"}
]

def retrieve_shuttles(query: str, minutes_ahead: int) -> Dict[str, Any]:
    now = datetime.now().astimezone()
    query_lower = query.lower()
    terms = set(re.findall(r"[a-z0-9]+", query_lower))
    asks_running = any(word in query_lower for word in ("running", "operating", "active"))
    destination_terms = {
        stop.lower() for record in SHUTTLE_KNOWLEDGE for stop in record["stops"]
        if stop.lower() in query_lower
    }
    matches = []

    for record in SHUTTLE_KNOWLEDGE:
        searchable = " ".join([
            record["route"], record["direction"], record["gate"], record["frequency"],
            " ".join(record["stops"]), record["status"]
        ]).lower()
        record_terms = set(re.findall(r"[a-z0-9]+", searchable))
        relevance = len(terms & record_terms) if terms else 1
        has_destination = bool(destination_terms & {stop.lower() for stop in record["stops"]})
        if destination_terms and not has_destination:
            continue
        if asks_running and record["status"] != "running":
            continue
        scheduled_minutes = record["offset"]
        status = "just_left" if scheduled_minutes < 0 else "leaving_soon" if scheduled_minutes == 0 else "upcoming"
        departure = now + timedelta(minutes=scheduled_minutes)
        matches.append({
            **record,
            "departureAt": departure.isoformat(),
            "scheduledAt": (now + timedelta(minutes=scheduled_minutes)).isoformat(),
            "minutes": scheduled_minutes,
            "scheduledMinutes": scheduled_minutes,
            "status": status,
            "eta": f"{abs(scheduled_minutes)} min ago" if scheduled_minutes < 0 else "Boarding now" if scheduled_minutes == 0 else f"{scheduled_minutes} min",
            "serviceStatus": record["status"],
            "stops": record["stops"],
            "relevance": relevance
        })

    matches.sort(key=lambda item: (-item["relevance"], item["minutes"]))
    selected = [item for item in matches if item["minutes"] <= minutes_ahead or item["status"] == "just_left"]
    grouped = {"upcoming": [], "leaving_soon": [], "just_left": []}
    for item in selected:
        grouped[item["status"]].append(item)
    answer = "No matching shuttle was found."
    if matches:
        if destination_terms:
            next_bus = next((item for item in matches if item["status"] != "just_left"), matches[0])
            answer = f"The next shuttle serving {next(iter(destination_terms)).title()} is {next_bus['route']} in {next_bus['eta']}."
        elif asks_running:
            answer = f"{len(matches)} shuttle(s) are currently running."
        else:
            next_bus = next((item for item in matches if item["status"] != "just_left"), matches[0])
            answer = f"The next shuttle is {next_bus['route']} in {next_bus['eta']}."
    return {"groups": grouped, "answer": answer}
