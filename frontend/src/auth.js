import { PublicClientApplication } from "@azure/msal-browser";

// Delegated permissions for a personal employee-copilot prototype.
// Mail.ReadWrite is needed for saving drafts / flagging / importance updates.
export const loginRequest = {
  scopes: ["User.Read", "Mail.Read", "Mail.ReadWrite", "Mail.Send", "Calendars.Read"]
};

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: import.meta.env.VITE_AZURE_AUTHORITY || "https://login.microsoftonline.com/common",
    redirectUri: import.meta.env.VITE_REDIRECT_URI || "http://localhost:5173"
  },
  cache: { cacheLocation: "sessionStorage" }
});
