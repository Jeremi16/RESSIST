import { useEffect, useRef, useState, Suspense } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, AlertCircle, ArrowLeft, Shield, Mail, Info } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

function mapErrorToMessage(error: string): string {
  const errorMap: Record<string, string> = {
    oauth_denied: "Login dibatalkan. Silakan coba lagi.",
    "oauth_error: access_denied": "Akses ditolak. Anda membatalkan login Google.",
    missing_code_or_state: "Terjadi kesalahan teknis. Silakan coba lagi.",
    state_mismatch: "Sesi tidak valid. Silakan refresh halaman dan coba lagi.",
    exchange_failed: "Gagal menghubungkan ke Google. Silakan coba lagi.",
    userinfo_failed: "Gagal mengambil data pengguna. Silakan coba lagi.",
    google_userinfo_invalid: "Data akun Google tidak lengkap. Silakan coba akun Google lain.",
    email_domain_not_allowed: "Akun tidak diizinkan. Gunakan email domain student.itera.ac.id.",
    user_identity_conflict: "Akun Google ini bentrok dengan data akun lama. Hubungi admin.",
    user_upsert_failed: "Gagal menyimpan data pengguna. Silakan coba lagi.",
    token_upsert_failed: "Gagal menyimpan token. Silakan coba lagi.",
    refresh_create_failed: "Gagal membuat sesi. Silakan coba lagi.",
  };
  if (error.startsWith("oauth_error:")) {
    const oauthError = errorMap[error];
    if (oauthError) return oauthError;
    return "Terjadi kesalahan saat login dengan Google. Silakan coba lagi.";
  }
  return errorMap[error] || error || "Terjadi kesalahan. Silakan coba lagi.";
}

function LoginContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const hasSyncedBackendSession = useRef(false);
  const hasShownSessionExpiredToast = useRef(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");
    if (errorParam) {
      const decodedError = decodeURIComponent(errorParam);
      if (decodedError === "oauth" && reasonParam) setError(mapErrorToMessage(reasonParam));
      else setError(mapErrorToMessage(decodedError));
    } else if (reasonParam && reasonParam !== "session-expired") {
      setError(mapErrorToMessage(reasonParam));
    }
  }, [searchParams]);

  useEffect(() => {
    const reasonParam = searchParams.get("reason");
    if (reasonParam !== "session-expired") return;
    if (hasShownSessionExpiredToast.current) return;
    hasShownSessionExpiredToast.current = true;
    showToast({ title: "Sesi Anda habis", description: "Token sudah tidak valid. Silakan login ulang.", variant: "warning" });
  }, [searchParams, showToast]);

  useEffect(() => {
    const authParam = searchParams.get("auth");
    if (authParam !== "success") return;
    if (hasSyncedBackendSession.current) return;
    hasSyncedBackendSession.current = true;
    let cancelled = false;
    const syncBackendSession = async () => {
      try {
        const response = await fetch("/api/auth/backend/sync", { method: "POST" });
        if (!response.ok) return;
        const payload = (await response.json()) as { newAssignmentsCount?: number; newAssignments?: unknown[] };
        if ((payload.newAssignmentsCount ?? 0) > 0) {
          sessionStorage.setItem("resisst.sync.new-assignments", JSON.stringify({ count: payload.newAssignmentsCount ?? 0, items: Array.isArray(payload.newAssignments) ? payload.newAssignments : [] }));
        }
      } catch (err) { if (!cancelled) console.error(err); }
    };
    const syncAndRedirect = async () => {
      setIsSyncing(true);
      try { await syncBackendSession(); navigate("/dashboard"); } catch { setError("Gagal mensinkronisasi sesi. Silakan coba lagi."); setIsSyncing(false); }
    };
    syncAndRedirect();
    return () => { cancelled = true; };
  }, [navigate, searchParams]);

  const handleGoogleLogin = () => { window.location.href = "/api/auth/google/login"; };

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#F5F0EB]/80 backdrop-blur-sm border-b border-black/5">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-8 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-black/60 hover:text-black transition-colors">
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-black mb-5">
              <GraduationCap className="size-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-black mb-2">Selamat Datang</h1>
            <p className="text-sm text-black/60">Masuk ke Resisst dengan akun Google ITERA Anda</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-white border border-black/5 rounded-2xl flex items-start gap-3">
              <AlertCircle className="size-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-black/70 leading-relaxed">{error}</p>
            </motion.div>
          )}

          <div className="bg-white rounded-2xl border border-black/5 p-6 sm:p-8">
            <button onClick={handleGoogleLogin} className="w-full h-11 bg-white border border-black/10 rounded-full text-sm font-medium text-black hover:bg-black/[0.04] hover:border-black/15 transition-colors flex items-center justify-center gap-3 mb-6">
              <svg className="size-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Lanjutkan dengan Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs font-medium tracking-wide text-black/30">Khusus</span></div>
            </div>

            <div className="bg-[#F5F0EB] border border-black/5 rounded-2xl p-4 flex items-start gap-3">
              <Shield className="size-5 text-black/40 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-black mb-1">Akses Terbatas</h3>
                <p className="text-sm text-black/60 leading-relaxed">Hanya email mahasiswa ITERA dengan domain <strong className="text-black font-medium">@student.itera.ac.id</strong> yang dapat mengakses sistem ini.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-4 text-xs text-black/30">
              <span className="flex items-center gap-1.5"><Mail className="size-3.5" /> nama@student.itera.ac.id</span>
              <span className="flex items-center gap-1.5"><Info className="size-3.5" /> Staff & Mahasiswa</span>
            </div>
            <p className="text-xs text-black/30">Belum punya akses? Hubungi administrator ITERA.</p>
          </div>
        </motion.div>
      </main>

      {isSyncing && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="size-10 border-2 border-black border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-base font-semibold text-black">Menyiapkan Sesi...</h2>
          <p className="text-sm text-black/60 mt-1">Mohon tunggu sebentar.</p>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F0EB] flex items-center justify-center"><div className="size-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
