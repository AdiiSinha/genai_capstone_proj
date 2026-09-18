import React, { useState } from "react";
import { Orb } from "../common/Orb";

function Icon({ name, size = 16 }) {
  const paths = {
    speaker: <><path d="M3 10v4h3l4 3V7l-4 3H3Z" /><path d="M14 9.5a4 4 0 0 1 0 5" /><path d="M16 7a7 7 0 0 1 0 10" /></>,
    muted: <><path d="M3 10v4h3l4 3V7l-4 3H3Z" /><path d="m15 10 4 4m0-4-4 4" /></>,
    mic: <><path d="M12 3a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 5 0v-5A2.5 2.5 0 0 0 12 3Z" /><path d="M6.5 10.5a5.5 5.5 0 0 0 11 0M12 16v4M9 20h6" /></>,
    micOff: <><path d="M9.5 5.5v5a2.5 2.5 0 0 0 4.4 1.6M14.5 8v-2.5a2.5 2.5 0 0 0-4.2-1.8M6.5 10.5a5.5 5.5 0 0 0 9.8 3.4M12 16v4M9 20h6M4 4l16 16" /></>,
    send: <><path d="m4 4 16 8-16 8 3-8-3-8Z" /><path d="M7 12h13" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    restore: <><path d="M4 8V4h4M4.5 4.5A8 8 0 1 1 4 14" /></>
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function Copilot({
  msgs,
  q,
  setQ,
  ask,
  state,
  voice,
  stop,
  modal,
  suggestions,
  autoListen,
  muted,
  setMuted
}) {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const conversationStarted = msgs.length > 0 || q.trim().length > 0 || state !== "idle";
  const isResponding = state === "thinking" || state === "speaking";

  return (
    <div className={`cp ${conversationStarted ? "hasConversation" : ""}`}>
      <div className="cphead">
        <div className="cpBrand"><span className="cpBrandMark">✦</span><div><strong>WORKDAY COPILOT</strong><small>Employee experience</small></div></div>
        <span className={`status ${state}`}>
          <i />
          {state === "listening"
            ? "Listening"
            : state === "thinking"
            ? "Thinking"
            : state === "speaking"
            ? "AI speaking"
            : "Ready"}
          <button className="headerMute" onClick={() => { setMuted(v => !v); if (!muted) stop(); }} title={muted ? "Unmute AI" : "Mute AI"} aria-label={muted ? "Unmute AI" : "Mute AI"}>
            <Icon name={muted ? "muted" : "speaker"} size={15} />
          </button>
        </span>
      </div>

      <div className="stage">
        <div className="orbDock"><Orb mode={state} /></div>
        <div className="stageText">
          <strong>
            {state === "listening"
              ? "LISTENING"
              : state === "thinking"
              ? "ANALYZING YOUR WORK CONTEXT"
              : state === "speaking"
              ? "AI IS SPEAKING"
              : "READY FOR YOUR COMMAND"}
          </strong>
          {state === "thinking" && <div className="thinkingDots" aria-label="AI is thinking"><i /><i /><i /></div>}
        </div>
      </div>

      <div className="chat">
        {msgs.length === 0 && (
          <div className="empty">
            <h3>What can I help you with?</h3>
            <p>Try a command below. I’ll use your authorized work context and remember this conversation locally.</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div className={`msg ${m.r}`} key={i}>
            <span>{m.r === "u" ? "A" : "✦"}</span>
            <div>
              <div className="msgLabel">{m.r === "u" ? "YOU" : "WORKDAY COPILOT"}</div>
              {m.t.split("\n").map((x, j) => (
                <p key={j}>{x || " "}</p>
              ))}
              {m.actions?.length > 0 && (
                <div className="actionButtons">
                  {m.actions.map((x, j) => (
                    <button key={j} onClick={() => modal(x)}>
                      {x.label || "Review action"} <span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="composerZone">
        {showSuggestions ? (
          <div className="quick" aria-label="Instant suggestions">
            {suggestions.map(x => <button key={x} onClick={() => ask(x)}>{x}</button>)}
            <button className="quickClose" onClick={() => setShowSuggestions(false)} title="Close suggestions" aria-label="Close suggestions"><Icon name="close" size={12} /></button>
          </div>
        ) : (
          <button className="suggestionsRestore" onClick={() => setShowSuggestions(true)} title="Show suggestions" aria-label="Show suggestions"><Icon name="restore" size={12} /> Suggestions</button>
        )}

      <div className={`input ${isResponding ? "responding" : ""}`}>
        <button
          className={`inputMute ${muted ? "muted" : ""}`}
          onClick={() => {
            setMuted(v => !v);
            if (!muted) stop();
          }}
          title={muted ? "Unmute AI response" : "Mute AI response"}
          aria-label={muted ? "Unmute AI response" : "Mute AI response"}
        >
          <Icon name={muted ? "muted" : "speaker"} />
        </button>
        <button className={`inputVoice ${state === "listening" ? "micLive" : ""}`} onClick={voice} title={state === "listening" ? "Stop listening" : "Voice command"} aria-label={state === "listening" ? "Stop listening" : "Voice command"}>
          <Icon name={state === "listening" ? "micOff" : "mic"} />
        </button>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask(q)}
          placeholder="Ask your Workday Copilot..."
        />
        <button className={`sendButton ${isResponding ? "stopButton" : ""}`} onClick={() => isResponding ? stop() : ask(q)} title={isResponding ? "Stop response" : "Send message"} aria-label={isResponding ? "Stop response" : "Send message"}>
          <Icon name={isResponding ? "stop" : "send"} />
        </button>
      </div>
      </div>
    </div>
  );
}

export default Copilot;
