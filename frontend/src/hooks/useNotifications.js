/**
 * useNotifications.js — Notification building, reading, dismissing, snoozing.
 * All notification intelligence is built from Python backend first, with a
 * local fallback computed from Graph data, tasks, and commitments.
 */
import { useState, useEffect } from "react";
import { fetchBackendNotifications } from "../services/ai";
import { eventDate } from "../calendarDate";
import { tasks, teams } from "../data";

export function useNotifications({ data, commitments, token }) {
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  function buildLocalNotifications() {
    const items = [];

    const urgentTask = tasks[0];
    if (urgentTask) {
      items.push({
        id: "task-urgent",
        group: "Urgent tasks",
        priority: "critical",
        title: urgentTask[0],
        message: `${urgentTask[0]} is due ${urgentTask[2]} and ${urgentTask[4]}`,
        time: "Due today",
        read: false,
        target: "home",
        aiPrompt: `What should I do about ${urgentTask[0]}?`
      });
    }

    const topTeam = teams.find(x => /waiting|approval|demo|review/i.test(x[2]));
    if (topTeam) {
      items.push({
        id: `team-${topTeam[1]}`,
        group: "Waiting for replies",
        priority: /waiting|approval/i.test(topTeam[2]) ? "critical" : "high",
        title: `${topTeam[1]} needs follow-up`,
        message: topTeam[2],
        time: "Needs action",
        read: false,
        target: "mail",
        aiPrompt: `Summarize the pending follow-up for ${topTeam[1]} and suggest the next action.`
      });
    }

    // Calendar upcoming meetings
    const upcomingMeetings = (data.c || [])
      .filter(event =>
        !event.isCancelled &&
        !event.isAllDay &&
        event.start?.dateTime &&
        eventDate(event.start)?.getTime() >= Date.now()
      )
      .sort((a, b) => eventDate(a.start).getTime() - eventDate(b.start).getTime());

    upcomingMeetings.slice(0, 2).forEach(meeting => {
      const start = eventDate(meeting.start);
      const minutesUntilStart = Math.max(1, Math.ceil((start.getTime() - Date.now()) / 60000));
      items.push({
        id: `meeting-${meeting.id || meeting.subject}`,
        group: "Meeting reminders",
        priority: minutesUntilStart <= 20 ? "critical" : "high",
        title: meeting.subject || "Upcoming meeting",
        message: `Starts in ${minutesUntilStart} minutes.`,
        time: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: false,
        target: "calendar",
        aiPrompt: `Prepare me for my next meeting: ${meeting.subject || "upcoming meeting"}.`
      });
    });

    // Stale unread mail
    const staleUnread = (data.m || []).find(mail => {
      if (mail.isRead || !mail.receivedDateTime) return false;
      return Date.now() - new Date(mail.receivedDateTime).getTime() >= 60 * 60000;
    });
    if (staleUnread) {
      const ageHours = Math.max(1, Math.floor((Date.now() - new Date(staleUnread.receivedDateTime).getTime()) / 3600000));
      items.push({
        id: `unread-${staleUnread.id || "mail"}`,
        group: "Due today",
        priority: "medium",
        title: "Unread email needs attention",
        message: `${staleUnread.subject || "An inbox message"} has been unread for ${ageHours}h.`,
        time: "Unread",
        read: false,
        target: "mail",
        aiPrompt: `Summarize this unread email: ${staleUnread.subject || "latest unread email"}.`
      });
    }

    // Commitments
    commitments
      .filter(c => ["overdue", "due_today", "due_soon"].includes(c.status))
      .slice(0, 2)
      .forEach(c => {
        items.push({
          id: `commitment-${c.id || c.title}`,
          group: "Deadlines & escalations",
          priority: c.status === "overdue" || c.priority === "high" ? "critical" : "high",
          title: c.title || c.action || "Commitment needs attention",
          message: c.status === "overdue"
            ? `${c.action || "This commitment"} is overdue.`
            : `${c.action || "This commitment"} is ${c.dueLabel || c.status.replace("_", " ")}.`,
          time: c.dueLabel || c.status.replace("_", " "),
          read: false,
          target: "commit",
          aiPrompt: `What is the next action for: ${c.action || c.title}?`
        });
      });

    if (data.m?.length) {
      const mail = data.m[0];
      items.push({
        id: `mail-${mail.id || "latest"}`,
        group: "Due today",
        priority: "medium",
        title: "Inbox action needed",
        message: `${mail.subject || "Latest email"} may need a response.`,
        time: "Quick follow-up",
        read: false,
        target: "mail",
        aiPrompt: `Draft a short response for: ${mail.subject || "latest email"}.`
      });
    }

    return items.slice(0, 8);
  }

  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      try {
        const t = await token();
        const serverItems = await fetchBackendNotifications({ emails: data.m, calendar: data.c, commitments }, t);
        if (active && serverItems?.length) {
          setNotifications(serverItems);
          return;
        }
      } catch (e) {
        console.warn("Backend notifications fallback:", e);
      }
      if (active) setNotifications(buildLocalNotifications());
    }
    loadNotifications();
    return () => { active = false; };
  }, [data, commitments]);

  function markRead(id) {
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, read: true } : item));
  }

  function dismiss(id) {
    setNotifications(prev => prev.filter(item => item.id !== id));
  }

  function snooze(id) {
    markRead(id);
  }

  return {
    notifications,
    notificationsOpen,
    setNotificationsOpen,
    markRead,
    dismiss,
    snooze
  };
}
