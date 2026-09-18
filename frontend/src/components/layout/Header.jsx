import React from "react";

export function Header({
  d,
  account,
  state,
  voiceLabel,
  toggleVoice,
  stopSpeaking,
  stopRecognition,
  muted,
  setMuted,
  autoListen,
  setAutoListen,
  setProfileOpen,
  notificationCount,
  onToggleNotifications
}) {
  return (
    <header>
      <div className="brand">
        <b>✦</b>
        <span>
          WORKDAY <em>COPILOT</em>
          <small>EMPLOYEE EXPERIENCE AI</small>
        </span>
      </div>
      <div className="live">
        <span className="liveDot" /> LIVE CONTEXT · {d.m.length} MAILS · {d.c.length} EVENTS · TEAMS SYNTHETIC
      </div>
      <div className="top">
        <button className="notificationBell" onClick={onToggleNotifications} title="Open notifications">
          <span className="bellGlyph">🔔</span>
          {notificationCount > 0 && <span className="notificationBadge">{notificationCount}</span>}
        </button>
        <button className={`voiceTop ${state !== "idle" ? "active" : ""}`} onClick={toggleVoice} title={voiceLabel}>
          <span className="voiceGlyph">{state === "speaking" ? "◼" : state === "listening" ? "◉" : "✦"}</span>
          <small>{voiceLabel}</small>
        </button>
        <button
          className="stopTop"
          onClick={() => {
            stopSpeaking();
            stopRecognition();
          }}
          title="Stop voice"
        >
          ■
        </button>
        <button
          className={`muteTop ${muted ? "muted" : ""}`}
          onClick={() => {
            setMuted(v => !v);
            if (!muted) stopSpeaking();
          }}
          title={muted ? "Unmute AI voice" : "Mute AI voice"}
          aria-label={muted ? "Unmute AI voice" : "Mute AI voice"}
        >
          {muted ? "◌̸" : "၊၊||၊"}
          <small>{muted ? "MUTED" : "VOICE"}</small>
        </button>
        <button
          className="autoTop"
          onClick={() => setAutoListen(v => !v)}
          title="Automatic listening after responses"
        >
          AUTO {autoListen ? "ON" : "OFF"}
        </button>
        <button
          className="avatar"
          onClick={() => setProfileOpen(true)}
          title="Open employee profile"
        >
          {(d.p?.displayName || account?.name || "A").slice(0, 1).toUpperCase()}
        </button>
      </div>
    </header>
  );
}

export default Header;
