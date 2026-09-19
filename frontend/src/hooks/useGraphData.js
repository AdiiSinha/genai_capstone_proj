/**
 * useGraphData.js — Loads Microsoft Graph data (profile, mail, calendar).
 * Handles polling, refresh, and errors. Keeps App.jsx free of data fetching.
 */
import { useState, useRef, useEffect } from "react";
import {
  getProfile,
  getMail,
  getSentMail,
  getCalendar
} from "../graph";
import { eventDate } from "../calendarDate";

export function useGraphData({ token, mountedRef, onLoad }) {
  const [data, setData] = useState({ p: null, m: [], sent: [], c: [] });
  const calendarPollRef = useRef(null);
  const remindedMeetingsRef = useRef(new Set());

  function checkMeetingReminders(events, setToast) {
    const now = Date.now();
    events.forEach(event => {
      if (event.isCancelled || event.isAllDay || !event.start?.dateTime) return;
      const startDate = eventDate(event.start);
      if (!startDate) return;
      const start = startDate.getTime();
      const minutesUntilStart = (start - now) / 60000;
      const reminderStage = minutesUntilStart <= 5 ? "5" : minutesUntilStart <= 10 ? "10" : null;
      if (minutesUntilStart < 0 || !reminderStage) return;
      const meetingId = event.id || `${event.subject}-${event.start.dateTime}`;
      const reminderKey = `${meetingId}-${reminderStage}`;
      if (remindedMeetingsRef.current.has(reminderKey)) return;
      remindedMeetingsRef.current.add(reminderKey);
      setToast?.(`Meeting starts in ${reminderStage} minutes: ${event.subject || "Upcoming meeting"}`);
    });
  }

  async function load(setToast) {
    try {
      const t = await token();
      const [p, m, sent, c] = await Promise.all([
        getProfile(t),
        getMail(t),
        getSentMail(t),
        getCalendar(t)
      ]);
      if (!mountedRef.current) return;
      const newData = {
        p,
        m: m.value || [],
        sent: sent.value || [],
        c: c.value || []
      };
      setData(newData);
      onLoad?.(newData);
      checkMeetingReminders(newData.c, setToast);
    } catch (e) {
      console.error("GRAPH LOAD ERROR:", e);
      setToast?.(`Graph data load failed: ${e.message}`);
    }
  }

  async function refreshCalendar(setToast) {
    try {
      const t = await token();
      const calendar = await getCalendar(t);
      const events = calendar.value || [];
      if (!mountedRef.current) return;
      setData(prev => ({ ...prev, c: events }));
      checkMeetingReminders(events, setToast);
    } catch (e) {
      console.warn("CALENDAR REFRESH ERROR:", e);
    }
  }

  return { data, setData, load, refreshCalendar, calendarPollRef };
}
