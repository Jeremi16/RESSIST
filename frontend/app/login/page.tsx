"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  AlertCircle,
  ArrowLeft,
  Shield,
  Mail,
  Info,
} from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

import { Suspense } from "react";

// Map error codes to user-friendly messages
function mapErrorToMessage(error: string): string {
  const errorMap: Record<string, string> = {
    oauth_denied: "Login dibatalkan. Silakan coba lagi.",
    "oauth_error: access_denied":
      "Akses ditolak. Anda membatalkan login Google.",
    missing_code_or_state: "Terjadi kesalahan teknis. Silakan coba lagi.",
    state_mismatch: "Sesi tidak valid. Silakan refresh halaman dan coba lagi.",
    exchange_failed: "Gagal menghubungkan ke Google. Silakan coba lagi.",
    userinfo_failed: "Gagal mengambil data pengguna. Silakan coba lagi.",
    google_userinfo_invalid:
      "Data akun Google tidak lengkap. Silakan coba akun Google lain.",
    email_domain_not_allowed:
      "Akun tidak diizinkan. Gunakan email domain student.itera.ac.id.",
    user_identity_conflict:
      "Akun Google ini bentrok dengan data akun lama. Hubungi admin untuk sinkronisasi akun.",
    user_upsert_failed: "Gagal menyimpan data pengguna. Silakan coba lagi.",
    token_upsert_failed: "Gagal menyimpan token. Silakan coba lagi.",
    refresh_create_failed: "Gagal membuat sesi. Silakan coba lagi.",
  };

  // Check for oauth_error prefix
  if (error.startsWith("oauth_error:")) {
    const oauthError = errorMap[error];
    if (oauthError) return oauthError;
    return "Terjadi kesalahan saat login dengan Google. Silakan coba lagi.";
  }

  return errorMap[error] || error || "Terjadi kesalahan. Silakan coba lagi.";
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const hasSyncedBackendSession = useRef(false);
  const hasShownSessionExpiredToast = useRef(false);

  // Get error from URL and map to user-friendly messages
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");

    if (errorParam) {
      const decodedError = decodeURIComponent(errorParam);
      // If error is "oauth" and there's a reason, use the reason for better message
      if (decodedError === "oauth" && reasonParam) {
        setError(mapErrorToMessage(reasonParam));
      } else {
        setError(mapErrorToMessage(decodedError));
      }
    } else if (reasonParam && reasonParam !== "session-expired") {
      // Handle reason-only errors
      setError(mapErrorToMessage(reasonParam));
    }
  }, [searchParams]);

  useEffect(() => {
    const reasonParam = searchParams.get("reason");
    if (reasonParam !== "session-expired") return;
    if (hasShownSessionExpiredToast.current) return;
    hasShownSessionExpiredToast.current = true;
    showToast({
      title: "Sesi Anda habis",
      description: "Token sudah tidak valid. Silakan login ulang.",
      variant: "warning",
    });
  }, [searchParams, showToast]);

  useEffect(() => {
    const authParam = searchParams.get("auth");
    if (authParam !== "success") return;
    if (hasSyncedBackendSession.current) return;
    hasSyncedBackendSession.current = true;

    let cancelled = false;

    const syncBackendSession = async () => {
      try {
        const response = await fetch("/api/auth/backend/sync", {
          method: "POST",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          newAssignmentsCount?: number;
          newAssignments?: unknown[];
        };

        if ((payload.newAssignmentsCount ?? 0) > 0) {
          sessionStorage.setItem(
            "resisst.sync.new-assignments",
            JSON.stringify({
              count: payload.newAssignmentsCount ?? 0,
              items: Array.isArray(payload.newAssignments)
                ? payload.newAssignments
                : [],
            }),
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Background sync backend session failed:", err);
        }
      }
    };

    router.replace("/dashboard");
    syncBackendSession();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google/login";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="size-5" />
            <span className="font-semibold text-sm">Kembali</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Logo & Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center size-16 bg-blue-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/20">
              <GraduationCap className="size-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-3">
              Selamat Datang
            </h1>
            <p className="text-slate-500">
              Masuk ke Resisst dengan akun Google ITERA Anda
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </motion.div>
          )}

          {/* Login Card */}
          <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-900/5 border border-slate-100 p-8 md:p-10">
            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full h-14 bg-white border-2 border-slate-200 rounded-2xl font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-3 group mb-6"
            >
              <svg className="size-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Lanjutkan dengan Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Khusus
                </span>
              </div>
            </div>

            {/* Domain Restriction Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <Shield className="size-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-1">
                    Akses Terbatas
                  </h3>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    Hanya email mahasiswa ITERA dengan domain{" "}
                    <strong>@student.itera.ac.id</strong> yang dapat mengakses
                    sistem ini.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center space-y-4">
            <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="size-4" />
                <span>nama@student.itera.ac.id</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="size-4" />
                <span>Staff & Mahasiswa</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Belum punya akses? Hubungi administrator ITERA.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-12 flex items-center justify-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-widest">
              Resisst for ITERA
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="size-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
