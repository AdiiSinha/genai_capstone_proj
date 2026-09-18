import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./auth";
import {
  getProfile,
  getMail,
  getSentMail,
  getCalendar,
  markRead,
  sendMail,
  createDraft,
  markImportant,
  flagMail,
  updateCalendarImportance
} from "./graph";
import { teams, tasks, rooms, buses, news, projects } from "./data";
import { ai, BASE_SUGGESTIONS, dynamicFallback, fallback } from "./services/ai";
import { cleanSpeech, chooseVoice } from "./services/speech";
import { eventDate } from "./calendarDate";

import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { Right } from "./components/layout/Right";
import { NotificationCenter } from "./components/layout/NotificationCenter";

import { Home } from "./components/modules/Home";
import { Copilot } from "./components/modules/Copilot";
import { Mail } from "./components/modules/Mail";
import { Calendar } from "./components/modules/Calendar";
import { Commit } from "./components/modules/Commit";
import { Projects } from "./components/modules/Projects";
import { Waiting } from "./components/modules/Waiting";
import { Workplace } from "./components/modules/Workplace";
import { Rooms } from "./components/modules/Rooms";

import { Login } from "./components/modals/Login";
import { Splash } from "./components/modals/Splash";
import { Modal } from "./components/modals/Modal";
import { ProfileCard } from "./components/modals/ProfileCard";

