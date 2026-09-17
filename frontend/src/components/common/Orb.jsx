import React from "react";

export function Orb({ mode = "idle", size = "normal" }) {
  return (
    <div className={`orb ${mode} ${size}`}>
      <div className="orbAura" />
      <div className="orbRing ring1" />
      <div className="orbRing ring2" />
      <div className="orbRing ring3" />
      <div className="orbGrid" />
      <div className="orbCore" />
      <i className="p1" />
      <i className="p2" />
      <i className="p3" />
      <i className="p4" />
      <i className="p5" />
      <i className="p6" />
    </div>
  );
}

export default Orb;
