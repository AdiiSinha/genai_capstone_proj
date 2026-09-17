import React from "react";

export function K({ n, l, s, cl }) {
  return (
    <div className="kpi">
      <i className={cl} />
      <div>
        <b>{n}</b>
        <strong>{l}</strong>
        <small>{s}</small>
      </div>
    </div>
  );
}

export default K;
