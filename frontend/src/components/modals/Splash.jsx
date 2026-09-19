import React, { useEffect } from "react";
import { Orb } from "../common/Orb";
import { chooseVoice } from "../../services/speech";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(p, account) {
  const raw = p?.givenName || p?.displayName || account?.name || "";
  const cleaned = raw.trim().split(/\s+/)[0];
  return cleaned || "Employee";
}

export function Splash({ p, account }) {
  const greeting = getGreeting();
  const firstName = getFirstName(p, account);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Initializing Copilot");
      const voice = chooseVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = "en-IN";
      utterance.rate = 0.95;
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  return (
    <div className="splash">
      <Orb mode="thinking" size="large" />
      <small>CONTEXT ENGINE INITIALIZING</small>
      <h2>{greeting}, {firstName}.</h2>
      <p>Connecting your workday context…</p>
      <div className="load" />
      <div className="tags">MAIL · CALENDAR · TEAMS CONTEXT · WORKPLACE</div>
    </div>
  );
}

export default Splash;
