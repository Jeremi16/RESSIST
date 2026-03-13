"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LMSConfig } from "@/components/dashboard/LMSConfig";
import { TelegramConfig } from "@/components/dashboard/TelegramConfig";
import { GeneralSettings } from "@/components/dashboard/GeneralSettings";
import { EventPreview } from "@/components/EventPreview";
import { TelegramTest } from "@/components/TelegramTest";
import { CalendarView } from "@/components/CalendarView";
import { EventPreview as EventPreviewType } from "@/app/api/test-calendar/route";
import {
  LogOut,
  LayoutDashboard,
  Calendar as CalendarIcon,
  Settings,
  Sparkles,
  User as UserIcon,
  ChevronRight,
  Zap,
  Clock,
  Send,
  GraduationCap,
  RefreshCw,
  Menu,
  X,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  telegram_bot_username: string;
  reminder_hours: string;
  morning_briefing: boolean;
  muted_courses: string;
  created_at: string;
}

type TabType = "overview" | "lms" | "telegram" | "general";
const APP_VERSION = "v0.1.0 Beta";

// Skeleton Components
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-slate-200 rounded", className)} />
  );
}

function StatsCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6">
      <Skeleton className="size-14 rounded-2xl shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="size-6 rounded" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="bg-white p-1 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 pb-4">
        <Skeleton className="h-7 w-32" />
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-6 rounded-3xl border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-lg" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusCardSkeleton() {
  return (
    <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl">
      <Skeleton className="h-6 w-32 mb-8 bg-slate-700" />
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg bg-slate-700" />
              <Skeleton className="h-4 w-24 bg-slate-700" />
            </div>
            <Skeleton className="size-2.5 rounded-full bg-slate-700" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full mt-10 rounded-xl bg-slate-700" />
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<EventPreviewType[]>([]);
  const [previewError, setPreviewError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileSidebarOpen]);

  const fetchUserData = async () => {
    try {
      setIsLoadingUser(true);
      const response = await fetch("/api/user");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      if (response.ok) {
        setUserData(data);
        if (data.moodle_enabled || data.google_classroom_enabled) {
          fetchCalendarPreview();
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const fetchCalendarPreview = async (forceRefresh = false) => {
    setIsLoadingCalendar(true);
    try {
      const response = await fetch(
        `/api/test-calendar${forceRefresh ? "?force=true" : ""}`,
      );
      const data = await response.json();
      if (response.ok) {
        setPreviewEvents(data.events);
        setPreviewError("");
      }
    } catch (error) {
      console.error("Error fetching calendar preview:", error);
      setPreviewError("Gagal memuat data kalender");
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const handleUpdate = async (updateData: any) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      if (response.ok) {
        const updatedUser = await response.json();
        setUserData(updatedUser);
        fetchCalendarPreview();
      }
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLMSSave = async (config: {
    moodle_enabled?: boolean;
    moodle_calendar_url?: string;
    google_classroom_enabled?: boolean;
  }) => {
    await handleUpdate(config);
  };

  const handleTest = async (config: {
    testMoodle?: boolean;
    testGoogle?: boolean;
    moodleUrl?: string;
  }) => {
    setIsTesting(true);
    setPreviewError("");
    try {
      const response = await fetch("/api/test-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moodle_calendar_url: config.moodleUrl,
          test_moodle: config.testMoodle,
          test_google: config.testGoogle,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setPreviewEvents(data.events);
      } else {
        setPreviewError(data.error || "Gagal mengetes koneksi");
      }
    } catch (error) {
      console.error("Error testing calendar:", error);
      setPreviewError("Gagal mengetes koneksi");
    } finally {
      setIsTesting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-100 hidden lg:flex flex-col p-8 z-30">
          <div className="flex items-center gap-3 mb-10">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-2xl" />
            ))}
          </div>
          <div className="mt-auto pt-8">
            <Skeleton className="h-20 w-full rounded-3xl" />
            <Skeleton className="h-12 w-full rounded-2xl mt-4" />
          </div>
        </aside>
        <main className="flex-1 lg:ml-72 min-h-screen p-6 lg:p-12">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96 mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <CalendarSkeleton />
              <TimelineSkeleton />
            </div>
            <div className="lg:col-span-4 space-y-8">
              <StatusCardSkeleton />
              <Skeleton className="h-48 w-full rounded-[2.5rem]" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const TABS = [
    { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
    { id: "lms", label: "Sumber Tugas", icon: GraduationCap },
    { id: "telegram", label: "Telegram Bot", icon: Send },
    { id: "general", label: "Pengaturan", icon: Settings },
  ];

  const activeSources = [
    userData?.moodle_enabled && userData?.moodle_calendar_url,
    userData?.google_classroom_enabled && userData?.google_connected,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="h-16 px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-black rotate-3">
              R
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm sm:text-base font-black tracking-tight text-slate-900">
                Ressist by <span className="font-brand">NODRYX</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                {APP_VERSION}
              </span>
            </div>
          </Link>
          <button
            onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
            className="size-10 rounded-xl border border-slate-200 bg-white text-slate-700 flex items-center justify-center"
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-white border-l border-slate-100 p-6 z-50 lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <Link href="/" className="flex items-center gap-2.5">
                  <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-black rotate-3">
                    R
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm sm:text-base font-black tracking-tight text-slate-900">
                      Ressist by <span className="font-brand">NODRYX</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                      {APP_VERSION}
                    </span>
                  </div>
                </Link>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="size-9 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center"
                  aria-label="Tutup menu"
                >
                  <X className="size-5" />
                </button>
              </div>

              <nav className="space-y-2 flex-1">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as TabType);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                      activeTab === item.id
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 bg-slate-50",
                    )}
                  >
                    <item.icon className="size-5" />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="pt-6 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100"
                >
                  <LogOut className="size-4" />
                  Keluar
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-slate-100 hidden lg:flex flex-col p-8 z-30">
        <Link href="/" className="flex items-center gap-3 mb-10">
          <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-black rotate-3">
            R
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-black tracking-tight text-slate-900">
              Ressist by <span className="font-brand">NODRYX</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
              {APP_VERSION}
            </span>
          </div>
        </Link>

        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all group",
                activeTab === item.id
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={cn(
                    "size-5",
                    activeTab === item.id
                      ? "text-blue-400"
                      : "text-slate-400 group-hover:text-slate-900",
                  )}
                />
                {item.label}
              </div>
              {activeTab === item.id && (
                <ChevronRight className="size-4 text-blue-400" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 mb-6 border border-slate-100">
            <div className="size-10 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
              <UserIcon className="size-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 truncate leading-tight">
                {userData?.name || "Mahasiswa ITERA"}
              </p>
              <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-[0.2em] mt-0.5">
                Free Account
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="size-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 min-h-screen pt-16 lg:pt-0">
        <div className="px-4 sm:px-6 lg:px-12 py-6 sm:py-12 max-w-[1600px] mx-auto">
          <header className="mb-8 sm:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 border-b border-slate-100 pb-6 sm:pb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-4">
                <Sparkles className="size-3 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                  {TABS.find((t) => t.id === activeTab)?.label}
                </span>
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                {activeTab === "overview"
                  ? `Halo, ${userData?.name?.split(" ")[0] || "Teman Resisst"}! 👋`
                  : TABS.find((t) => t.id === activeTab)?.label}
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-slate-500 font-medium mt-3">
                {activeTab === "overview"
                  ? "Pantau tugasmu dari berbagai sumber dalam satu tempat."
                  : "Sesuaikan pengaturan untuk pengalaman terbaik."}
              </p>
            </div>
          </header>

          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-900">
                Telegram Bot belum ready
              </p>
              <p className="text-xs sm:text-sm text-amber-700 font-medium">
                Fitur Telegram masih dalam pengembangan dan akan dirilis
                bertahap di {APP_VERSION}.
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.99, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "overview" && (
                <div className="space-y-6 sm:space-y-8">
                  {/* Main Grid: Resisst v2 Wide Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-6 sm:gap-8">
                    {/* Left Column: Timeline (Primary Focus) */}
                    <div className="lg:col-span-12 xl:col-span-8 space-y-6 sm:space-y-8">
                      {isLoadingCalendar ? (
                        <TimelineSkeleton />
                      ) : (
                        <div className="bg-white p-2 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                          <div className="p-4 sm:p-8 pb-3 sm:pb-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="size-10 sm:size-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
                                <Clock className="size-6" />
                              </div>
                              <h3 className="font-heading text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                                Timeline Tugas
                              </h3>
                            </div>
                            <button
                              onClick={() => fetchCalendarPreview(true)}
                              disabled={isLoadingCalendar}
                              className="shrink-0 flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-2.5 text-[11px] sm:text-sm font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-2xl transition-all disabled:opacity-50"
                            >
                              <RefreshCw
                                className={cn(
                                  "size-4",
                                  isLoadingCalendar && "animate-spin",
                                )}
                              />
                              Refresh
                            </button>
                          </div>
                          <div className="max-h-[1000px] overflow-y-auto custom-scrollbar">
                            <EventPreview
                              events={previewEvents}
                              error={previewError}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column(s): Stats, Calendar & Status */}
                    <div className="lg:col-span-12 xl:col-span-4 space-y-6 sm:space-y-8">
                      {/* Quick Stats - Repositioned from Header */}
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="px-4 sm:px-5 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center gap-3 sm:gap-4 hover:border-blue-200 transition-colors">
                          <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                            <CalendarIcon className="size-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Tugas
                            </p>
                            <p className="text-lg font-black text-slate-900">
                              {previewEvents.length}
                            </p>
                          </div>
                        </div>
                        <div className="px-4 sm:px-5 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex items-center gap-3 sm:gap-4 hover:border-green-200 transition-colors">
                          <div className="size-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                            <Zap className="size-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Bot
                            </p>
                            <p className="text-lg font-black text-slate-900">
                              {userData?.telegram_enabled ? "Aktif" : "Off"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Calendar View */}
                      {isLoadingCalendar ? (
                        <CalendarSkeleton />
                      ) : (
                        <div className="bg-white p-4 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                          <div className="flex items-center justify-between mb-6 sm:mb-8">
                            <h3 className="font-heading text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                              <CalendarIcon className="size-5 text-blue-600" />
                              Kalender
                            </h3>
                            <div className="flex gap-2">
                              {userData?.moodle_enabled && (
                                <div
                                  className="size-2.5 rounded-full bg-orange-500"
                                  title="Moodle"
                                />
                              )}
                              {userData?.google_classroom_enabled && (
                                <div
                                  className="size-2.5 rounded-full bg-green-500"
                                  title="Google"
                                />
                              )}
                            </div>
                          </div>
                          <CalendarView
                            events={
                              previewEvents.length > 0 ? previewEvents : []
                            }
                          />
                        </div>
                      )}

                      {/* Side by Side Status & Test on larger screens if possible, or stacked */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6 sm:gap-8">
                        {/* Status Card */}
                        <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Zap className="size-20" />
                          </div>

                          <h3 className="font-heading text-lg font-black tracking-tight mb-8 relative z-10">
                            Status Koneksi
                          </h3>
                          <ul className="space-y-6 relative z-10">
                            <li className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "size-8 rounded-lg flex items-center justify-center text-xs font-black",
                                    userData?.moodle_enabled
                                      ? "bg-orange-500 text-white"
                                      : "bg-slate-700 text-slate-400",
                                  )}
                                >
                                  M
                                </div>
                                <span className="text-sm font-bold text-slate-300">
                                  Moodle
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "size-3 rounded-full",
                                  userData?.moodle_enabled
                                    ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]"
                                    : "bg-slate-600",
                                )}
                              />
                            </li>
                            <li className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "size-8 rounded-lg flex items-center justify-center text-xs font-black",
                                    userData?.google_classroom_enabled
                                      ? "bg-green-500 text-white"
                                      : "bg-slate-700 text-slate-400",
                                  )}
                                >
                                  G
                                </div>
                                <span className="text-sm font-bold text-slate-300">
                                  Classroom
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "size-3 rounded-full",
                                  userData?.google_classroom_enabled
                                    ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]"
                                    : "bg-slate-600",
                                )}
                              />
                            </li>
                            <li className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="size-8 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                                  <Send className="size-4" />
                                </div>
                                <span className="text-sm font-bold text-slate-300">
                                  Telegram
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "size-3 rounded-full",
                                  userData?.telegram_enabled
                                    ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)]"
                                    : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]",
                                )}
                              />
                            </li>
                          </ul>
                          <button
                            onClick={() => setActiveTab("lms")}
                            className="w-full h-12 bg-white/10 hover:bg-white/20 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest mt-10 transition-all relative z-10 active:scale-95"
                          >
                            Kelola Koneksi
                          </button>
                        </div>

                        {/* Telegram Test */}
                        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                          <TelegramTest chatId={userData?.telegram_chat_id} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(activeTab === "lms" ||
                activeTab === "telegram" ||
                activeTab === "general") && (
                <div className="w-full max-w-3xl">
                  <div className="bg-white p-5 sm:p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    {activeTab === "lms" && (
                      <LMSConfig
                        moodleEnabled={userData?.moodle_enabled || false}
                        moodleUrl={userData?.moodle_calendar_url || ""}
                        googleEnabled={
                          userData?.google_classroom_enabled || false
                        }
                        googleConnected={userData?.google_connected || false}
                        onSave={handleLMSSave}
                        onTest={handleTest}
                        isLoading={isSaving}
                        isTesting={isTesting}
                      />
                    )}
                    {activeTab === "telegram" && (
                      <TelegramConfig
                        chatId={userData?.telegram_chat_id || ""}
                        enabled={userData?.telegram_enabled || false}
                        botUsername={
                          userData?.telegram_bot_username || "resisst_bot"
                        }
                        onSave={handleUpdate}
                        isLoading={isSaving}
                      />
                    )}
                    {activeTab === "general" && (
                      <GeneralSettings
                        reminderHours={JSON.parse(
                          userData?.reminder_hours || "[24]",
                        )}
                        morningBriefing={userData?.morning_briefing || false}
                        mutedCourses={JSON.parse(
                          userData?.muted_courses || "[]",
                        )}
                        availableCourses={Array.from(
                          new Set(
                            previewEvents
                              .map((e) => e.course)
                              .filter(Boolean) as string[],
                          ),
                        )}
                        onSave={handleUpdate}
                        isLoading={isSaving}
                      />
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
