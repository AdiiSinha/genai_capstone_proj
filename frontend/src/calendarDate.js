function isUtcTimeZone(timeZone) {
  return !timeZone || /^(utc|gmt|coordinated universal time)$/i.test(timeZone);
}

export function eventDate(point) {
  if (!point?.dateTime) return null;

  const value = String(point.dateTime).trim();
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalized = !hasOffset && isUtcTimeZone(point.timeZone)
    ? `${value}Z`
    : value;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatEventTime(point) {
  const date = eventDate(point);

  return date
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--";
}