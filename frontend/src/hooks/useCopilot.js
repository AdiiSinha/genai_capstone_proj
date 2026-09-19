/**
 * useCopilot.js — AI chat, voice/speech, suggestions, and modal state.
 * All AI interaction logic lives here; App.jsx delegates to this hook.
 */
import { useState, useRef, useMemo } from "react";
import { ai, BASE_SUGGESTIONS, dynamicFallback, fallback } from "../services/ai";
import { cleanSpeech, chooseVoice } from "../services/speech";

export function useCopilot({ mountedRef, data, commitments, teams }) {
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState("");
  const [state, setState] = useState("idle");
  const [suggestions, setSuggestions] = useState(BASE_SUGGESTIONS);
  const [muted, setMuted] = useState(false);
  const [autoListen, setAutoListen] = useState(true);
  const [modal, setModal] = useState(null);

  const requestRef = useRef(0);
  const autoTimerRef = useRef(null);
  const recognitionRef = useRef(null);

  const sessionId = useMemo(() => {
    let sid = localStorage.getItem("wd_session_id");
    if (!sid) {
      sid = "sess-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("wd_session_id", sid);
    }
    return sid;
  }, []);

  function saveMemory(question, answer) {
    const old = JSON.parse(localStorage.getItem("wdmem") || "[]");
    localStorage.setItem("wdmem", JSON.stringify([
      ...old,
      { q: question, a: answer, at: new Date().toISOString() }
    ].slice(-40)));
  }

  function setDynamicSuggestions(items) {
    const clean = Array.from(new Set((items || []).filter(Boolean).map(String))).slice(0, 6);
    setSuggestions(clean.length ? clean : BASE_SUGGESTIONS);
  }

  function speak(text, continueListening = false) {
    if (muted) {
      setState("idle");
      if (continueListening && autoListen) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = setTimeout(() => startListening(true), 2300);
      }
      return;
    }
    if (!window.speechSynthesis) { setState("idle"); return; }
    clearTimeout(autoTimerRef.current);
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanSpeech(text));
    const voiceChoice = chooseVoice();
    if (voiceChoice) u.voice = voiceChoice;
    u.lang = "en-IN";
    u.rate = 0.94;
    u.pitch = 0.92;
    u.volume = 1;
    u.onstart = () => mountedRef.current && setState("speaking");
    u.onend = () => {
      if (!mountedRef.current) return;
      setState("idle");
      if (continueListening && autoListen) {
        autoTimerRef.current = setTimeout(() => startListening(true), 2300);
      }
    };
    u.onerror = () => { if (mountedRef.current) setState("idle"); };
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    requestRef.current += 1;
    window.speechSynthesis?.cancel();
    setState("idle");
  }

  function stopRecognition() {
    clearTimeout(autoTimerRef.current);
    try { recognitionRef.current?.stop?.(); } catch {}
    recognitionRef.current = null;
    if (state === "listening") setState("idle");
  }

  function startListening(isAuto = false) {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return;
    if (state === "speaking") stopSpeaking();
    stopRecognition();
    const r = new R();
    r.lang = "en-IN";
    r.interimResults = true;
    r.continuous = false;
    r.onstart = () => mountedRef.current && setState("listening");
    r.onresult = e => {
      const finalText = Array.from(e.results).map(v => v[0].transcript).join(" ").trim();
      if (!finalText) return;
      if (/^(stop|stop listening|cancel|quiet)$/i.test(finalText)) {
        stopRecognition();
        setState("idle");
        return;
      }
      if (e.results[e.results.length - 1].isFinal) ask(finalText);
    };
    r.onerror = e => {
      if (mountedRef.current && e.error !== "aborted" && e.error !== "no-speech") return;
      if (mountedRef.current) setState("idle");
    };
    r.onend = () => {
      recognitionRef.current = null;
      if (mountedRef.current && state === "listening") setState("idle");
    };
    recognitionRef.current = r;
    try { r.start(); } catch { setState("idle"); }
    if (!isAuto) setAutoListen(true);
  }

  function toggleVoice() {
    if (state === "speaking") return stopSpeaking();
    if (state === "listening") return stopRecognition();
    startListening(false);
  }

  async function ask(text) {
    if (!text.trim()) return;
    const requestId = ++requestRef.current;
    stopRecognition();
    clearTimeout(autoTimerRef.current);
    setQ("");
    setState("thinking");
    try {
      const memory = JSON.parse(localStorage.getItem("wdmem") || "[]");
      const ctx = {
        profile: data?.p,
        emails: data?.m,
        sentEmails: data?.sent,
        calendar: data?.c
      };
      const z = await ai({ query: text, context: ctx, memory, session_id: sessionId });
      if (requestId !== requestRef.current) return;
      const answer = String(z.answer || "").trim();
      setMsgs(x => [...x, { r: "u", t: text }, { r: "a", t: answer, actions: z.actions || [] }]);
      saveMemory(text, answer);
      setDynamicSuggestions(z.suggestions);
      speak(answer, true);
    } catch (e) {
      if (requestId !== requestRef.current) return;
      const answer = fallback(text, data, teams?.length || 0);
      setMsgs(x => [...x, { r: "u", t: text }, { r: "a", t: answer, actions: [] }]);
      saveMemory(text, answer);
      setDynamicSuggestions(dynamicFallback(text));
      speak(answer, true);
    }
  }

  return {
    msgs, setMsgs,
    q, setQ,
    state, setState,
    suggestions,
    muted, setMuted,
    autoListen, setAutoListen,
    modal, setModal,
    ask,
    speak,
    stopSpeaking,
    stopRecognition,
    startListening,
    toggleVoice,
    autoTimerRef
  };
}
