import React, { useState } from "react";

export function Modal({ x, close, send, draft }) {
  const [to, setTo] = useState(x.to || "");
  const [cc, setCc] = useState(x.cc || "");
  const [s, setS] = useState(x.subject || "");
  const [b, setB] = useState(x.body || "");
  const [saving, setSaving] = useState(false);

  const isReply = x.mode === "reply" || x.label?.toLowerCase().includes("reply");
  const isLeave = x.mode === "leave";

  async function save(mode) {
    setSaving(true);
    try {
      if (mode === "draft") await draft({ to, cc, subject: s, body: b });
      else await send({ to, cc, subject: s, body: b });
    } finally {
      setSaving(false);
    }
  }

  const modalTitle = isLeave
    ? "Leave Application"
    : isReply
    ? "Reply to email"
    : "Confirm email action";

  const modalDesc = isLeave
    ? "✦ AI-drafted leave application · Review and edit the letter, then approve to send directly to your HR."
    : "✦ AI-assisted action · Review the recipient, CC, subject and message before saving or sending.";

  return (
    <div className="back">
      <div className="modal">
        <button className="modalClose" onClick={close}>
          ×
        </button>
        <small>{isLeave ? "AGENTIC LEAVE WORKFLOW · HUMAN APPROVAL" : "HUMAN APPROVAL"}</small>
        <h2>{modalTitle}</h2>
        <p>{modalDesc}</p>
        <div className="recipientRow">
          <label>
            Recipient
            <input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="person@company.com"
            />
          </label>
          <label>
            CC
            <input
              value={cc}
              onChange={e => setCc(e.target.value)}
              placeholder="Optional"
            />
          </label>
        </div>
        <label>
          Subject
          <input value={s} onChange={e => setS(e.target.value)} />
        </label>
        <label>
          Message
          <textarea rows="10" value={b} onChange={e => setB(e.target.value)} />
        </label>
        <div className="draftInfo">
          {draft && "Saving creates an Outlook Draft you can edit later."}
        </div>
        <footer>
          <button onClick={close}>Cancel</button>
          <button disabled={saving} onClick={() => save("draft")}>
            ▣ Save draft
          </button>
          <button className="sendBtn" disabled={saving} onClick={() => save("send")}>
            ✦ Approve & Send
          </button>
        </footer>
      </div>
    </div>
  );
}

export default Modal;