export function App() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const [mod, setMod] = useState("home");
  const [d, setD] = useState({
  p: null,
  m: [],
  sent: [],
  c: []
});
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState("");
  const [state, setState] = useState("idle");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [splash, setSplash] = useState(false);
  const [suggestions, setSuggestions] = useState(BASE_SUGGESTIONS);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [autoListen, setAutoListen] = useState(true);
  const [muted, setMuted] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [drafts, setDrafts] = useState(() => JSON.parse(localStorage.getItem("wdDrafts") || "[]"));
  const recognitionRef = useRef(null);
  const requestRef = useRef(0);
  const autoTimerRef = useRef(null);
  const calendarPollRef = useRef(null);
  const commitmentPollRef = useRef(null);
  const commitmentDataRef = useRef({ profile: null, emails: [], sentEmails: [] });
  const remindedMeetingsRef = useRef(new Set());
  const mountedRef = useRef(true);
  const [commitments, setCommitments] = useState([]);

  useEffect(() => () => {
    mountedRef.current = false;
    clearTimeout(autoTimerRef.current);
    clearInterval(calendarPollRef.current);
    clearInterval(commitmentPollRef.current);
    recognitionRef.current?.stop?.();
    window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    if (account && !instance.getActiveAccount()) instance.setActiveAccount(account);
  }, [account, instance]);

  useEffect(() => {
    if (!account) return;
    setSplash(true);
    const timer = setTimeout(() => setSplash(false), 1500);
    load();
    clearInterval(calendarPollRef.current);
    clearInterval(commitmentPollRef.current);
    refreshCalendar();
    calendarPollRef.current = setInterval(refreshCalendar, 30000);
    commitmentPollRef.current = setInterval(refreshCommitments, 300000);
    return () => {
      clearTimeout(timer);
      clearInterval(calendarPollRef.current);
      clearInterval(commitmentPollRef.current);
    };
  }, [account]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function token() {
    try {
      return (await instance.acquireTokenSilent({
        scopes: loginRequest.scopes,
        account: instance.getActiveAccount() || account
      })).accessToken;
    } catch {
      return (await instance.acquireTokenPopup({ scopes: loginRequest.scopes })).accessToken;
    }
  }

async function load() {
  try {
    const t = await token();
 
    const [p, m, sent, c] = await Promise.all([
      getProfile(t),
      getMail(t),
      getSentMail(t),
      getCalendar(t)
    ]);
 
    console.log("========== GRAPH DEBUG ==========");
    console.log("Inbox:", m?.value?.length);
    console.log("Sent:", sent?.value?.length);
    console.log("Calendar:", c?.value?.length);
    console.log("First sent mail:", sent?.value?.[0]);
    console.log("=================================");
 
    if (mountedRef.current) {
      commitmentDataRef.current = {
        profile: p,
        emails: m.value || [],
        sentEmails: sent.value || []
      };
      setD({
        p,
        m: m.value || [],
        sent: sent.value || [],
        c: c.value || []
      });
      refreshCommitments(commitmentDataRef.current);
      checkMeetingReminders(c.value || []);
    }
 
  } catch (e) {
    console.error("GRAPH LOAD ERROR:", e);
    setToast(`Graph data load failed: ${e.message}`);
  }
}

  async function refreshCommitments(data = commitmentDataRef.current) {
    try {
      const t = await token();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/commitments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sent: data.sentEmails,
          inbox: data.emails,
          employee: data.profile,
          now: new Date().toISOString()
        })
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.detail || "Commitment refresh failed");
      if (mountedRef.current) setCommitments(result.commitments || []);
    } catch (e) {
      console.warn("COMMITMENT REFRESH ERROR:", e);
    }
  }

  function checkMeetingReminders(events) {
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
      setToast(`Meeting starts in ${reminderStage} minutes: ${event.subject || "Upcoming meeting"}`);
    });
  }

  async function refreshCalendar() {
    try {
      const t = await token();
      const calendar = await getCalendar(t);
      const events = calendar.value || [];

      if (!mountedRef.current) return;

      setD(previous => ({ ...previous, c: events }));
      checkMeetingReminders(events);
    } catch (e) {
      console.warn("CALENDAR REFRESH ERROR:", e);
    }
  }
 
 

 const ctx = useMemo(() => ({
  profile: d.p,
 
  emails: d.m,
 
  sentEmails: d.sent,
 
  calendar: d.c,
 
  teams: teams.map(x => ({
    person: x[0],
    project: x[1],
    text: x[2],
    priority: x[3]
  })),
 
  tasks: tasks.map(x => ({
    title: x[0],
    project: x[1],
    due: x[2],
    priority: x[3],
    why: x[4]
  })),
 
  projects,
 
  workplace: {
    rooms,
    buses,
    news
  }
 
}), [d]);
 

  function saveMemory(question, answer) {
    const old = JSON.parse(localStorage.getItem("wdmem") || "[]");
    localStorage.setItem("wdmem", JSON.stringify([
      ...old,
      { q: question, a: answer, at: new Date().toISOString() }
    ].slice(-40)));
  }

  function setDynamicSuggestions(items) {
    const clean = Array.from(new Set((items || []).filter(Boolean).map(String))).slice(0, 6);
    setSuggestions(clean.length ? clean : BASE_SUGGESTIONS);
  }

  function buildNotifications() {
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

    const escalationTask = tasks.find((task, index) => index > 0 && /today|tomorrow/i.test(task[2]) && /critical|high/i.test(task[3]));
    if (escalationTask) {
      items.push({
        id: `deadline-${escalationTask[0]}`,
        group: "Deadlines & escalations",
        priority: escalationTask[3] === "critical" ? "critical" : "high",
        title: escalationTask[0],
        message: `Deadline ${escalationTask[2]}. ${escalationTask[4]}`,
        time: escalationTask[2],
        read: false,
        target: "home",
        aiPrompt: `What should I do about the deadline for ${escalationTask[0]}?`
      });
    }

    const upcomingMeetings = (d.c || [])
      .filter(event => (
        !event.isCancelled &&
        !event.isAllDay &&
        event.start?.dateTime &&
        eventDate(event.start)?.getTime() >= Date.now()
      ))
      .sort((first, second) => (
        eventDate(first.start).getTime() - eventDate(second.start).getTime()
      ));

    upcomingMeetings.slice(0, 3).forEach(meeting => {
      const start = eventDate(meeting.start);
      const minutesUntilStart = Math.max(1, Math.ceil((start.getTime() - Date.now()) / 60000));

      items.push({
        id: `meeting-${meeting.id || `${meeting.subject}-${meeting.start.dateTime}`}`,
        group: "Meeting reminders",
        priority: minutesUntilStart <= 20 ? "critical" : "high",
        title: meeting.subject || "Upcoming meeting",
        message: `${meeting.subject || "Meeting"} starts in ${minutesUntilStart} minutes. Review the agenda and relevant context before joining.`,
        time: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: false,
        target: "calendar",
        aiPrompt: `Prepare me for my next meeting: ${meeting.subject || "upcoming meeting"}.`
      });
    });

    const staleUnread = (d.m || []).find(mail => {
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
        message: `${staleUnread.subject || "An inbox message"} has been unread for ${ageHours} hour${ageHours === 1 ? "" : "s"}.`,
        time: "Unread",
        read: false,
        target: "mail",
        aiPrompt: `Summarize this unread email and tell me whether I need to respond: ${staleUnread.subject || "latest unread email"}.`
      });
    }

    commitments
      .filter(commitment => ["overdue", "due_today", "due_soon"].includes(commitment.status))
      .slice(0, 3)
      .forEach(commitment => {
        const overdue = commitment.status === "overdue";
        items.push({
          id: `commitment-${commitment.id || commitment.title}`,
          group: "Deadlines & escalations",
          priority: overdue || commitment.priority === "high" ? "critical" : "high",
          title: commitment.title || commitment.action || "Commitment needs attention",
          message: overdue ? `${commitment.action || "This commitment"} is overdue.` : `${commitment.action || "This commitment"} is ${commitment.dueLabel || commitment.status.replace("_", " ")}.`,
          time: commitment.dueLabel || commitment.status.replace("_", " "),
          read: false,
          target: "commit",
          aiPrompt: `What is the next action for this commitment: ${commitment.action || commitment.title}?`
        });
      });

    if (d.m?.length) {
      const latestMail = d.m[0];
      items.push({
        id: `mail-${latestMail.id || "latest"}`,
        group: "Due today",
        priority: "medium",
        title: "Inbox action needed",
        message: `${latestMail.subject || "Latest email"} may need a response before the end of the day.`,
        time: "Quick follow-up",
        read: false,
        target: "mail",
        aiPrompt: `Draft a short and professional response for this email: ${latestMail.subject || "latest email"}.`
      });
    }

    return items.slice(0, 8);
  }

  useEffect(() => {
    setNotifications(buildNotifications());
  }, [d, commitments]);

  function markNotificationRead(id) {
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, read: true } : item));
  }

  function dismissNotification(id) {
    setNotifications(prev => prev.filter(item => item.id !== id));
  }

  function snoozeNotification(id) {
    markNotificationRead(id);
    setToast("Notification snoozed for 2 hours.");
  }

  function openNotification(item) {
    setNotificationsOpen(false);
    if (item?.target) setMod(item.target);
    if (item?.aiPrompt) {
      setQ(item.aiPrompt);
      ask(item.aiPrompt);
    }
  }

  function askAIForNotification(item) {
    setNotificationsOpen(false);
    if (item?.aiPrompt) {
      setMod("copilot");
      ask(item.aiPrompt);
    }
  }

  async function ask(text) {
    if (!text.trim()) return;
    const requestId = ++requestRef.current;
    stopRecognition();
    clearTimeout(autoTimerRef.current);
    setQ("");
    setMod("copilot");
    setMsgs(x => [...x, { r: "u", t: text }]);
    setState("thinking");
    try {
      const memory = JSON.parse(localStorage.getItem("wdmem") || "[]");
      const z = await ai({ query: text, context: ctx, memory });
      if (requestId !== requestRef.current) return;
      const answer = String(z.answer || "").trim();
      setMsgs(x => [...x, { r: "a", t: answer, actions: z.actions || [] }]);
      saveMemory(text, answer);
      setDynamicSuggestions(z.suggestions);
      speak(answer, true);
    } catch (e) {
      if (requestId !== requestRef.current) return;
      const answer = fallback(text, d, teams.length);
      setMsgs(x => [...x, { r: "a", t: answer, actions: [] }]);
      saveMemory(text, answer);
      setDynamicSuggestions(dynamicFallback(text));
      setToast(e.message);
      speak(answer, true);
    }
  }

  function speak(text, continueListening = false) {
    if (muted) {
      setState("idle");
      if (continueListening && autoListen) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = setTimeout(() => startListening(true), 2300);
      }
      return;
    }
    if (!window.speechSynthesis) {
      setState("idle");
      return;
    }
    clearTimeout(autoTimerRef.current);
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanSpeech(text));
    const voiceChoice = chooseVoice();
    if (voiceChoice) u.voice = voiceChoice;
    u.lang = "en-IN";
    u.rate = 0.94;
    u.pitch = 0.92;
    u.volume = 1;
    u.onstart = () => mountedRef.current && setState("speaking");
    u.onend = () => {
      if (!mountedRef.current) return;
      setState("idle");
      if (continueListening && autoListen) {
        autoTimerRef.current = setTimeout(() => startListening(true), 2300);
      }
    };
    u.onerror = () => {
      if (mountedRef.current) setState("idle");
    };
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    requestRef.current += 1;
    window.speechSynthesis?.cancel();
    setState("idle");
  }

  function stopRecognition() {
    clearTimeout(autoTimerRef.current);
    try { recognitionRef.current?.stop?.(); } catch {}
    recognitionRef.current = null;
    if (state === "listening") setState("idle");
  }

  function startListening(isAuto = false) {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) {
      setToast("Speech recognition is not supported in this browser. Use Chrome or Edge.");
      return;
    }
    if (state === "speaking") stopSpeaking();
    stopRecognition();
    const r = new R();
    r.lang = "en-IN";
    r.interimResults = true;
    r.continuous = false;
    r.onstart = () => mountedRef.current && setState("listening");
    r.onresult = e => {
      const finalText = Array.from(e.results).map(v => v[0].transcript).join(" ").trim();
      if (!finalText) return;
      if (/^(stop|stop listening|cancel|quiet)$/i.test(finalText)) {
        stopRecognition();
        setState("idle");
        return;
      }
      if (e.results[e.results.length - 1].isFinal) ask(finalText);
    };
    r.onerror = e => {
      if (mountedRef.current && e.error !== "aborted" && e.error !== "no-speech") setToast(`Voice input: ${e.error}`);
      if (mountedRef.current) setState("idle");
    };
    r.onend = () => {
      recognitionRef.current = null;
      if (mountedRef.current && state === "listening") setState("idle");
    };
    recognitionRef.current = r;
    try { r.start(); } catch { setState("idle"); }
    if (!isAuto) setAutoListen(true);
  }

  function toggleVoice() {
    if (state === "speaking") return stopSpeaking();
    if (state === "listening") return stopRecognition();
    startListening(false);
  }

  async function login() { await instance.loginPopup(loginRequest); }
  async function logout() {
    stopSpeaking();
    stopRecognition();
    await instance.logoutPopup();
  }

  async function doSend(x) {
    try {
      const t = await token();
      await sendMail(t, x);
      setModal(null);
      setToast(`Email sent successfully to ${x.to}`);
      load();
    } catch (e) { setToast(`Send failed: ${e.message}`); }
  }

  async function doDraft(x) {
    try {
      const t = await token();
      const saved = await createDraft(t, x);
      setDrafts(prev => {
        const next = [{ ...x, id: saved.id, savedAt: new Date().toISOString() }, ...prev].slice(0, 20);
        localStorage.setItem("wdDrafts", JSON.stringify(next));
        return next;
      });
      setModal(null);
      setToast("Draft saved to Outlook Drafts.");
    } catch (e) { setToast(`Draft save failed: ${e.message}`); }
  }

  async function doCalendarImportant(event, important) {
  try {
    const t = await token();
 
    await updateCalendarImportance(
      t,
      event.id,
      important
    );
 
    setToast(
      important
        ? `"${event.subject || "Meeting"}" marked important.`
        : `"${event.subject || "Meeting"}" removed from important.`
    );
 
    load();
 
  } catch (e) {
 
    setToast(
      `Calendar update failed: ${e.message}`
    );
  }
}

