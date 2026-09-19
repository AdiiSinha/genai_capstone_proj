import React, { useState, useMemo } from "react";
import { Title } from "../common/Title";
import { eventDate, formatEventTime } from "../../calendarDate";

/* ─── FLOOR DATA ─────────────────────────────────────────────────── */
const FLOOR_ROOMS = [
  // ── Meeting Rooms ──────────────────────────────────────────
  { id: "orion1",     label: "Orion 1",     type: "meeting",   floor:"4F", cap:8,  x:40,  y:55,  w:145, h:95,  amenities:["4K Display","Video Conf","Whiteboard"],               color:"#1a3a5c" },
  { id: "orion2",     label: "Orion 2",     type: "meeting",   floor:"4F", cap:12, x:205, y:55,  w:160, h:95,  amenities:["Dual Screen VC","Polycom Audio","Whiteboard","Catering"], color:"#1a3a5c" },
  { id: "andromeda",  label: "Andromeda",   type: "meeting",   floor:"4F", cap:16, x:385, y:55,  w:165, h:95,  amenities:["Interactive Board","Dual VC","Executive Seating"],      color:"#1a3a5c" },
  { id: "nebula",     label: "Nebula",      type: "meeting",   floor:"4F", cap:6,  x:570, y:55,  w:130, h:95,  amenities:["Display","Whiteboard"],                                 color:"#1a3a5c" },
  // ── Shared Spaces ──────────────────────────────────────────
  { id: "cafeteria",  label: "Cafeteria",   type: "cafeteria", floor:"4F", cap:80, x:40,  y:185, w:200, h:100, amenities:["Seating","Coffee","Microwave","Vending"],               color:"#1a2e1a" },
  { id: "lounge",     label: "Open Lounge", type: "lounge",    floor:"4F", cap:20, x:260, y:185, w:150, h:100, amenities:["Soft Seating","TV","Phone Booths"],                     color:"#1e1a35" },
  { id: "ithelp",     label: "IT Help",     type: "facility",  floor:"4F", cap:4,  x:430, y:185, w:110, h:100, amenities:["Tech Support","Loaner Devices"],                        color:"#2d1e10" },
  { id: "reception",  label: "Reception",   type: "facility",  floor:"4F", cap:0,  x:560, y:185, w:140, h:100, amenities:["Visitor Badge","Concierge"],                            color:"#2d1e10" },
  // ── 5F Rooms ───────────────────────────────────────────────
  { id: "sirius",     label: "Sirius",      type: "meeting",   floor:"5F", cap:6,  x:40,  y:55,  w:145, h:95,  amenities:["4K Display","Wireless Presenter"],                      color:"#1a3a5c" },
  { id: "polaris",    label: "Polaris",     type: "meeting",   floor:"5F", cap:10, x:205, y:55,  w:160, h:95,  amenities:["Dual VC","Whiteboard","Conference Phone"],              color:"#1a3a5c" },
  { id: "vega",       label: "Vega",        type: "meeting",   floor:"5F", cap:8,  x:385, y:55,  w:165, h:95,  amenities:["Smart Display","Conference Audio"],                     color:"#1a3a5c" },
  { id: "altair",     label: "Altair",      type: "meeting",   floor:"5F", cap:20, x:570, y:55,  w:130, h:95,  amenities:["Projector","Stage Mic","Full VC"],                      color:"#1a3a5c" },
  { id: "gym",        label: "Wellness",    type: "facility",  floor:"5F", cap:15, x:40,  y:185, w:200, h:100, amenities:["Gym Equipment","Yoga Mat","Shower"],                    color:"#2d1e10" },
  { id: "library",    label: "Library",     type: "lounge",    floor:"5F", cap:10, x:260, y:185, w:150, h:100, amenities:["Books","Quiet Zone","Study Pods"],                      color:"#1e1a35" },
  { id: "server",     label: "Server Room", type: "facility",  floor:"5F", cap:0,  x:430, y:185, w:110, h:100, amenities:["Restricted","Climate Controlled"],                     color:"#2d1010" },
  { id: "conf5f",     label: "Exec Suite",  type: "meeting",   floor:"5F", cap:24, x:560, y:185, w:140, h:100, amenities:["Boardroom","Executive VC","Bar"],                       color:"#1a3a5c" },
];

/* ─── BOOKING DATA ──────────────────────────────────────────────── */
// Slots are on a 8:00–20:00 timeline in 30-min increments
const HOURS = [8,9,10,11,12,13,14,15,16,17,18,19,20];

const initialBookings = {
  orion1:    [{ from:"09:00", to:"10:30", title:"Phoenix Sprint Review", who:"Rahul Mehta" },
               { from:"14:00", to:"15:00", title:"Infra Planning",        who:"Priya Sharma" }],
  orion2:    [{ from:"11:00", to:"12:30", title:"Atlas Architecture Review", who:"Vikram Rao" },
               { from:"13:30", to:"15:15", title:"Client Demo Prep",     who:"Neha Kapoor" }],
  andromeda: [{ from:"09:30", to:"11:00", title:"Leadership All-Hands",  who:"Director's Office" }],
  nebula:    [{ from:"15:00", to:"16:00", title:"1:1 Check-in",          who:"Ananya Singh" }],
  sirius:    [{ from:"10:00", to:"11:00", title:"Nova UX Review",        who:"UX Team" }],
  polaris:   [{ from:"08:30", to:"10:00", title:"Executive Leadership Sync", who:"Neha Kapoor" },
               { from:"13:00", to:"14:30", title:"Budget Review",         who:"Finance Team" }],
  vega:      [{ from:"14:30", to:"16:30", title:"Security Audit",        who:"Security Team" }],
  conf5f:    [{ from:"09:00", to:"12:00", title:"Board Meeting",         who:"C-Suite" }],
};

