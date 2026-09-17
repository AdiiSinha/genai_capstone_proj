import React from "react";

export function Login({ onLogin }) {
  return (
    <div className="login">
      <div className="scan" />
      <div className="loginOrb">
        <div />
      </div>
      <div className="loginText">
        <small>AI EMPLOYEE EXPERIENCE</small>
        <h1>
          WORKDAY
          <br />
          <span>COPILOT</span>
        </h1>
        <p>Understand your work. Know what matters. Take the next best action.</p>
        <button onClick={onLogin}>
          Sign in with Microsoft <b>→</b>
        </button>
        <i>Secure identity · Context-aware · Human controlled</i>
      </div>
    </div>
  );
}

export default Login;
