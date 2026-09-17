import React from "react";

export function Nav({ a, s, id, t, i, n }) {
  return (
    <button
      className={`nav ${a === id ? "on" : ""}`}
      onClick={() => s(id)}
    >
      <b>{i}</b>
      {t}
      {n !== undefined && <small>{n}</small>}
    </button>
  );
}

export default Nav;