/* ─── UTILS ─────────────────────────────────────────────────────── */
const toMin = t => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const fmtTime = m => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;

function slotBusy(bookings, from, to) {
  const f = toMin(from), t = toMin(to);
  return (bookings||[]).some(b => toMin(b.from) < t && toMin(b.to) > f);
}

function pctLeft(time)  { return ((toMin(time) - 8*60) / (12*60)) * 100; }
function pctWidth(f, t) { return ((toMin(t) - toMin(f)) / (12*60)) * 100; }

const TYPE_COLOR = {
  meeting:  { bg:"rgba(34,160,255,0.12)", border:"rgba(34,160,255,0.35)", icon:"🏢", label:"Meeting Room" },
  cafeteria:{ bg:"rgba(80,210,120,0.12)", border:"rgba(80,210,120,0.35)", icon:"☕", label:"Cafeteria" },
  lounge:   { bg:"rgba(140,100,255,0.12)",border:"rgba(140,100,255,0.35)",icon:"🛋",  label:"Lounge" },
  facility: { bg:"rgba(255,160,60,0.12)", border:"rgba(255,160,60,0.35)", icon:"🔧", label:"Facility" },
};

/* ─── SUB-COMPONENTS ────────────────────────────────────────────── */
function FloorMap({ rooms, selected, onSelect }) {
  return (
    <div className="rmFloorWrap">
      <svg viewBox="0 0 740 310" className="rmFloorSvg">
        {/* Corridor */}
        <rect x="20" y="165" width="700" height="12" rx="3" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
        <text x="360" y="174" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)" fontFamily="inherit">MAIN CORRIDOR</text>

        {rooms.map(r => {
          const tc   = TYPE_COLOR[r.type] || TYPE_COLOR.facility;
          const isSel = selected?.id === r.id;
          const busy  = (initialBookings[r.id]||[]).length > 0 && r.type === "meeting";
          const hasBook = (initialBookings[r.id]||[]).length;
          const statusCol = r.type !== "meeting" ? "#b8d0e8" : busy ? "#ffaa55" : "#55e88a";

          return (
            <g key={r.id} onClick={() => r.type === "meeting" ? onSelect(r) : null}
               style={{ cursor: r.type === "meeting" ? "pointer" : "default" }}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="8"
                fill={isSel ? "rgba(34,160,255,0.22)" : tc.bg}
                stroke={isSel ? "rgba(34,160,255,0.9)" : tc.border}
                strokeWidth={isSel ? "2" : "1.2"}
                style={{ transition:"all 0.2s" }}
              />
              {/* Status dot */}
              {r.type === "meeting" && (
                <circle cx={r.x + r.w - 14} cy={r.y + 14} r="5"
                  fill={busy ? "#ff8844" : "#44dd88"}
                  filter={`drop-shadow(0 0 4px ${busy ? "#ff8844" : "#44dd88"})`}
                />
              )}
              {/* Icon */}
              <text x={r.x + r.w/2} y={r.y + 30} textAnchor="middle" fontSize="16">{tc.icon}</text>
              {/* Name */}
              <text x={r.x + r.w/2} y={r.y + 53} textAnchor="middle" fontSize="10" fontWeight="600"
                fill={isSel ? "#8fdfff" : "#cce4f5"} fontFamily="inherit">{r.label}</text>
              {/* Cap */}
              {r.cap > 0 && (
                <text x={r.x + r.w/2} y={r.y + 68} textAnchor="middle" fontSize="8" fill="rgba(180,210,230,0.6)" fontFamily="inherit">
                  👥 {r.cap}
                </text>
              )}
              {/* Availability */}
              {r.type === "meeting" && (
                <text x={r.x + r.w/2} y={r.y + 83} textAnchor="middle" fontSize="8" fill={statusCol} fontFamily="inherit">
                  {busy ? `${hasBook} booking${hasBook>1?"s":""}` : "Available"}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="rmLegend">
        {Object.entries(TYPE_COLOR).map(([k,v]) => (
          <span key={k} className="rmLegendItem">
            <span style={{ background: v.bg, border: `1px solid ${v.border}` }} className="rmLegendDot"/>{v.label}
          </span>
        ))}
        <span className="rmLegendItem"><span className="rmLegendDot" style={{ background:"#44dd88" }} />Free</span>
        <span className="rmLegendItem"><span className="rmLegendDot" style={{ background:"#ff8844" }} />Booked</span>
      </div>
    </div>
  );
}

function TimelineBar({ bookings = [] }) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowPct = Math.min(100, Math.max(0, ((nowMin - 8*60) / (12*60)) * 100));

  return (
    <div className="rmTimeline">
      {/* Hour Labels */}
      <div className="rmTimelineLabels">
        {HOURS.map(h => (
          <span key={h} style={{ left:`${((h-8)/12)*100}%` }}>{h}:00</span>
        ))}
      </div>
      {/* Track */}
      <div className="rmTimelineTrack">
        {/* Free background */}
        <div className="rmTimelineFree" />
        {/* Bookings */}
        {bookings.map((b, idx) => (
          <div key={idx} className="rmTimelineBlock"
            style={{ left:`${pctLeft(b.from)}%`, width:`${pctWidth(b.from, b.to)}%` }}>
            <span className="rmTimelineBlockTitle">{b.from}–{b.to} · {b.title}</span>
          </div>
        ))}
        {/* Now line */}
        {nowMin >= 8*60 && nowMin <= 20*60 && (
          <div className="rmNowLine" style={{ left:`${nowPct}%` }}>
            <div className="rmNowDot" />
          </div>
        )}
      </div>
    </div>
  );
}

function BookingModal({ room, bookings, onClose, onBook }) {
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("09:00");
  const [to,   setTo]   = useState("10:00");
  const [who,  setWho]  = useState("");
  const [err,  setErr]  = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (toMin(from) >= toMin(to)) { setErr("End time must be after start time."); return; }
    if (slotBusy(bookings, from, to)) { setErr("This slot overlaps an existing booking. Choose another time."); return; }
    onBook({ from, to, title, who });
  }

  const timeOpts = [];
  for (let m = 8*60; m <= 20*60; m += 30) timeOpts.push(fmtTime(m));

  return (
    <div className="rmModalOverlay" onClick={onClose}>
      <div className="rmModal" onClick={e => e.stopPropagation()}>
        <button className="rmModalClose" onClick={onClose}>×</button>
        <div className="rmModalHeader">
          <div className="rmModalIcon">🏢</div>
          <div>
            <small>BOOK MEETING ROOM</small>
            <h2>{room.label}</h2>
            <p>Floor {room.floor} · 👥 {room.cap} seats · {room.amenities.join(" · ")}</p>
          </div>
        </div>

        {/* Amenities chips */}
        <div className="rmAmenities">
          {room.amenities.map((a,i) => <span key={i} className="rmAmenityChip">{a}</span>)}
        </div>

        {/* Timeline preview */}
        <div className="rmModalSection">
          <label>Today's Schedule</label>
          <TimelineBar bookings={bookings} />
        </div>

        <form onSubmit={handleSubmit} className="rmBookForm">
          <div className="rmFormRow">
            <label>
              Meeting Title
              <input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Sprint Retrospective" />
            </label>
            <label>
              Organizer
              <input required value={who} onChange={e=>setWho(e.target.value)} placeholder="Your name" />
            </label>
          </div>
          <div className="rmFormRow">
            <label>
              From
              <select value={from} onChange={e=>setFrom(e.target.value)}>
                {timeOpts.map(t=><option key={t}>{t}</option>)}
              </select>
            </label>
            <label>
              To
              <select value={to} onChange={e=>setTo(e.target.value)}>
                {timeOpts.map(t=><option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          {err && <div className="rmFormErr">⚠ {err}</div>}
          <div className="rmFormActions">
            <button type="button" className="rmBtnGhost" onClick={onClose}>Cancel</button>
            <button type="submit" className="rmBtnPrimary">✦ Confirm Booking</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoomDetailPanel({ room, bookings, onBook, onClose, onViewSchedule }) {
  return (
    <div className="rmDetailPanel">
      <button className="rmDetailClose" onClick={onClose} title="Close room panel">×</button>
      <div className="rmDetailHeader">
        <div className="rmDetailIcon">🏢</div>
        <div>
          <span className="rmDetailFloor">FLOOR {room.floor}</span>
          <h3>{room.label}</h3>
          <span className="rmDetailCap">👥 {room.cap} seats</span>
        </div>
        <div className={`rmDetailStatus ${(bookings||[]).length ? "busy" : "free"}`}>
          {(bookings||[]).length ? `${bookings.length} booked` : "All Day Free"}
        </div>
      </div>

      <div className="rmAmenities" style={{ marginBottom: 14 }}>
        {room.amenities.map((a,i) => <span key={i} className="rmAmenityChip">{a}</span>)}
      </div>

      <div className="rmDetailSection">
        <div className="rmDetailSectionLabel">Today's Schedule</div>
        <TimelineBar bookings={bookings} />
      </div>

      <div className="rmDetailSection">
        <div className="rmDetailSectionLabel">Existing Bookings</div>
        {(bookings||[]).length === 0 ? (
          <div className="rmNoBookings">No bookings today — room is fully available.</div>
        ) : (
          <div className="rmBookingList">
            {(bookings||[]).map((b,i) => (
              <div key={i} className="rmBookingItem">
                <div className="rmBookingTime">{b.from} – {b.to}</div>
                <div className="rmBookingMeta">
                  <strong>{b.title}</strong>
                  <small>Organizer: {b.who}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        <button className="rmBtnPrimary" style={{ width:"100%" }} onClick={onBook}>
          + Book This Room
        </button>
        {onViewSchedule && (
          <button className="rmBtnGhost" style={{ width:"100%", fontSize:10 }} onClick={onViewSchedule}>
            📅 Check My Schedule vs This Room
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── DATE HELPERS & DEMO DATA ──────────────────────────────────── */
function parseEventDate(point) {
  if (!point) return null;
  if (point instanceof Date) return point;
  if (typeof point === "object" && point.dateTime) {
    const d = eventDate(point);
    if (d) return d;
  }
  if (typeof point === "string") {
    const d = new Date(point);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function getSampleMeetings() {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  const curH = today.getHours();

  const pastStart = new Date(y, m, d, Math.max(8, curH - 2), 0);
  const pastEnd   = new Date(y, m, d, Math.max(8, curH - 2), 45);

  const onStart = new Date(y, m, d, curH, 0);
  const onEnd   = new Date(y, m, d, curH, 50);

  const up1Start = new Date(y, m, d, curH + 1, 30);
  const up1End   = new Date(y, m, d, curH + 2, 15);

  const up2Start = new Date(y, m, d, curH + 3, 0);
  const up2End   = new Date(y, m, d, curH + 4, 0);

  return [
    {
      id: "sample-past",
      subject: "Daily Engineering Sync & Standup",
      start: { dateTime: pastStart.toISOString() },
      end:   { dateTime: pastEnd.toISOString() },
      location: { displayName: "Meeting Room 401 · Falcon" },
      organizer: { emailAddress: { name: "Aditya S." } },
      attendees: [1,2,3,4,5],
      isSample: true
    },
    {
      id: "sample-ongoing",
      subject: "AI Agent Architecture Deep-Dive",
      start: { dateTime: onStart.toISOString() },
      end:   { dateTime: onEnd.toISOString() },
      location: { displayName: "Boardroom 501 · Olympus" },
      organizer: { emailAddress: { name: "Sarah Lin" } },
      attendees: [1,2,3],
      onlineMeeting: { joinUrl: "https://teams.microsoft.com" },
      isSample: true
    },
    {
      id: "sample-up1",
      subject: "Workday Capstone Project Review",
      start: { dateTime: up1Start.toISOString() },
      end:   { dateTime: up1End.toISOString() },
      location: { displayName: "Innovation Lab 404" },
      organizer: { emailAddress: { name: "Priya Sharma" } },
      attendees: [1,2,3,4],
      onlineMeeting: { joinUrl: "https://teams.microsoft.com" },
      isSample: true
    },
    {
      id: "sample-up2",
      subject: "Design System & UI Component Alignment",
      start: { dateTime: up2Start.toISOString() },
      end:   { dateTime: up2End.toISOString() },
      location: { displayName: "Discussion Room 403 · Hawk" },
      organizer: { emailAddress: { name: "Elena Rostova" } },
      attendees: [1,2],
      isSample: true
    }
  ];
}

/* ─── MY MEETINGS PANEL ─────────────────────────────────────────── */
function MyMeetingsPanel({ events = [], selectedRoom = null, onBackToRoom = null }) {
  const now = new Date();

  const isLive = Boolean(events && events.length > 0);
  const effectiveEvents = useMemo(() => {
    return isLive ? events : getSampleMeetings();
  }, [isLive, events]);

  const classified = useMemo(() => {
    const ongoing = [], upcoming = [], past = [];
    effectiveEvents.forEach(ev => {
      if (ev.isCancelled || ev.isAllDay) return;
      const start = parseEventDate(ev.start);
      const end   = parseEventDate(ev.end);
      if (!start) return;
      if (end && now > end)   past.push(ev);
      else if (start <= now)  ongoing.push(ev);
      else                    upcoming.push(ev);
    });
    // sort upcoming ASC, past DESC
    upcoming.sort((a,b) => parseEventDate(a.start) - parseEventDate(b.start));
    past.sort((a,b) => parseEventDate(b.start) - parseEventDate(a.start));
    return { ongoing, upcoming: upcoming.slice(0,8), past: past.slice(0,5) };
  }, [effectiveEvents, now]);

  function MeetingItem({ ev, badge, badgeClass }) {
    const start = parseEventDate(ev.start);
    const end   = parseEventDate(ev.end);
    const timeStr = start ? start.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '--';
    const endStr  = end   ? end.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '';
    const loc = ev.location?.displayName || ev.onlineMeeting?.joinUrl ? 'Online / Remote' : 'No location';
    const joinUrl = ev.onlineMeeting?.joinUrl || ev.onlineMeeting?.joinWebUrl || ev.webLink;

    return (
      <div className="rmMtgItem">
        <div className="rmMtgTime">
          <span>{timeStr}</span>
          {endStr && <small>→ {endStr}</small>}
        </div>
        <div className="rmMtgBody">
          <div className="rmMtgTitleRow">
            <strong>{ev.subject || 'Untitled'}</strong>
            <span className={`rmMtgBadge ${badgeClass}`}>{badge}</span>
          </div>
          <div className="rmMtgMeta">
            <span>📍 {loc}</span>
            {ev.organizer?.emailAddress?.name && (
              <span>👤 {ev.organizer.emailAddress.name}</span>
            )}
            {ev.attendees?.length > 0 && (
              <span>👥 {ev.attendees.length}</span>
            )}
          </div>
          {joinUrl && badgeClass !== 'past' && (
            <a className="rmMtgJoin" href={joinUrl} target="_blank" rel="noreferrer">Join Teams ↗</a>
          )}
        </div>
      </div>
    );
  }

  const hasAny = classified.ongoing.length + classified.upcoming.length + classified.past.length > 0;

  return (
    <div className="rmMeetingsPanel">
      <div className="rmMeetingsPanelHeader">
        <div>
          <span>📅 My Meetings</span>
          <div style={{ fontSize: 9, color: isLive ? "#55e88a" : "#7a9ab2", marginTop: 2 }}>
            {isLive ? "● Synced with Outlook" : "✦ Today's Schedule"}
          </div>
        </div>
        {selectedRoom && onBackToRoom && (
          <button className="rmBtnGhost" style={{ padding: "4px 8px", fontSize: 10 }} onClick={onBackToRoom}>
            ← Back to Room
          </button>
        )}
      </div>

      {!hasAny && (
        <div className="rmMtgEmpty">
          <div>📭</div>
          <p>No meetings scheduled for today.</p>
        </div>
      )}

      {classified.ongoing.length > 0 && (
        <div className="rmMtgSection">
          <div className="rmMtgSectionLabel ongoing">● HAPPENING NOW</div>
          {classified.ongoing.map((ev,i) => (
            <MeetingItem key={i} ev={ev} badge="Now" badgeClass="ongoing" />
          ))}
        </div>
      )}

      {classified.upcoming.length > 0 && (
        <div className="rmMtgSection">
          <div className="rmMtgSectionLabel upcoming">⬆ UPCOMING</div>
          {classified.upcoming.map((ev,i) => (
            <MeetingItem key={i} ev={ev} badge="Upcoming" badgeClass="upcoming" />
          ))}
        </div>
      )}

      {classified.past.length > 0 && (
        <div className="rmMtgSection">
          <div className="rmMtgSectionLabel past">✓ COMPLETED TODAY</div>
          {classified.past.map((ev,i) => (
            <MeetingItem key={i} ev={ev} badge="Past" badgeClass="past" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── MAIN EXPORT ───────────────────────────────────────────────── */
export function Rooms({ c = [], profile = null, ask = null }) {
  const [activeFloor, setActiveFloor] = useState("4F");
  const [selected,    setSelected]    = useState(null);
  const [rightTab,    setRightTab]    = useState("room"); // "room" | "meetings"
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookings,    setBookings]    = useState(initialBookings);
  const [toast,       setToast]       = useState("");

  const floorRooms = useMemo(() => FLOOR_ROOMS.filter(r => r.floor === activeFloor), [activeFloor]);

  function handleBook(newBooking) {
    setBookings(prev => ({
      ...prev,
      [selected.id]: [...(prev[selected.id] || []), newBooking]
    }));
    setBookingOpen(false);
    setToast(`✦ "${newBooking.title}" booked in ${selected.label} · ${newBooking.from}–${newBooking.to}`);
    setTimeout(() => setToast(""), 4000);
  }

  const stats = useMemo(() => {
    const meetingRooms = floorRooms.filter(r => r.type === "meeting");
    const free    = meetingRooms.filter(r => !(bookings[r.id]||[]).length);
    const occupied = meetingRooms.length - free.length;
    return { total: meetingRooms.length, free: free.length, occupied };
  }, [floorRooms, bookings]);

  return (
    <div className="rmModule">
      <style>{CSS}</style>

      {/* Header */}
      <div className="rmHeader">
        <div>
          <Title k="WORKPLACE INTELLIGENCE" t="Meeting Rooms & Floor Blueprint" />
          <p className="rmSubtitle">
            Interactive floor map of Capgemini DTP Campus · Real-time availability · 1-click booking
          </p>
        </div>
        <div className="rmFloorToggle">
          {["4F","5F"].map(f => (
            <button key={f} className={activeFloor===f?"rmFloorBtn on":"rmFloorBtn"}
              onClick={() => { setActiveFloor(f); setSelected(null); setRightTab("room"); }}>
              Floor {f}
            </button>
          ))}
        </div>
      </div>

      {/* KPI bar */}
      <div className="rmKpis">
        <div className="rmKpi cyan"><b>{stats.total}</b><span>Meeting Rooms</span></div>
        <div className="rmKpi green"><b>{stats.free}</b><span>Available Now</span></div>
        <div className="rmKpi amber"><b>{stats.occupied}</b><span>Currently Booked</span></div>
        <div className="rmKpi violet"><b>{FLOOR_ROOMS.filter(r=>r.floor===activeFloor && r.type!=="meeting").length}</b><span>Shared Spaces</span></div>
      </div>

      {/* Floor map + detail panel */}
      <div className="rmBody">
        <div className="rmMapCol">
          <div className="rmMapCard">
            <div className="rmMapLabel">
              <span>🗺 Floor {activeFloor} Blueprint — Capgemini DTP Campus</span>
              <small>Click any meeting room to inspect and book</small>
            </div>
            <FloorMap rooms={floorRooms} selected={selected} onSelect={r => { setSelected(r); setRightTab("room"); }} />
          </div>

          {/* Room cards grid */}
          <div className="rmCardsGrid">
            {floorRooms.filter(r => r.type === "meeting").map(r => {
              const bkgs = bookings[r.id] || [];
              const isFree = bkgs.length === 0;
              return (
                <div key={r.id}
                  className={`rmCard ${selected?.id===r.id?"rmCardSelected":""} ${isFree?"rmCardFree":"rmCardBusy"}`}
                  onClick={() => { setSelected(r); setRightTab("room"); }}>
                  <div className="rmCardTop">
                    <div>
                      <h4>{r.label}</h4>
                      <small>Floor {r.floor} · 👥 {r.cap} seats</small>
                    </div>
                    <div className={`rmStatPill ${isFree?"free":"busy"}`}>
                      {isFree ? "Free" : `${bkgs.length} booking${bkgs.length>1?"s":""}`}
                    </div>
                  </div>
                  <div className="rmCardAmenities">
                    {r.amenities.slice(0,3).map((a,i) => <span key={i}>{a}</span>)}
                  </div>
                  {/* Mini timeline */}
                  <div className="rmMiniTimeline">
                    <div className="rmMiniTrack">
                      {bkgs.map((b,i) => (
                        <div key={i} className="rmMiniBlock"
                          style={{ left:`${pctLeft(b.from)}%`, width:`${pctWidth(b.from,b.to)}%` }}
                          title={`${b.from}–${b.to}: ${b.title}`}
                        />
                      ))}
                    </div>
                    <div className="rmMiniLabels">
                      <span>8 AM</span><span>12 PM</span><span>4 PM</span><span>8 PM</span>
                    </div>
                  </div>
                  <button className={`rmCardBtn ${isFree?"rmCardBtnFree":""}`}
                    onClick={e => { e.stopPropagation(); setSelected(r); setRightTab("room"); setBookingOpen(true); }}>
                    {isFree ? "Book Now" : "View & Book"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side: persistent My Meetings, with Room Detail switcher when room selected */}
        <div className="rmRightCol">
          {selected && (
            <div className="rmRightTabs">
              <button
                className={`rmRightTabBtn ${rightTab === "room" ? "on" : ""}`}
                onClick={() => setRightTab("room")}
              >
                🏢 Room Info
              </button>
              <button
                className={`rmRightTabBtn ${rightTab === "meetings" ? "on" : ""}`}
                onClick={() => setRightTab("meetings")}
              >
                📅 My Schedule
              </button>
              <button
                className="rmRightTabClose"
                onClick={() => { setSelected(null); setRightTab("room"); }}
                title="Deselect room"
              >
                ✕
              </button>
            </div>
          )}

          {selected && rightTab === "room" ? (
            <RoomDetailPanel
              room={selected}
              bookings={bookings[selected.id] || []}
              onBook={() => setBookingOpen(true)}
              onClose={() => setSelected(null)}
              onViewSchedule={() => setRightTab("meetings")}
            />
          ) : (
            <MyMeetingsPanel
              events={c}
              selectedRoom={selected}
              onBackToRoom={selected ? () => setRightTab("room") : null}
            />
          )}
        </div>
      </div>

      {/* Booking modal */}
      {bookingOpen && selected && (
        <BookingModal
          room={selected}
          bookings={bookings[selected.id] || []}
          onClose={() => setBookingOpen(false)}
          onBook={handleBook}
        />
      )}

      {/* Toast */}
      {toast && <div className="rmToast">{toast}</div>}
    </div>
  );
}

export default Rooms;

/* ─── CSS ────────────────────────────────────────────────────────── */
const CSS = `
.rmModule { position:relative; }
.rmHeader { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
.rmSubtitle { margin:3px 0 0; color:#7a9ab2; font-size:11px; }
.rmFloorToggle { display:flex; gap:6px; align-items:center; }
.rmFloorBtn { padding:9px 18px; border:1px solid rgba(100,180,220,0.2); background:rgba(255,255,255,0.03); color:#7fa8c2; border-radius:8px; cursor:pointer; font-size:12px; transition:.2s; }
.rmFloorBtn.on,.rmFloorBtn:hover { background:rgba(34,160,255,0.12); border-color:rgba(34,160,255,0.5); color:#a8e0ff; }

.rmKpis { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
.rmKpi { display:flex; flex-direction:column; align-items:center; gap:3px; padding:14px 10px; border-radius:12px; border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.025); }
.rmKpi b { font-size:26px; font-weight:700; }
.rmKpi span { font-size:10px; color:#7a9ab2; }
.rmKpi.cyan b { color:#5bdcff; } .rmKpi.green b { color:#55e88a; } .rmKpi.amber b { color:#ffaa55; } .rmKpi.violet b { color:#c4a0ff; }

.rmBody { display:grid; grid-template-columns:1fr 320px; gap:14px; align-items:start; }
.rmMapCol { display:flex; flex-direction:column; gap:14px; min-width:0; }
.rmMapCard { border:1px solid rgba(100,180,220,0.12); border-radius:14px; background:rgba(10,22,38,0.7); overflow:hidden; }
.rmMapLabel { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid rgba(100,180,220,0.08); }
.rmMapLabel span { font-size:12px; color:#9abcd4; font-weight:600; }
.rmMapLabel small { font-size:10px; color:#556880; }
.rmFloorWrap { padding:12px; }
.rmFloorSvg { width:100%; height:auto; display:block; }

.rmLegend { display:flex; flex-wrap:wrap; gap:10px; padding:8px 12px 12px; }
.rmLegendItem { display:flex; align-items:center; gap:5px; font-size:9px; color:#7a9ab2; }
.rmLegendDot { width:10px; height:10px; border-radius:3px; display:inline-block; }

.rmCardsGrid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
.rmCard { border:1px solid rgba(100,180,220,0.12); border-radius:12px; padding:14px; background:rgba(10,22,38,0.6); cursor:pointer; transition:.2s; }
.rmCard:hover { border-color:rgba(34,160,255,0.3); transform:translateY(-2px); }
.rmCardSelected { border-color:rgba(34,160,255,0.6)!important; background:rgba(34,160,255,0.06)!important; }
.rmCardTop { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px; }
.rmCardTop h4 { margin:0 0 2px; font-size:13px; color:#cde8f8; }
.rmCardTop small { font-size:9px; color:#5a7a92; }
.rmStatPill { font-size:9px; padding:4px 8px; border-radius:999px; white-space:nowrap; }
.rmStatPill.free { background:rgba(85,232,138,0.1); color:#55e88a; border:1px solid rgba(85,232,138,0.2); }
.rmStatPill.busy { background:rgba(255,170,85,0.1); color:#ffaa55; border:1px solid rgba(255,170,85,0.2); }
.rmCardAmenities { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:10px; }
.rmCardAmenities span { font-size:8px; padding:3px 6px; border-radius:5px; background:rgba(255,255,255,0.04); color:#7a9ab2; border:1px solid rgba(255,255,255,0.05); }
.rmCardBtn { width:100%; padding:8px; border-radius:7px; border:1px solid rgba(100,180,220,0.2); background:rgba(255,255,255,0.03); color:#7a9ab2; cursor:pointer; font-size:10px; margin-top:8px; transition:.2s; }
.rmCardBtnFree { background:rgba(85,232,138,0.08); color:#55e88a; border-color:rgba(85,232,138,0.25); }
.rmCardBtn:hover { filter:brightness(1.2); }

/* Timeline */
.rmTimeline { margin:8px 0 0; }
.rmTimelineLabels { position:relative; height:16px; font-size:8px; color:#4a6275; }
.rmTimelineLabels span { position:absolute; transform:translateX(-50%); }
.rmTimelineTrack { position:relative; height:28px; border-radius:6px; background:rgba(85,232,138,0.07); border:1px solid rgba(85,232,138,0.12); overflow:hidden; }
.rmTimelineFree { position:absolute; inset:0; background:rgba(85,232,138,0.06); }
.rmTimelineBlock { position:absolute; top:0; bottom:0; background:rgba(255,140,55,0.5); border-left:2px solid #ffaa55; border-radius:3px; min-width:2px; overflow:hidden; display:flex; align-items:center; }
.rmTimelineBlockTitle { font-size:8px; color:#fff; padding:0 5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.rmNowLine { position:absolute; top:0; bottom:0; width:2px; background:#ff5577; box-shadow:0 0 6px #ff5577; }
.rmNowDot { position:absolute; top:-4px; left:-4px; width:10px; height:10px; border-radius:50%; background:#ff5577; }

/* Mini timeline in card */
.rmMiniTimeline { margin-top:8px; }
.rmMiniTrack { position:relative; height:10px; border-radius:3px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); overflow:hidden; }
.rmMiniBlock { position:absolute; top:0; bottom:0; background:rgba(255,140,55,0.55); border-radius:2px; }
.rmMiniLabels { display:flex; justify-content:space-between; margin-top:2px; }
.rmMiniLabels span { font-size:7px; color:#3d5a6e; }

/* Detail Panel */
.rmDetailPanel { border:1px solid rgba(100,180,220,0.15); border-radius:14px; padding:18px; background:rgba(8,18,32,0.9); position:sticky; top:80px; display:flex; flex-direction:column; gap:12px; }
.rmDetailClose { position:absolute; right:12px; top:12px; width:26px; height:26px; border-radius:6px; border:0; background:rgba(255,255,255,0.05); color:#7a9ab2; cursor:pointer; font-size:16px; }
.rmDetailHeader { display:flex; gap:12px; align-items:flex-start; }
.rmDetailIcon { font-size:28px; }
.rmDetailFloor { font-size:8px; letter-spacing:1.4px; color:#5bdcff; }
.rmDetailHeader h3 { margin:3px 0 2px; font-size:17px; color:#daf0ff; }
.rmDetailCap { font-size:10px; color:#6a8ea6; }
.rmDetailStatus { margin-left:auto; padding:5px 9px; border-radius:7px; font-size:9px; white-space:nowrap; }
.rmDetailStatus.free { background:rgba(85,232,138,0.1); color:#55e88a; border:1px solid rgba(85,232,138,0.2); }
.rmDetailStatus.busy { background:rgba(255,170,85,0.1); color:#ffaa55; border:1px solid rgba(255,170,85,0.2); }
.rmDetailSection { display:flex; flex-direction:column; gap:6px; }
.rmDetailSectionLabel { font-size:8px; letter-spacing:1.2px; color:#4a6275; }
.rmNoBookings { font-size:10px; color:#3d5a6e; padding:10px; border:1px dashed rgba(100,180,220,0.1); border-radius:7px; text-align:center; }
.rmBookingList { display:flex; flex-direction:column; gap:6px; }
.rmBookingItem { display:flex; gap:8px; align-items:flex-start; padding:8px; border-radius:8px; background:rgba(255,140,55,0.07); border:1px solid rgba(255,140,55,0.15); }
.rmBookingTime { font-size:9px; color:#ffaa55; white-space:nowrap; font-weight:700; padding-top:1px; }
.rmBookingMeta { display:flex; flex-direction:column; gap:1px; min-width:0; }
.rmBookingMeta strong { font-size:10px; color:#cde8f8; }
.rmBookingMeta small { font-size:8px; color:#5a7a92; }

/* Amenities */
.rmAmenities { display:flex; flex-wrap:wrap; gap:5px; }
.rmAmenityChip { font-size:9px; padding:4px 8px; border-radius:6px; background:rgba(34,160,255,0.08); color:#7abfdf; border:1px solid rgba(34,160,255,0.15); }

/* Modal */
.rmModalOverlay { position:fixed; inset:0; z-index:9999; background:rgba(0,6,14,0.75); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:20px; }
.rmModal { width:min(640px,95vw); max-height:90vh; overflow-y:auto; border-radius:16px; padding:26px; background:linear-gradient(160deg,#0b1a2d,#060f1c); border:1px solid rgba(100,180,220,0.16); box-shadow:0 30px 80px rgba(0,0,0,0.7); animation:rmPop .22s ease; position:relative; }
.rmModalClose { position:absolute; right:14px; top:12px; width:30px; height:30px; border-radius:8px; border:0; background:rgba(255,255,255,0.06); color:#8aa8c2; cursor:pointer; font-size:18px; }
.rmModalHeader { display:flex; gap:14px; align-items:flex-start; margin-bottom:14px; }
.rmModalIcon { font-size:34px; }
.rmModalHeader small { font-size:8px; letter-spacing:1.4px; color:#5bdcff; }
.rmModalHeader h2 { margin:4px 0 2px; color:#daf0ff; font-size:20px; }
.rmModalHeader p { margin:0; font-size:9px; color:#5a7a92; }
.rmModalSection { margin:14px 0; }
.rmModalSection label { font-size:9px; letter-spacing:1.2px; color:#4a6275; display:block; margin-bottom:6px; }

/* Form */
.rmBookForm { display:flex; flex-direction:column; gap:12px; margin-top:14px; border-top:1px solid rgba(100,180,220,0.08); padding-top:16px; }
.rmFormRow { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.rmBookForm label { display:flex; flex-direction:column; gap:4px; font-size:10px; color:#6a8ea6; }
.rmBookForm input, .rmBookForm select { font:inherit; padding:9px 10px; border-radius:8px; border:1px solid rgba(100,180,220,0.15); background:rgba(255,255,255,0.03); color:#c8e0f0; outline:none; transition:.2s; font-size:12px; }
.rmBookForm input:focus, .rmBookForm select:focus { border-color:rgba(34,160,255,0.4); }
.rmFormErr { background:rgba(255,80,80,0.08); border:1px solid rgba(255,80,80,0.2); color:#ff8888; border-radius:7px; padding:9px 12px; font-size:10px; }
.rmFormActions { display:flex; gap:8px; justify-content:flex-end; }
.rmBtnGhost { padding:9px 14px; border:1px solid rgba(100,180,220,0.15); background:transparent; color:#7a9ab2; border-radius:8px; cursor:pointer; font-size:11px; }
.rmBtnPrimary { padding:10px 18px; border:1px solid rgba(34,160,255,0.35); background:rgba(34,160,255,0.12); color:#a8e0ff; border-radius:8px; cursor:pointer; font-size:11px; font-weight:600; transition:.2s; }
.rmBtnPrimary:hover { background:rgba(34,160,255,0.2); }

/* Toast */
.rmToast { position:fixed; bottom:22px; right:24px; z-index:10000; padding:12px 16px; border-radius:10px; border:1px solid rgba(85,232,138,0.25); background:rgba(6,14,26,0.96); color:#9df5c6; font-size:11px; box-shadow:0 10px 40px rgba(0,0,0,0.5); animation:rmPop .22s ease; }

@keyframes rmPop { from { opacity:0; transform:scale(.96) translateY(8px); } to { opacity:1; transform:none; } }

/* My Meetings Panel */
.rmMeetingsPanel { border:1px solid rgba(100,180,220,0.15); border-radius:14px; padding:16px; background:rgba(8,18,32,0.9); position:sticky; top:80px; display:flex; flex-direction:column; gap:12px; max-height:calc(100vh - 120px); overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(100,180,220,0.2) transparent; }
.rmMeetingsPanelHeader { display:flex; justify-content:space-between; align-items:center; padding-bottom:10px; border-bottom:1px solid rgba(100,180,220,0.1); }
.rmMeetingsPanelHeader span { font-size:13px; font-weight:700; color:#daf0ff; }
.rmMeetingsPanelHeader small { font-size:9px; color:#5bdcff; letter-spacing:1px; text-transform:uppercase; font-weight:600; }
.rmMtgEmpty { padding:24px 12px; text-align:center; color:#5a7a92; font-size:11px; display:flex; flex-direction:column; align-items:center; gap:8px; border:1px dashed rgba(100,180,220,0.1); border-radius:10px; }
.rmMtgEmpty div { font-size:24px; }
.rmMtgSection { display:flex; flex-direction:column; gap:8px; }
.rmMtgSectionLabel { font-size:8px; letter-spacing:1.2px; font-weight:700; text-transform:uppercase; }
.rmMtgSectionLabel.ongoing { color:#ff5577; }
.rmMtgSectionLabel.upcoming { color:#5bdcff; }
.rmMtgSectionLabel.past { color:#4a6275; }
.rmMtgItem { display:flex; gap:10px; padding:10px; border-radius:10px; background:rgba(255,255,255,0.025); border:1px solid rgba(100,180,220,0.08); transition:.2s; }
.rmMtgItem:hover { border-color:rgba(100,180,220,0.2); background:rgba(255,255,255,0.04); }
.rmMtgTime { display:flex; flex-direction:column; align-items:flex-start; min-width:56px; font-size:10px; font-weight:700; color:#9abcd4; }
.rmMtgTime small { font-size:8px; color:#5a7a92; font-weight:400; }
.rmMtgBody { display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
.rmMtgTitleRow { display:flex; justify-content:space-between; align-items:flex-start; gap:6px; }
.rmMtgTitleRow strong { font-size:11px; color:#e0f0ff; line-height:1.2; word-break:break-word; }
.rmMtgBadge { font-size:8px; font-weight:700; padding:2px 6px; border-radius:999px; text-transform:uppercase; white-space:nowrap; }
.rmMtgBadge.ongoing { background:rgba(255,85,119,0.15); color:#ff5577; border:1px solid rgba(255,85,119,0.3); }
.rmMtgBadge.upcoming { background:rgba(91,220,255,0.15); color:#5bdcff; border:1px solid rgba(91,220,255,0.3); }
.rmMtgBadge.past { background:rgba(255,255,255,0.04); color:#5a7a92; border:1px solid rgba(255,255,255,0.08); }
.rmMtgMeta { display:flex; flex-wrap:wrap; gap:6px; font-size:9px; color:#5a7a92; }
.rmMtgJoin { display:inline-block; font-size:9px; font-weight:600; color:#5bdcff; background:rgba(91,220,255,0.1); border:1px solid rgba(91,220,255,0.25); border-radius:5px; padding:3px 8px; text-decoration:none; margin-top:2px; align-self:flex-start; transition:.15s; }
.rmMtgJoin:hover { background:rgba(91,220,255,0.25); color:#fff; }
/* Right Tabs Switcher */
.rmRightTabs { display:flex; gap:6px; align-items:center; margin-bottom:10px; }
.rmRightTabBtn { flex:1; padding:8px 12px; border-radius:8px; border:1px solid rgba(100,180,220,0.15); background:rgba(255,255,255,0.03); color:#7a9ab2; font-size:11px; cursor:pointer; font-weight:600; transition:.2s; }
.rmRightTabBtn:hover { background:rgba(255,255,255,0.06); color:#a8d0ee; }
.rmRightTabBtn.on { background:rgba(34,160,255,0.15); border-color:rgba(34,160,255,0.4); color:#5bdcff; }
.rmRightTabClose { width:30px; height:32px; border-radius:8px; border:1px solid rgba(100,180,220,0.12); background:rgba(255,255,255,0.03); color:#7a9ab2; cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; transition:.2s; }
.rmRightTabClose:hover { background:rgba(255,80,80,0.15); border-color:rgba(255,80,80,0.3); color:#ff8888; }

@media(max-width:900px) {
  .rmBody { grid-template-columns:1fr; }
  .rmKpis { grid-template-columns:repeat(2,1fr); }
  .rmCardsGrid { grid-template-columns:1fr; }
  .rmDetailPanel { position:static; }
}
@media(max-width:540px) {
  .rmFormRow { grid-template-columns:1fr; }
  .rmKpis { grid-template-columns:1fr 1fr; }
}
`;
