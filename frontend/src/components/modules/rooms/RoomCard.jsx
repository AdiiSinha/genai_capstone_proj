/**
 * RoomCard.jsx — Single meeting room availability card.
 */
import React from "react";

export function RoomCard({ room, isSelected, onSelect, onBook }) {
  return (
    <article
      className={`roomCard ${room.available ? "free" : "occupied"} ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(room)}
    >
      <div className="roomCardHeader">
        <div>
          <h3>{room.name}</h3>
          <span className="roomFloorTag">{room.floor}</span>
        </div>
        <span className={`roomStatePill ${room.available ? "free" : "busy"}`}>
          {room.available ? "Available" : "Occupied"}
        </span>
      </div>

      <div className="roomMeta">
        <span>👥 Capacity: {room.capacity}</span>
        <span>⏱ {room.nextSlot}</span>
      </div>

      {room.currentMeeting && (
        <div className="currentMeetingBox">
          <small>Current Meeting:</small>
          <strong>{room.currentMeeting.title}</strong>
          <span>Organizer: {room.currentMeeting.organizer} (ends {room.currentMeeting.end})</span>
        </div>
      )}

      <div className="roomAmenities">
        {room.amenities.map((a, idx) => (
          <span key={idx} className="amenityChip">{a}</span>
        ))}
      </div>

      <div className="roomCardActions">
        <button
          className="primary"
          disabled={!room.available}
          onClick={e => {
            e.stopPropagation();
            onBook(room);
          }}
        >
          {room.available ? "Book Room" : "Occupied"}
        </button>
      </div>
    </article>
  );
}
