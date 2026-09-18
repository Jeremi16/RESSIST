import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InfoLayout } from "@/components/InfoLayout";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  ArrowRight,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/src/lib/api-client";
import { invalidateAuthStatus } from "@/src/hooks/use-auth-status";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  whatsapp_number: string | null;
  whatsapp_enabled: boolean;
  telegram_chat_id: string | null;
  telegram_enabled: boolean;
  moodle_enabled: boolean;
  moodle_calendar_url: string | null;
  google_classroom_enabled: boolean;
  google_connected: boolean;
  created_at: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await apiFetch("/api/user");
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else if (response.status === 401) {
          try {
            await apiFetch("/api/auth/logout", { method: "POST" });
          } catch (e) {
            console.error("Auto-logout failed:", e);
          }
          invalidateAuthStatus();
          navigate("/login?reason=session-expired", { replace: true });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="size-12 border-4 border-[#0059D0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const connections = [
    {
      name: "Moodle ITERA",
      enabled: userData?.moodle_enabled && !!userData?.moodle_calendar_url,
      icon: GraduationCap,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      name: "Google Classroom",
      enabled: userData?.google_classroom_enabled && userData?.google_connected,
      icon: Mail,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      name: "WhatsApp",
      enabled: !!userData?.whatsapp_number && userData?.whatsapp_enabled,
      icon: MessageSquare,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      name: "Telegram",
      enabled: !!userData?.telegram_chat_id && userData?.telegram_enabled,
      icon: Shield,
      color: "text-[#0059D0]",
      bg: "bg-[#60A8F8]/10",
    },
  ];

  return (
    <InfoLayout
      title="Profil Saya"
      subtitle="Kelola informasi akun dan pantau status koneksi layanan akademik Anda."
      category="Akun Saya"
    >
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#60A8F8]/20 rounded-bl-[5rem] -mr-8 -mt-8 grayscale group-hover:grayscale-0 transition-all duration-700 opacity-50" />

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="size-24 bg-[#0059D0] rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl shadow-[#0059D0]/20 rotate-3 group-hover:rotate-0 transition-transform">
              {userData?.name?.charAt(0) ||
                userData?.email.charAt(0).toUpperCase() ||
                "U"}
            </div>
            <div className="text-center md:text-left space-y-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {userData?.name || "Mahasiswa ITERA"}
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <Mail className="size-4" />
                  {userData?.email}
                </div>
                <div className="px-3 py-1 bg-[#60A8F8]/10 text-[#0059D0] rounded-full text-xs font-bold border border-[#60A8F8]/30 uppercase tracking-widest">
                  Itera Students
                </div>
              </div>
            </div>
            <div className="md:ml-auto">
              <button
                onClick={() => navigate("/dashboard?tab=general")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0059D0] text-white rounded-2xl font-bold hover:bg-[#60A8F8] transition-all active:scale-95"
              >
                <Settings className="size-4" />
                Edit Profil
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Account Status */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-black text-slate-900 pl-2">
              Informasi Akun
            </h3>
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="size-10 bg-white rounded-xl flex items-center justify-center text-slate-400">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Berabung Sejak
                    </p>
                    <p className="font-bold text-slate-900">
                      {userData
                        ? new Date(userData.created_at).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "long", year: "numeric" },
                          )
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="size-10 bg-white rounded-xl flex items-center justify-center text-slate-400">
                    <Shield className="size-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Verifikasi
                    </p>
                    <p className="font-bold text-slate-900">
                      Siakad Cloud Sync
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase">
                  <CheckCircle2 className="size-3" /> Aktif
                </div>
              </div>
            </div>
          </motion.div>

          {/* Connections Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-black text-slate-900 pl-2">
              Status Layanan
            </h3>
            <div className="bg-white border border-slate-100 rounded-[2rem] p-4 space-y-3 shadow-sm">
              {connections.map((conn, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-[#60A8F8]/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "size-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform",
                        conn.bg,
                        conn.color,
                      )}
                    >
                      <conn.icon className="size-5" />
                    </div>
                    <span className="font-bold text-slate-700">
                      {conn.name}
                    </span>
                  </div>
                  {conn.enabled ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Tersambung
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Tidk Aktif
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Action Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0059D0] rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden group shadow-2xl shadow-[#0059D0]/20"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-1000" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left space-y-4">
              <h3 className="text-3xl font-black tracking-tight">
                Ingin mengubah pengaturan?
              </h3>
              <p className="text-[#DCE9FD] font-medium max-w-sm">
                Kunjungi dashboard untuk mengatur notifikasi WhatsApp, Telegram,
                atau sinkronisasi Moodle.
              </p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-white text-[#0059D0] px-8 py-4 rounded-2xl font-black text-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-2"
            >
              Ke Dashboard
              <ArrowRight className="size-5" />
            </button>
          </div>
        </motion.div>

        {/* Security Note */}
        <div className="flex items-center justify-center gap-3 text-slate-400 pt-8 border-t border-slate-100">
          <AlertCircle className="size-4" />
          <p className="text-xs font-bold uppercase tracking-widest">
            Data Anda aman dengan enkripsi AES-256 dan protokol OAuth 2.0
          </p>
        </div>
      </div>
    </InfoLayout>
  );
}
