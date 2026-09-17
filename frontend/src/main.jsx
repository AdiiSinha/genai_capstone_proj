import React from "react";
import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./auth";
import { App } from "./App";
import "./styles.css";

msalInstance.initialize().then(() => {
  createRoot(document.getElementById("root")).render(
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  );
});
