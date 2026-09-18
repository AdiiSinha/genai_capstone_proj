import React, { useEffect, useState } from "react";
import { API } from "../../services/ai";

const fallbackFeed = {
  upcoming: [
    { route: "Shuttle A", direction: "Whitefield to Campus", gate: "Gate 1", status: "upcoming", eta: "6 min", departureAt: new Date(Date.now() + 6 * 60000).toISOString() },
    { route: "Shuttle G", direction: "Main Gate to Tech Block", gate: "Main Gate", status: "upcoming", eta: "2 min", departureAt: new Date(Date.now() + 2 * 60000).toISOString() },
    { route: "Shuttle C", direction: "Bellandur to Campus", gate: "Gate 3", status: "upcoming", eta: "4 min", departureAt: new Date(Date.now() + 4 * 60000).toISOString() }
  ],
  leaving_soon: [
    { route: "Shuttle F", direction: "Main Gate to Library", gate: "Main Gate", status: "leaving_soon", eta: "Boarding now", departureAt: new Date().toISOString() }
  ],
  just_left: [
    { route: "Buggy 03", direction: "Campus loop", gate: "Main Lobby", status: "just_left", eta: "2 min ago", departureAt: new Date(Date.now() - 2 * 60000).toISOString() }
  ]
};

function formatDepartureTime(timestamp) {
  if (!timestamp) return "Time unavailable";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Shuttle({ compact = true }) {
  const [feed, setFeed] = useState(fallbackFeed);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("The next shuttle is Shuttle C in 4 min.");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("Fallback schedule");

  async function fetchShuttles(search = "") {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/shuttle/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: search, minutes_ahead: 30 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Shuttle search failed");
      setFeed(data.results || fallbackFeed);
      setAnswer(data.answer || "No matching shuttle was found.");
      setSource("Retrieved from campus transport knowledge base");
    } catch {
      setFeed(fallbackFeed);
      setAnswer("The next shuttle is Shuttle C in 4 min.");
      setSource("Fallback schedule");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchShuttles();
    const interval = setInterval(() => fetchShuttles(), 30000);
    return () => clearInterval(interval);
  }, []);

  const groups = [
    { key: "upcoming", label: "Upcoming" },
    { key: "leaving_soon", label: "Leaving soon" },
    { key: "just_left", label: "Just left" }
  ];

  const body = (
    <div className={compact ? "shuttleCompact" : "shuttlePanel"}>
      <div className="minimap">
        <i>HQ</i>
        <i>GATE 2</i>
        <span className="busMarker" role="img" aria-label="Live bus">🚌</span>
      </div>

      {!compact && (
        <form className="shuttleSearch" onSubmit={event => { event.preventDefault(); fetchShuttles(query); }}>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search route, gate or location"
            aria-label="Search shuttle routes"
          />
          <button type="submit" disabled={loading}>{loading ? "Searching" : "Search"}</button>
        </form>
      )}
      {!compact && <p className="shuttleAnswer">{answer}</p>}

      {groups.map(group => {
        const items = feed[group.key] || [];
        if (!items.length) return null;

        return (
          <div className="shuttleSection" key={group.key}>
            <h4>{group.label}</h4>
            <div className="shuttleRows">
              {items.map(item => (
                <div className="shuttleRow" key={`${group.key}-${item.route}`}>
                  <div className="shuttleMeta">
                    <strong>{item.route}</strong>
                    <small>{item.direction} · {item.gate}</small>
                    <small className="shuttleDeparture">Departure: {formatDepartureTime(item.departureAt)}</small>
                  </div>
                  <span className={`shuttleState ${item.status}`}>{item.eta}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {!compact && <small className="shuttleSource">Source: {source}</small>}
    </div>
  );

  if (compact) {
    return (
      <>
        <b>
          CAMPUS MOBILITY <em>LIVE MAP</em>
        </b>
        {body}
      </>
    );
  }

  return (
    <div className="panel shuttlePanel">
      <div className="title">
        <h3>Campus mobility</h3>
      </div>
      {body}
    </div>
  );
}
