import { useEffect, useState } from "react";
import { apiFetch } from "@/src/lib/api-client";

export type AuthStatus = "checking" | "authed" | "guest";

// Hasil /api/auth/status di-cache per page-load agar navbar + hero +
// halaman login tidak fetch berulang. WAJIB di-invalidate setiap logout
// (lihat invalidateAuthStatus) — kalau tidak, cache basi "authed" bisa
// me-loop redirect login -> dashboard -> login.
let cachedPromise: Promise<boolean> | null = null;

function fetchAuthStatus(): Promise<boolean> {
  if (!cachedPromise) {
    cachedPromise = (async () => {
      try {
        const res = await apiFetch("/api/auth/status", {
          credentials: "same-origin",
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { authenticated?: boolean };
        return data.authenticated === true;
      } catch {
        // Fail-closed ke tampilan guest: jangan kunci user di luar
        // hanya karena endpoint status tidak terjangkau.
        return false;
      }
    })();
  }
  return cachedPromise;
}

/** Hapus cache status — panggil setiap logout / sesi dinyatakan mati. */
export function invalidateAuthStatus(): void {
  cachedPromise = null;
}

export function useAuthStatus(): AuthStatus {
  const [status, setStatus] = useState<AuthStatus>("checking");
  useEffect(() => {
    let cancelled = false;
    fetchAuthStatus().then((ok) => {
      if (!cancelled) setStatus(ok ? "authed" : "guest");
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}
