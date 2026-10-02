/**
 * Factory CRM — application entry
 *
 * Boot order: BrowserRouter → AuthProvider (refresh cookie) → App routes.
 * Imported by Vite from index.html; wraps App with auth before any page renders.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
