/**
 * calendarUtils.js — Helper functions for date formatting, organizer extraction, meeting links, and status calculation.
 */
import { eventDate, formatEventTime } from "../../../calendarDate";

export function safeDate(point) {
  return eventDate(point);
}

export function formatTime(point) {
  return formatEventTime(point);
}

export function formatDate(point) {
  const d = safeDate(point);
  if (!d) return "--";
  return d.toLocaleDateString([], {
    weekday: "short",
    day: "2-digit",
    month: "short"
  });
}

export function formatFullDate(point) {
  const d = safeDate(point);
  if (!d) return "--";
  return d.toLocaleString([], {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function cleanText(value) {
  if (!value) return "";
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function getOrganizer(event) {
  return (
    event.organizer?.emailAddress?.name ||
    event.organizer?.emailAddress?.address ||
    "Organizer unavailable"
  );
}

export function getOrganizerEmail(event) {
  return event.organizer?.emailAddress?.address || "";
}

export function getParticipants(event) {
  return Array.isArray(event.attendees) ? event.attendees : [];
}

export function getLocation(event) {
  if (event.location?.displayName) return event.location.displayName;
  if (Array.isArray(event.locations) && event.locations.length) {
    return event.locations.map(x => x.displayName).filter(Boolean).join(", ");
  }
  return "No location";
}

export function getMeetingLink(event) {
  return event.onlineMeeting?.joinUrl || event.onlineMeeting?.joinWebUrl || event.webLink || "";
}

export function getStatus(event) {
  if (event.isCancelled) return "cancelled";
  const start = safeDate(event.start);
  const end = safeDate(event.end);
  if (!start || !end) return "upcoming";

  const now = new Date();
  if (now >= start && now <= end) return "ongoing";
  if (end < now) return "missed";
  return "upcoming";
}

export function getImportance(event) {
  return event.importance === "high";
}

export function isToday(event) {
  const start = safeDate(event.start);
  if (!start) return false;
  const now = new Date();
  return (
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate()
  );
}

export function isSoon(event) {
  const start = safeDate(event.start);
  if (!start) return false;
  const now = new Date();
  const diff = start.getTime() - now.getTime();
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}

export function isUrgent(event) {
  if (getStatus(event) === "ongoing") return true;
  if (getImportance(event)) return true;
  if (isSoon(event)) return true;
  return false;
}
