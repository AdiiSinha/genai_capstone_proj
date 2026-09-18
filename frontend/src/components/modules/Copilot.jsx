import React from "react";
import { Orb } from "../common/Orb";

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
  return (
    <div className="cp">
      <div className="cphead">
        <div>
          <small>CONVERSATIONAL WORK INTERFACE</small>
          <h2>Workday Copilot</h2>
          <p>Ask anything about your current work context.</p>
        </div>
        <span className={`status ${state}`}>
          <i />
          {state === "listening"
            ? "Listening"
            : state === "thinking"
            ? "Thinking"
            : state === "speaking"
            ? "AI speaking"
            : "Ready"}
        </span>
      </div>

      <div className="stage">
        <Orb mode={state} />
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
          <p>
            {state === "listening"
              ? "Speak naturally. Say “stop” to cancel."
              : state === "thinking"
              ? "Connecting mail, calendar and workplace context…"
              : state === "speaking"
              ? "You can stop the response at any time."
              : "Your workday context is ready."}
          </p>
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
                      {x.label || "Review action"} →
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="quick">
        {suggestions.map(x => (
          <button key={x} onClick={() => ask(x)}>
            {x}
          </button>
        ))}
      </div>

      <div className="input">
        <button
          className={`inputMute ${muted ? "muted" : ""}`}
          onClick={() => {
            setMuted(v => !v);
            if (!muted) stop();
          }}
          title={muted ? "Unmute AI response" : "Mute AI response"}
          aria-label={muted ? "Unmute AI response" : "Mute AI response"}
        >
          {muted ? "◌̸" : "🔇"}
        </button>
        <button className={state === "listening" ? "micLive" : ""} onClick={voice}>
          {state === "listening" ? "◼" : "🎙️"}
        </button>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask(q)}
          placeholder="Ask your workday copilot…"
        />
        <button onClick={() => ask(q)}>↑</button>
      </div>
    </div>
  );
}

export default Copilot;
