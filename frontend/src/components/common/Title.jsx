import React from "react";

export function Title({ k, t }) {
  return (
    <div className="title">
      <div>
        <small>{k}</small>
        <h3>{t}</h3>
      </div>
    </div>
  );
}

export default Title;
