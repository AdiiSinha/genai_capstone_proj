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
  onToggleNotifications,
  onToggleSidebar
}) {
  return (
    <header>
      <div className="brand">
        <button className="menuToggle" onClick={onToggleSidebar} title="Toggle Sidebar">
          ☰
        </button>
        <b>✦</b>
        <span>
          WORKDAY <em>COPILOT</em>
          <small>EMPLOYEE EXPERIENCE AI</small>
        </span>
      </div>
      <div className="top">
        <button className="notificationBell" onClick={onToggleNotifications} title="Open notifications">
          <span className="bellGlyph">🔔</span>
          {notificationCount > 0 && <span className="notificationBadge">{notificationCount}</span>}
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
