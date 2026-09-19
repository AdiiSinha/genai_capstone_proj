/**
 * StatCard.jsx — Stat button selector for filtering calendar events.
 */
import React from "react";

export function StatCard({ icon, value, label, tone, onClick, active }) {
  return (
    <button
      className={`calendarStat ${tone || ""} ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="calendarStatIcon">{icon}</span>
      <span className="calendarStatBody">
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
      <span className="calendarStatGlow" />
    </button>
  );
}
