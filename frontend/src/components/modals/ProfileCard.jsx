import React from "react";
import { Info } from "../common/Info";

export function ProfileCard({ p, close }) {
  const email = p?.mail || p?.userPrincipalName || "Not available";

  return (
    <div className="profileBack" onClick={close}>
      <div className="profileCard" onClick={e => e.stopPropagation()}>
        <button className="modalClose" onClick={close}>
          ×
        </button>
        <div className="profileHero">
          <div className="profileAvatar">{(p?.displayName || "A").slice(0, 1).toUpperCase()}</div>
          <div>
            <small>AUTHORIZED EMPLOYEE PROFILE</small>
            <h2>{p?.displayName || "Employee"}</h2>
            <p>{p?.jobTitle || "Employee"}</p>
          </div>
        </div>
        <div className="profileGrid">
          <Info k="Work email" v={email} />
          <Info k="Department" v={p?.department} />
          <Info k="Office" v={p?.officeLocation} />
          <Info k="Preferred language" v={p?.preferredLanguage} />
          <Info k="Mobile" v={p?.mobilePhone} />
          <Info k="User ID" v={p?.id} />
        </div>
        <div className="profileNote">
          ✦ Profile information is fetched from Microsoft Graph <b>/me</b> for the signed-in employee.
        </div>
      </div>
    </div>
  );
}

export default ProfileCard;
