import React from "react";

export function Info({ k, v }) {
  return (
    <div className="info">
      <small>{k}</small>
      <b>{v || "Not available"}</b>
    </div>
  );
}

export default Info;
