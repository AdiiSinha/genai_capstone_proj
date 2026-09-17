import React from "react";
import { Orb } from "../common/Orb";

export function Splash({ p, account }) {
  return (
    <div className="splash">
      <Orb mode="thinking" size="large" />
      <small>CONTEXT ENGINE INITIALIZING</small>
      <h2>Good afternoon, {p?.givenName || account?.name || "Employee"}.</h2>
      <p>Connecting your workday context…</p>
      <div className="load" />
      <div className="tags">MAIL · CALENDAR · TEAMS CONTEXT · WORKPLACE</div>
    </div>
  );
}

export default Splash;
