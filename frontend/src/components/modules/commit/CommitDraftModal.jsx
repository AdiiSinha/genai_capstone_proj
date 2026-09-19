/**
 * CommitDraftModal.jsx — Modal for reviewing & approving AI generated follow-up draft.
 */
import React from "react";

export function CommitDraftModal({ d, set, close, save, send, busy }) {
  return (
    <div className="drawerBack">
      <div className="draft">
        <button className="x" onClick={close}>×</button>
        <small className="kicker">HUMAN APPROVAL · AI DRAFT</small>
        <h2>Follow up on commitment</h2>
        <p>AI prepared this message from the detected commitment. Review it before saving or sending.</p>
        <label>To<input value={d.to || ""} onChange={e => set({ ...d, to: e.target.value })} /></label>
        <label>Subject<input value={d.subject || ""} onChange={e => set({ ...d, subject: e.target.value })} /></label>
        <label>Message<textarea rows="11" value={d.body || ""} onChange={e => set({ ...d, body: e.target.value })} /></label>
        <div className="approval">✓ Human approval required. Nothing is sent automatically.</div>
        <footer>
          <button onClick={close}>Cancel</button>
          <button disabled={busy} onClick={save}>▣ Save Outlook draft</button>
          <button className="primary" disabled={busy} onClick={send}>✦ Approve & Send</button>
        </footer>
      </div>
    </div>
  );
}
