import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./App";
import { isNative } from "./lib/platform";
import { loadMobileSession } from "./lib/api-client";
import "./globals.css";

// Inside the Capacitor Android shell, skip the marketing landing page:
// cold start always lands on /login (authed users bounce to /dashboard).
// Web behaviour untouched.
if (isNative()) {
  if (window.location.pathname === "/") {
    window.history.replaceState(null, "", "/login");
  }
  // Hydrate Bearer/refresh tokens from durable storage before first render.
  void loadMobileSession();
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
