/**
 * TeamGrid.jsx — Team Members tab panel for the project inspector.
 */
import React from "react";

export function TeamGrid({ team }) {
  return (
    <div className="pjTabSection">
      <div className="pjTeamGrid">
        {team.map((member, idx) => (
          <div className="pjTeamCard" key={idx}>
            <div className="pjTeamAvatar">{member.avatar}</div>
            <div className="pjTeamInfo">
              <h4>{member.name}</h4>
              <p>{member.role}</p>
              <small>{member.email}</small>
            </div>
            <a href={`mailto:${member.email}`} className="pjMemberContactBtn" title="Send email">
              ✉
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
