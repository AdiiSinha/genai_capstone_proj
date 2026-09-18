import React from "react";
import { Nav } from "../common/Nav";

export function Sidebar({ mod, setMod, mailCount = 0, calendarCount = 0, logout }) {
  return (
    <aside>
      <small>WORKSPACE</small>
      <Nav a={mod} s={setMod} id="home" t="Today" i="⌂" />
      <Nav a={mod} s={setMod} id="copilot" t="AI Copilot" i="✦" />
      <Nav a={mod} s={setMod} id="mail" t="Inbox" i="✉" n={mailCount} />
      <Nav a={mod} s={setMod} id="calendar" t="Calendar" i="◷" n={calendarCount} />
      <Nav a={mod} s={setMod} id="commit" t="Commitments" i="◎" />
      <Nav a={mod} s={setMod} id="projects" t="Projects" i="◇" />
      <Nav a={mod} s={setMod} id="waiting" t="Waiting For" i="⌛" />
      <small className="lower">WORKPLACE</small>
      <Nav a={mod} s={setMod} id="workplace" t="Campus" i="▦" />
      <Nav a={mod} s={setMod} id="rooms" t="Meeting Rooms" i="▣" />
    </aside>
  );
}

export default Sidebar;
