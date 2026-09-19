/**
 * BookingModal.jsx — Booking form modal for room reservation.
 */
import React from "react";

export function BookingModal({ room, onClose, onSubmit }) {
  if (!room) return null;

  return (
    <div className="drawerBack" onClick={onClose}>
      <form className="draft" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <button type="button" className="x" onClick={onClose}>×</button>
        <small className="kicker">RESERVE MEETING ROOM</small>
        <h2>Book {room.name} ({room.floor})</h2>
        <p>Capacity: {room.capacity} seats · Amenities: {room.amenities.join(", ")}</p>

        <label>
          Meeting Title
          <input name="title" required placeholder="e.g. Sprint Review & Retrospective" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label>
            Start Time
            <input name="start" type="time" defaultValue="14:00" required />
          </label>
          <label>
            Duration
            <select name="duration" defaultValue="30">
              <option value="15">15 mins</option>
              <option value="30">30 mins</option>
              <option value="45">45 mins</option>
              <option value="60">1 hour</option>
            </select>
          </label>
        </div>

        <footer>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary">✦ Confirm Reservation</button>
        </footer>
      </form>
    </div>
  );
}
