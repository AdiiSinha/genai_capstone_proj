/**
 * OfficeCard.jsx — Component for single office item in list view.
 */
import React from "react";
import { getDirectionsUrl } from "./workplaceUtils";

export function OfficeCard({ office, isSelected, onSelect, userLocation }) {
  const directionsUrl = getDirectionsUrl(
    office.latitude,
    office.longitude,
    office.name,
    userLocation
  );

  return (
    <article
      className={`wpOfficeCard ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(office)}
    >
      <div className="wpOfficeHeader">
        <div>
          <h3>{office.name}</h3>
          <span className="wpCityTag">{office.city}, {office.state}</span>
        </div>
        {office.distance_km != null && (
          <span className="wpDistBadge">{office.distance_km} km away</span>
        )}
      </div>

      <p className="wpAddress">📍 {office.address}</p>

      <div className="wpOfficeActions">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="wpDirectionsBtn"
          onClick={e => e.stopPropagation()}
        >
          Get Directions ↗
        </a>
      </div>
    </article>
  );
}
