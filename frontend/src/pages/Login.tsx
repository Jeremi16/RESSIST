import { useEffect, useRef, useState, Suspense } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, BookMarked, Clock, GraduationCap, Bell, CalendarDays, CircleCheck, ClipboardList, type LucideIcon } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { apiFetch } from "@/src/lib/api-client";
import { useAuthStatus } from "@/src/hooks/use-auth-status";

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

type Tile = { icon?: LucideIcon; logo?: boolean; tone: "solid" | "soft" | "fade" | "ghost" };

// Kolase ikon ala layar login mobile: grid 4x4 dimiringkan sebagai satu kesatuan
// (bukan per kotak) agar rapi, tidak saling tumpuk, dan ukurannya konsisten.
const TILES: Tile[] = [
  { tone: "ghost" }, { icon: BookMarked, tone: "soft" }, { icon: Clock, tone: "solid" }, { icon: GraduationCap, tone: "soft" },
  { icon: Bell, tone: "soft" }, { logo: true, tone: "soft" }, { icon: CalendarDays, tone: "soft" }, { tone: "solid" },
  { icon: CircleCheck, tone: "fade" }, { icon: ClipboardList, tone: "soft" }, { tone: "ghost" }, { icon: Clock, tone: "soft" },
  { tone: "ghost" }, { tone: "solid" }, { icon: GraduationCap, tone: "soft" }, { tone: "ghost" },
];

const toneClass: Record<Tile["tone"], string> = {
  solid: "bg-[#0059D0] text-white",
  soft: "bg-[#EEF4FD] text-black/70",
  fade: "bg-gradient-to-b from-[#0059D0] to-[#0059D0]/25 text-white",
  ghost: "bg-[#EEF4FD]/50",
};

function IconCollage() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden flex items-center justify-center">
      <div className="grid grid-cols-4 gap-4 lg:gap-6 w-[150%] sm:w-[120%] lg:w-[min(130%,900px)] shrink-0 -rotate-12">
        {TILES.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.03 * i, ease: "easeOut" }}
            className={`aspect-square rounded-[28%] flex items-center justify-center ${toneClass[t.tone]}`}
          >
            {t.logo ? (
              <img src="/logo-mark.png" alt="" className="w-[58%] rotate-12" />
            ) : t.icon ? (
              <t.icon className="w-[30%] h-[30%] rotate-12" strokeWidth={1.75} />
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function LoginContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const authStatus = useAuthStatus();
  const hasSyncedBackendSession = useRef(false);
  const hasShownSessionExpiredToast = useRef(false);

  // Sudah login? Lewati OAuth — langsung ke dashboard.
  // Dikecualikan ?auth=success (baru selesai OAuth, sesi dibuat di bawah).
  useEffect(() => {
    if (searchParams.get("auth") === "success") return;
    // Baru saja dinyatakan sesi habis: jangan pantulkan balik ke dashboard
    // (status cookie bisa basi) — cegah loop login <-> dashboard.
    if (searchParams.get("reason") === "session-expired") return;
    if (authStatus === "authed") navigate("/dashboard", { replace: true });
  }, [authStatus, navigate, searchParams]);

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
    // Session-sync cepat (wajib, di-await) lalu langsung ke dashboard.
    // LMS sync berat jalan background tanpa blocking; hasilnya disiarkan via
    // event + sessionStorage agar Dashboard bisa menampilkan toast belakangan.
    const syncLmsInBackground = () => {
      apiFetch("/api/auth/backend/sync-lms", { method: "POST" })
        .then(async (res) => {
          if (!res.ok) return;
          const payload = (await res.json().catch(() => ({}))) as { newAssignmentsCount?: number; newAssignments?: unknown[] };
          const count = payload.newAssignmentsCount ?? 0;
          if (count <= 0) return;
          try {
            sessionStorage.setItem("ressist.sync.new-assignments", JSON.stringify({ count, items: Array.isArray(payload.newAssignments) ? payload.newAssignments : [] }));
          } catch {
            // ignore
          }
          window.dispatchEvent(new CustomEvent("ressist:new-assignments", { detail: { count } }));
        })
        .catch(() => {
          // silent — Dashboard fetch + tombol Sinkronkan meng-cover
        });
    };
    const syncAndRedirect = async () => {
      try {
        const response = await apiFetch("/api/auth/backend/sync", { method: "POST" });
        if (!response.ok) {
          setError("Gagal mensinkronisasi sesi. Silakan coba lagi.");
          hasSyncedBackendSession.current = false;
          return;
        }
      } catch {
        setError("Gagal mensinkronisasi sesi. Silakan coba lagi.");
        hasSyncedBackendSession.current = false;
        return;
      }
      syncLmsInBackground();
      navigate("/dashboard");
    };
    syncAndRedirect();
  }, [navigate, searchParams]);

  const handleGoogleLogin = async () => {
    // Cek ulang sebelum redirect: sesi mungkin sudah ada (mis. login di tab lain).
    if (authStatus === "authed") {
      navigate("/dashboard", { replace: true });
      return;
    }
    window.location.href = "/api/auth/google/login";
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <div className="relative h-[46vh] lg:h-auto lg:flex-1 lg:order-2 bg-white overflow-hidden">
        <IconCollage />
        <Link to="/" className="lg:hidden absolute top-5 left-5 z-10 flex items-center gap-1 bg-white/90 backdrop-blur px-3 py-2 rounded-full font-display text-[13px] text-black/70">
          <ArrowLeft className="size-4" />
          Kembali
        </Link>
      </div>

      <main className="relative flex-1 lg:max-w-[520px] flex items-center justify-center px-6 py-10 lg:px-16">
        <Link to="/" className="absolute top-6 left-6 lg:left-16 hidden lg:flex items-center gap-1 font-display text-[13px] text-black/60 hover:text-[#0059D0] transition-colors">
          <ArrowLeft className="size-4" />
          Kembali
        </Link>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }} className="w-full max-w-sm text-center lg:text-left">
          <img src="/logo-mark.png" alt="Ressist" className="hidden lg:block size-12 mb-8" />
          <h1 className="font-display text-4xl font-bold tracking-tight leading-tight mb-4">
            Selamat Datang<br />di Ressist
          </h1>
          <p className="font-serif text-black/60 leading-relaxed mb-10">
            Asisten tugas &amp; jadwal kuliah mahasiswa ITERA — masuk dengan akun Google kampusmu.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-[#F5F5F5] rounded-2xl flex items-start gap-3 text-left">
              <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <p className="font-serif text-sm text-black/80 leading-relaxed">{error}</p>
            </div>
          )}

          <button onClick={handleGoogleLogin} disabled={authStatus === "checking"} className="w-full h-14 rounded-full bg-[#0059D0] text-white font-display text-sm font-medium hover:bg-[#0043A5] transition-colors flex items-center justify-center gap-3 disabled:opacity-60">
            {authStatus === "checking" ? (
              <>
                <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memeriksa sesi…
              </>
            ) : (
              <>
                <span className="font-bold">G</span>
                Lanjutkan dengan Google
              </>
            )}
          </button>
        </motion.div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="size-8 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
