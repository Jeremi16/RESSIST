import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiFetch } from "@/src/lib/api-client";
import { invalidateAuthStatus } from "@/src/hooks/use-auth-status";

// Pengganti middleware.ts untuk SPA:
// middleware lama verify JWT (jose) di edge sebelum HTML dikirim.
// Di Vite tidak ada server — cek sesi via BFF (/api/user -> callBackendAsUser).
// Dashboard/Profile juga punya 401-handling sendiri (redirectToLogin),
// jadi komponen ini hanya mencegah flash konten protected.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"checking" | "ok" | "unauth">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/user", { credentials: "same-origin" });
        if (cancelled) return;
        if (!res.ok) invalidateAuthStatus();
        setState(res.ok ? "ok" : "unauth");
      } catch {
        if (!cancelled) setState("unauth");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state === "checking") {
    return <div className="min-h-screen bg-white" />;
  }

  if (state === "unauth") {
    return <Navigate to="/login?reason=session-expired" replace />;
  }

  return <>{children}</>;
}
