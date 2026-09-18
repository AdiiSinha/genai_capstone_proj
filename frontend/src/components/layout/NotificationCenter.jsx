import React from "react";

const priorityMeta = {
  critical: { label: "Critical", color: "critical" },
  high: { label: "High", color: "high" },
  medium: { label: "Medium", color: "medium" },
  low: { label: "Low", color: "low" }
};

export function NotificationCenter({
  notifications,
  open,
  onClose,
  onMarkRead,
  onDismiss,
  onSnooze,
  onOpen,
  onAskAI
}) {
  if (!open) return null;

  const groups = [
    "Urgent tasks",
    "Due today",
    "Waiting for replies",
    "Meeting reminders",
    "Deadlines & escalations"
  ];

  const itemsByGroup = groups.reduce((acc, group) => {
    acc[group] = notifications.filter(item => item.group === group);
    return acc;
  }, {});

  return (
    <div className="notification-overlay" onClick={onClose}>
      <aside className="notification-panel" onClick={e => e.stopPropagation()}>
        <div className="notification-header">
          <div>
            <small>WORKDAY ALERTS</small>
            <h3>Notifications</h3>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="notification-summary">
          <span>{notifications.filter(n => !n.read).length} active</span>
          <span>{notifications.filter(n => n.priority === "critical").length} critical</span>
        </div>

        <div className="notification-groups">
          {groups.map(group => {
            const items = itemsByGroup[group];
            if (!items || items.length === 0) return null;

            return (
              <section key={group} className="notification-group">
                <h4>{group}</h4>

                {items.map(item => {
                  const meta = priorityMeta[item.priority] || priorityMeta.medium;
                  return (
                    <article key={item.id} className={`notification-item ${item.read ? "read" : "unread"}`}>
                      <div className="notification-item-top">
                        <span className={`priority-badge ${meta.color}`}>{meta.label}</span>
                        {!item.read && <span className="unread-dot" />}
                      </div>

                      <div className="notification-body">
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                        <small>{item.time}</small>
                      </div>

                      <div className="notification-actions">
                        <button onClick={() => onOpen(item)}>Open</button>
                        <button onClick={() => onAskAI(item)}>AI brief</button>
                        <button onClick={() => onMarkRead(item.id)}>Read</button>
                        <button onClick={() => onSnooze(item.id)}>Snooze</button>
                        <button className="danger" onClick={() => onDismiss(item.id)}>Dismiss</button>
                      </div>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

export default NotificationCenter;
