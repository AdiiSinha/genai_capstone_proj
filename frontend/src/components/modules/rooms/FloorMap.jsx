/**
 * FloorMap.jsx — Interactive SVG floor map component for meeting rooms visualizer.
 */
import React from "react";

export function FloorMap({ rooms, selectedRoom, onSelectRoom, activeFloor }) {
  return (
    <div className="roomsMapContainer">
      <div className="roomsMapHeader">
        <h4>Floor Blueprint ({activeFloor})</h4>
        <div className="roomsMapLegend">
          <span className="legendItem available"><i /> Available</span>
          <span className="legendItem busy"><i /> Occupied</span>
          <span className="legendItem selected"><i /> Selected</span>
        </div>
      </div>
      <div className="svgWrapper">
        <svg viewBox="0 0 720 220" className="floorBlueprintSvg">
          <rect x="10" y="10" width="700" height="200" rx="12" className="buildingOutline" />
          <path d="M 20 180 L 700 180" className="hallwayLine" />
          <text x="360" y="200" textAnchor="middle" className="hallwayText">Main Executive Corridor</text>

          {rooms.map(r => {
            const isSel = selectedRoom?.id === r.id;
            return (
              <g
                key={r.id}
                className={`roomNode ${r.available ? "available" : "busy"} ${isSel ? "selected" : ""}`}
                onClick={() => onSelectRoom(r)}
              >
                <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="8" className="roomBox" />
                <text x={r.x + r.w / 2} y={r.y + 40} textAnchor="middle" className="roomTitle">{r.name}</text>
                <text x={r.x + r.w / 2} y={r.y + 65} textAnchor="middle" className="roomCap">👥 {r.capacity} seats</text>
                <text x={r.x + r.w / 2} y={r.y + 90} textAnchor="middle" className="roomStatus">
                  {r.available ? "● Free" : "● Occupied"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
