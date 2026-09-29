import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiFetch } from "@/src/lib/api-client";
import { invalidateAuthStatus } from "@/src/hooks/use-auth-status";

// Pengganti middleware.ts untuk SPA:
// middleware lama verify JWT (jose) di edge sebelum HTML dikirim.
// Di Vite tidak ada server — cek sesi via BFF (/api/user -> callBackendAsUser).
// Dashboard/Profile juga punya 401-handling sendiri (redirectToLogin),
// jadi komponen ini hanya mencegah flash konten protected.
//
// HANYA 401 yang berarti sesi mati. Error lain (429/5xx/network) jangan
// di-redirect ke login: cookie sesi masih ada sehingga /api/auth/status
// tetap "authed" dan Login akan melempar balik ke dashboard (loop).
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<"checking" | "ok" | "unauth" | "error">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState("checking");
    (async () => {
      try {
        const res = await apiFetch("/api/user", { credentials: "same-origin" });
        if (cancelled) return;
        if (res.ok) {
          setState("ok");
          return;
        }
        if (res.status === 401) {
          // Pastikan cookie sesi benar-benar terhapus sebelum ke login.
          try {
            await apiFetch("/api/auth/logout", { method: "POST" });
          } catch {
            // ignore
          }
          invalidateAuthStatus();
          if (!cancelled) setState("unauth");
          return;
        }
        setState("error");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, attempt]);

  if (state === "checking") {
    return <div className="min-h-screen bg-white" />;
  }

  if (state === "unauth") {
    return <Navigate to="/login?reason=session-expired" replace />;
  }

  if (state === "error") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-bold text-lg">Server sedang bermasalah</p>
        <p className="text-sm text-black/60">Gagal memuat data akun. Coba lagi sebentar lagi.</p>
        <button
          onClick={() => setAttempt((n) => n + 1)}
          className="px-6 py-3 bg-[#0059D0] text-white rounded-2xl font-bold hover:bg-[#60A8F8] transition-all active:scale-95"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