function openMeetingMail(event) {
 
  const organizer =
    event.organizer?.emailAddress?.address || "";
 
  const organizerName =
    event.organizer?.emailAddress?.name ||
    "there";
 
  setModal({
    mode: "meeting",
    to: organizer,
    cc: "",
    subject: `Regarding: ${event.subject || "Meeting"}`,
    body:
      `Hi ${organizerName},\n\n` +
      `I wanted to follow up regarding "${event.subject || "the meeting"}".\n\n` +
      `Regards,\n${d.p?.displayName || "Employee"}`,
    sourceMeeting: event
  });
}
 

  async function doRead(mail) {
    try { await markRead(await token(), mail.id); setToast("Email marked as read."); load(); }
    catch (e) { setToast(`Read status update failed: ${e.message}`); }
  }

  async function doFlag(mail) {
    try { await flagMail(await token(), mail.id); setToast("Mail flagged for follow-up."); load(); }
    catch (e) { setToast(`Flag failed: ${e.message}`); }
  }

  async function doImportant(mail) {
    try { await markImportant(await token(), mail.id); setToast("Mail marked important."); load(); }
    catch (e) { setToast(`Important action failed: ${e.message}`); }
  }

  function openReply(mail) {
    const sender = mail.from?.emailAddress?.address || "";
    setModal({
      mode: "reply",
      to: sender,
      cc: "",
      subject: `Re: ${mail.subject || ""}`,
      body: `Hi ${mail.from?.emailAddress?.name || "there"},\n\nThanks for the update. I’ll review this and get back to you shortly.\n\nRegards,\n${d.p?.displayName || "Employee"}`,
      sourceMail: mail
    });
  }

  if (!account) return <Login onLogin={login} />;
  if (splash) return <Splash p={d.p} account={account} />;

  const voiceLabel =
    state === "listening"
      ? "Listening"
      : state === "speaking"
      ? "AI speaking"
      : state === "thinking"
      ? "Thinking"
      : "Ready";

  return (
    <div className="app">
      <Header
        d={d}
        account={account}
        state={state}
        voiceLabel={voiceLabel}
        toggleVoice={toggleVoice}
        stopSpeaking={stopSpeaking}
        stopRecognition={stopRecognition}
        muted={muted}
        setMuted={setMuted}
        autoListen={autoListen}
        setAutoListen={setAutoListen}
        setProfileOpen={setProfileOpen}
        notificationCount={notifications.filter(item => !item.read).length}
        onToggleNotifications={() => setNotificationsOpen(v => !v)}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
      />

      <NotificationCenter
        notifications={notifications}
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onMarkRead={markNotificationRead}
        onDismiss={dismissNotification}
        onSnooze={snoozeNotification}
        onOpen={openNotification}
        onAskAI={askAIForNotification}
      />

      <div className={`layout ${sidebarOpen ? "" : "sidebarCollapsed"}`}>
        <Sidebar
          mod={mod}
          setMod={setMod}
          mailCount={d.m.length}
          calendarCount={d.c.length}
          logout={logout}
        />

        <main>
          {toast && (
            <div className="toast">
              <span>✦</span>
              {toast}
              <button onClick={() => setToast("")}>×</button>
            </div>
          )}
          {mod === "home" && (
            <Home
              p={d.p}
              m={d.m}
              c={d.c}
              ask={ask}
              set={setMod}
              suggestions={suggestions}
            />
          )}
          {mod === "copilot" && (
            <Copilot
              msgs={msgs}
              q={q}
              setQ={setQ}
              ask={ask}
              state={state}
              voice={toggleVoice}
              stop={() => {
                stopSpeaking();
                stopRecognition();
              }}
              modal={setModal}
              suggestions={suggestions}
              autoListen={autoListen}
              muted={muted}
              setMuted={setMuted}
            />
          )}
          {mod === "mail" && (
            <Mail
              m={d.m}
              sent={d.sent}
              ask={ask}
              reply={openReply}
              flag={doFlag}
              important={doImportant}
              markRead={doRead}
              projects={projects}
            />
          )}
          {mod === "calendar" && (
  <Calendar
    c={d.c}
    ask={ask}
    onMailOrganizer={openMeetingMail}
    onJoinMeeting={(event) => {
      const url =
        event.onlineMeeting?.joinUrl ||
        event.onlineMeeting?.joinWebUrl ||
        event.webLink;
 
      if (url) {
        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      } else {
        setToast(
          "No online meeting link is available for this event."
        );
      }
    }}
    onImportant={doCalendarImportant}
  />
)}
 
          {mod === "commit" && (
  <Commit
    ask={ask}
    sent={d.sent}
    inbox={d.m}
    profile={d.p}
    createDraft={doDraft}
  />
)}
          {mod === "projects" && <Projects />}
          {mod === "waiting" && <Waiting ask={ask} />}
          {mod === "workplace" && <Workplace />}
          {mod === "rooms" && <Rooms />}
        </main>

        <Right set={setMod} />
      </div>

      {modal && (
        <Modal
          x={modal}
          close={() => setModal(null)}
          send={doSend}
          draft={doDraft}
        />
      )}
      {profileOpen && (
        <ProfileCard
          p={d.p}
          close={() => setProfileOpen(false)}
          logout={logout}
        />
      )}
    </div>
  );
}

export default App;
