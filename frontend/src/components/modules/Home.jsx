import React from "react";
import { tasks } from "../../data";
import { K } from "../common/K";
import { Title } from "../common/Title";
import { Orb } from "../common/Orb";
import { eventDate, formatEventTime } from "../../calendarDate";

function getIndiaGreeting() {
  const hour = Number(new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false
  }).format(new Date()));

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Home({ p, m, c, ask, set, suggestions }) {
  const u = tasks.filter(x => x[3] === "critical" || x[3] === "high").length;
  const greeting = getIndiaGreeting();
  const upcomingCalendar = c
    .filter(event => {
      if (event.isCancelled || !event.start?.dateTime) return false;

      const end = eventDate(event.end) || eventDate(event.start);
      return end && end.getTime() > Date.now();
    })
    .sort((first, second) => (
      eventDate(first.start).getTime() - eventDate(second.start).getTime()
    ))
    .slice(0, 3);

  return (
    <div>
      <div className="hero">
        <div>
          <small>YOUR WORKDAY, AT A GLANCE</small>
          <h2>{greeting}, {p?.givenName || "there"}.</h2>
          <p>I've connected the latest context. Here's what matters right now.</p>
        </div>
        <span>● Context synced</span>
      </div>

      <div className="kpis">
        <K n={u} l="Urgent" s="needs attention" cl="red" />
        <K n={tasks.length} l="Actions" s="across your work" cl="amber" />
        <K n={c.length} l="Meetings" s="next 7 days" cl="cyan" />
        <K n={1} l="Waiting" s="dependency detected" cl="violet" />
      </div>

      <div className="two">
        <section className="panel">
          <Title k="AI PRIORITIZATION" t="Today's Action Plan" />
          {tasks.map(x => (
            <div className="action" key={x[0]}>
              <span className={x[3]} />
              <div>
                <b>{x[0]}</b>
                <em>{x[1]}</em>
                <p>{x[4]}</p>
                <small>◷ {x[2]}</small>
              </div>
              <button onClick={() => ask(`What should I do about ${x[0]}?`)}>→</button>
            </div>
          ))}
        </section>

        <section className="panel center">
          <Orb />
          <small>READY</small>
          <h3>Ask your Workday Copilot</h3>
          <p>Voice or text. Try a command.</p>
          <div className="chips">
            {suggestions.slice(0, 4).map(x => (
              <button onClick={() => ask(x)} key={x}>
                {x} ↗
              </button>
            ))}
          </div>
          <button className="open" onClick={() => set("copilot")}>
            Open full Copilot →
          </button>
        </section>
      </div>

      <div className="two lowergrid">
        <section className="panel">
          <Title k="INCOMING" t="Important mail" />
          {m.slice(0, 3).map(x => (
            <div className="line" key={x.id}>
              <span />
              <div>
                <b>{x.subject || "(No subject)"}</b>
                <small>{x.bodyPreview}</small>
              </div>
            </div>
          ))}
        </section>

        <section className="panel">
          <Title k="UP NEXT" t="Calendar" />
          {upcomingCalendar.map(x => (
            <div className="line" key={x.id}>
              <strong>
                {formatEventTime(x.start)}
              </strong>
              <div>
                <b>{x.subject}</b>
                <small>{x.location?.displayName || "Online"}</small>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Home;
