/**
 * useCommitments.js — Commitment polling and refresh logic.
 * Separates the periodic commitment extraction from the main App shell.
 */
import { useState, useRef } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function useCommitments({ token, mountedRef }) {
  const [commitments, setCommitments] = useState([]);
  const commitmentPollRef = useRef(null);
  const commitmentDataRef = useRef({ profile: null, emails: [], sentEmails: [] });

  function setCommitmentData(data) {
    commitmentDataRef.current = {
      profile: data.p,
      emails: data.m,
      sentEmails: data.sent
    };
  }

  async function refreshCommitments(data = commitmentDataRef.current) {
    try {
      const response = await fetch(`${API}/api/commitments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sent: data.sentEmails,
          inbox: data.emails,
          employee: data.profile,
          now: new Date().toISOString()
        })
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.detail || "Commitment refresh failed");
      if (mountedRef.current) setCommitments(result.commitments || []);
    } catch (e) {
      console.warn("COMMITMENT REFRESH ERROR:", e);
    }
  }

  return {
    commitments,
    commitmentPollRef,
    commitmentDataRef,
    setCommitmentData,
    refreshCommitments
  };
}
