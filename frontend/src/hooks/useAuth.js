/**
 * useAuth.js — MSAL token acquisition and account lifecycle hook.
 * All Microsoft authentication logic lives here; App.jsx just consumes it.
 */
import { useRef, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../auth";

export function useAuth() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const mountedRef = useRef(true);

  useEffect(() => {
    if (account && !instance.getActiveAccount()) {
      instance.setActiveAccount(account);
    }
  }, [account, instance]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  async function token() {
    try {
      const res = await instance.acquireTokenSilent({
        scopes: loginRequest.scopes,
        account: instance.getActiveAccount() || account
      });
      return res.accessToken;
    } catch {
      const res = await instance.acquireTokenPopup({ scopes: loginRequest.scopes });
      return res.accessToken;
    }
  }

  async function login() {
    await instance.loginPopup(loginRequest);
  }

  async function logout() {
    window.speechSynthesis?.cancel();
    await instance.logoutPopup();
  }

  return { account, instance, mountedRef, token, login, logout };
}
