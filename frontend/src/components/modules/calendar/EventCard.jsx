/**
 * EventCard.jsx — Meeting card sub-component for Calendar view.
 */
import React, { useState } from "react";
import {
  cleanText,
  formatDate,
  formatFullDate,
  formatTime,
  getLocation,
  getMeetingLink,
  getOrganizer,
  getOrganizerEmail,
  getParticipants,
  getStatus
} from "./calendarUtils";

export function EventCard({ event, important, onImportant, onMail, onJoin }) {
  const [expanded, setExpanded] = useState(false);
  const status = getStatus(event);
  const participants = getParticipants(event);
  const description = cleanText(event.bodyPreview) || cleanText(event.body?.content) || "No description available.";
  const organizer = getOrganizer(event);
  const organizerEmail = getOrganizerEmail(event);
  const location = getLocation(event);
  const joinLink = getMeetingLink(event);

  return (
    <article className={`calendarMeeting ${status} ${important ? "important" : ""}`}>
      <div className="calendarMeetingRail" />
      <div className="calendarMeetingDate">
        <span>{formatDate(event.start)}</span>
        <strong>{formatTime(event.start)}</strong>
      </div>
      <div className="calendarMeetingContent">
        <div className="calendarMeetingHeader">
          <div className="calendarMeetingTitles">
            <span className={`calendarStatusTag ${status}`}>{status.toUpperCase()}</span>
            <h3>{event.subject || "Untitled Meeting"}</h3>
          </div>
          <button
            className={`calendarStar ${important ? "on" : ""}`}
            onClick={() => onImportant(event)}
            title="Toggle importance"
          >
            ★
          </button>
        </div>
        <div className="calendarMeetingMeta">
          <span>👤 {organizer}</span>
          <span>📍 {location}</span>
          <span>👥 {participants.length} Attendees</span>
        </div>

        {expanded && (
          <div className="calendarMeetingDetails">
            <p>{description}</p>
            <div className="calendarMeetingGrid">
              <div>
                <small>Organizer</small>
                <strong>{organizer}</strong>
                <span>{organizerEmail}</span>
              </div>
              <div>
                <small>Start Time</small>
                <strong>{formatFullDate(event.start)}</strong>
              </div>
              <div>
                <small>End Time</small>
                <strong>{formatFullDate(event.end)}</strong>
              </div>
            </div>
            {participants.length > 0 && (
              <div className="calendarMeetingAttendees">
                <small>Attendees</small>
                <div className="calendarAttendeePills">
                  {participants.map((att, idx) => (
                    <span key={idx} className="calendarAttendeePill">
                      {att.emailAddress?.name || att.emailAddress?.address}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="calendarMeetingActions">
          {joinLink && (
            <a
              className="calendarBtn primary"
              href={joinLink}
              target="_blank"
              rel="noreferrer"
              onClick={() => onJoin(event)}
            >
              Join Meeting ↗
            </a>
          )}
          <button className="calendarBtn" onClick={() => onMail(event)}>
            Mail Organizer
          </button>
          <button className="calendarBtn" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Hide Details" : "Details"}
          </button>
        </div>
      </div>
    </article>
  );
}
