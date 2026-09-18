import React from "react";
import { Info } from "../common/Info";

export function ProfileCard({ p, close, logout }) {
  const email = p?.mail || p?.userPrincipalName || "Not available";

  const handleLogout = async () => {
    close();
    if (logout) await logout();
  };

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
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid rgba(56, 234, 255, 0.35)",
              color: "#9feef9",
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 10,
              letterSpacing: "0.8px",
              cursor: "pointer"
            }}
          >
            ↪ Sign out
          </button>
        </div>
        <div className="profileNote">
          ✦ Profile information is fetched from Microsoft Graph <b>/me</b> for the signed-in employee.
        </div>
      </div>
    </div>
  );
}

export default ProfileCard;
