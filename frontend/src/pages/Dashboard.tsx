import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LMSConfig } from "@/components/dashboard/LMSConfig";
import { TelegramConfig } from "@/components/dashboard/TelegramConfig";
import { TaskStats } from "@/components/dashboard/TaskStats";
import { GeneralSettings } from "@/components/dashboard/GeneralSettings";
import { EventPreview } from "@/components/EventPreview";
import { TelegramVerify } from "@/components/TelegramVerify";
import { CalendarView } from "@/components/CalendarView";
import { WhatsAppConfig } from "@/components/dashboard/WhatsAppConfig";
import { OverdueTasksPopup } from "@/components/dashboard/OverdueTasksPopup";
import type { EventPreview as EventPreviewType } from "@/src/lib/api-types";
import {
  LogOut,
  LayoutDashboard,
  User as UserIcon,
  ChevronRight,
  Clock,
  Send,
  GraduationCap,
  BookOpen,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  ListTodo,
  Bell,
  MoreHorizontal,
  KeyRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-provider";
import { ProfileSettings } from "@/components/dashboard/ProfileSettings";
import { ClassSettings } from "@/components/dashboard/ClassSettings";
import { TimelineFilter } from "@/components/dashboard/TimelineFilter";
import { ApiKeysSettings } from "@/components/dashboard/ApiKeysSettings";

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
  class_code: string | null;
  available_class_codes: string;
  course_aliases: string | Record<string, string>;
  created_at: string;
}

type TabType =
  | "overview"
  | "tugas"
  | "kelas"
  | "lms"
  | "notifikasi"
  | "profile"
  | "api"
  | "lainnya";
const APP_VERSION = "v0.8.7";

// Skeleton Components
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-black/5 rounded", className)} />;
}

function StatsCardSkeleton() {
  return (
    <div className="bg-white p-4 rounded-2xl border border-black/5 flex items-center gap-4">
      <Skeleton className="size-10 rounded-xl shrink-0" />
      <div className="space-y-2 flex-1 min-w-0">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-black/5">
      <div className="flex items-center justify-between gap-4 mb-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-full rounded-xl" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="bg-white p-4 rounded-2xl border border-black/5 space-y-3">
      <Skeleton className="h-5 w-24" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl border border-black/5 flex justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function StatusCardSkeleton() {
  return (
    <div className="bg-black p-6 rounded-2xl">
      <Skeleton className="h-5 w-28 mb-6 bg-white/10" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg bg-white/10 shrink-0" />
              <Skeleton className="h-3 w-16 bg-white/10" />
            </div>
            <Skeleton className="size-2 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-full mt-6 rounded-full bg-white/10" />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<EventPreviewType[]>([]);
  const [availableCourses, setAvailableCourses] = useState<
    { id: string; name: string }[]
  >([]);
  const [previewError, setPreviewError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [sortOrder, setSortOrder] = useState<string>("deadline_asc");
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [showOverduePopup, setShowOverduePopup] = useState(true);
  const hasFetchedInitialUserData = useRef(false);

  const redirectToLogin = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Auto-logout failed:", e);
    }
    navigate("/login?reason=session-expired", { replace: true });
  };

  useEffect(() => {
    if (hasFetchedInitialUserData.current) return;
    hasFetchedInitialUserData.current = true;
    fetchUserData();
    fetchCourses();
    fetchAssignments();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.status === 401) {
        // Silent fail - fetchUserData will handle redirect
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setAvailableCourses(data.courses || []);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchUserData = async () => {
    try {
      setIsLoadingUser(true);
      const response = await fetch("/api/user");
      if (response.status === 401) {
        await redirectToLogin();
        return;
      }
      const data = await response.json();
      if (response.ok) {
        setUserData(data);
        if (data.moodle_enabled || data.google_classroom_enabled) {
          fetchCalendarPreview(false, sortOrder);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const fetchCalendarPreview = async (
    forceRefresh = false,
    sort = sortOrder,
  ) => {
    setIsLoadingCalendar(true);
    try {
      const query = new URLSearchParams();
      if (forceRefresh) query.append("force", "true");
      if (sort) query.append("sort", sort);

      const response = await fetch(`/api/test-calendar?${query.toString()}`);
      if (response.status === 401) {
        await redirectToLogin();
        return;
      }
      const data = await response.json();
      if (response.ok) {
        setPreviewEvents(data.events);
        setPreviewError("");
        if (forceRefresh && data.new_tasks_count && data.new_tasks_count > 0) {
          showToast({
            title: "Tugas Baru Ditemukan!",
            description: `${data.new_tasks_count} tugas baru berhasil disinkronisasi.`,
            variant: "success",
          });
        } else if (forceRefresh) {
          showToast({
            title: "Sinkronisasi Selesai",
            description: "Tidak ada tugas baru saat ini.",
            variant: "info",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching calendar preview:", error);
      setPreviewError("Gagal memuat data kalender");
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const fetchAssignments = async () => {
    setIsLoadingAssignments(true);
    try {
      const response = await fetch("/api/assignments");
      if (response.ok) {
        const data = await response.json();
        setAllAssignments(Array.isArray(data) ? data : data.assignments || []);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const markAssignmentComplete = async (assignmentId: string) => {
    try {
      const response = await fetch("/api/assignments/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: assignmentId }),
      });
      if (response.ok) {
        // Optimistic update for both assignments list and calendar
        setAllAssignments((prev) =>
          prev.map((task) =>
            task.id === assignmentId ? { ...task, completed: true } : task,
          ),
        );
        setPreviewEvents((prev) =>
          prev.map((ev: any) =>
            ev.id === assignmentId ? { ...ev, completed: true } : ev,
          ),
        );
        showToast({
          title: "Tugas Selesai!",
          description: "Tugas telah ditandai sebagai selesai.",
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Error marking assignment complete:", error);
    }
  };

  const handleSortChange = (newSort: string) => {
    setSortOrder(newSort);
    fetchCalendarPreview(false, newSort);
  };

  const handleUpdate = async (updateData: any) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.status === 401) {
        await redirectToLogin();
        return;
      }

      let responseBody: any = null;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      if (response.ok) {
        setUserData(responseBody);
        fetchCalendarPreview(false, sortOrder);
        return;
      }

      const backendMessage =
        responseBody?.error ||
        responseBody?.message ||
        "Gagal menyimpan perubahan profil.";

      console.error("Profile update failed", {
        status: response.status,
        statusText: response.statusText,
        requestPayload: updateData,
        responseBody,
      });

      showToast({
        title: "Gagal menyimpan pengaturan",
        description: `${backendMessage} (HTTP ${response.status})`,
        variant: "error",
      });
    } catch (error) {
      console.error("Error updating user:", error);
      showToast({
        title: "Gagal menyimpan pengaturan",
        description:
          "Terjadi gangguan jaringan atau server. Coba lagi beberapa saat.",
        variant: "error",
      });
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
      if (response.status === 401) {
        await redirectToLogin();
        return;
      }
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
    navigate("/login", { replace: true });
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#F5F0EB] flex">
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-black/5 hidden lg:flex flex-col p-6 z-30">
          <div className="flex items-center gap-2.5 mb-8">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-xl" />
            ))}
          </div>
          <div className="mt-auto pt-6 border-t border-black/5">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </aside>
        <main className="flex-1 lg:ml-64 min-h-screen p-4 sm:p-6 lg:p-8 pt-14 pb-24 lg:pt-8 lg:pb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-80 mb-8" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 space-y-6">
              <CalendarSkeleton />
            </div>
            <div className="xl:col-span-4 space-y-6">
              <StatusCardSkeleton />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          </div>
        </main>
        {/* Mobile Bottom Bar Skeleton - 4 primary + Lainnya */}
        <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-black/5 px-1 pt-2 pb-3 flex items-center justify-around">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1 px-1">
              <Skeleton className="size-7 rounded-xl" />
              <Skeleton className="h-2 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const TABS = [
    { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
    { id: "profile", label: "Profil", icon: UserIcon },
    { id: "tugas", label: "Tugas", icon: ListTodo },
    { id: "kelas", label: "Kelas", icon: GraduationCap },
    { id: "lms", label: "LMS", icon: BookOpen },
    { id: "notifikasi", label: "Bot & Notifikasi", icon: Bell },
    { id: "api", label: "API Keys", icon: KeyRound },
  ];

  const activeSources = [
    userData?.moodle_enabled && userData?.moodle_calendar_url,
    userData?.google_classroom_enabled && userData?.google_connected,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#F5F0EB] flex">
      {/* Mobile Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-30 lg:hidden bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="h-14 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 bg-black rounded-lg flex items-center justify-center text-white text-sm font-bold">
              R
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-black">Resisst</span>
          </Link>
          <button
            onClick={handleLogout}
            className="size-8 rounded-full bg-black text-white flex items-center justify-center"
            aria-label="Keluar"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Bar - 4 primary + Lainnya (halaman, bukan sheet) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-black/5 px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center">
        {(() => {
          const primaryIds: TabType[] = ["overview", "tugas", "lms", "profile"];
          const primaryTabs = primaryIds.map((id) => TABS.find((t) => t.id === id)!).filter(Boolean);
          const lainnyaIds: TabType[] = ["kelas", "notifikasi", "api", "lainnya"];
          const isLainnyaActive = lainnyaIds.includes(activeTab);
          return (
            <>
              {primaryTabs.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabType)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 flex-1 min-w-0 px-1 py-1 rounded-xl transition-colors",
                      isActive ? "text-black" : "text-black/40",
                    )}
                  >
                    <div
                      className={cn(
                        "size-7 rounded-xl flex items-center justify-center transition-colors",
                        isActive ? "bg-black text-white" : "bg-transparent",
                      )}
                    >
                      <item.icon className="size-4" />
                    </div>
                    <span className="text-[10px] font-medium leading-none truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setActiveTab("lainnya")}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 min-w-0 px-1 py-1 rounded-xl transition-colors",
                  isLainnyaActive ? "text-black" : "text-black/40",
                )}
              >
                <div className={cn("size-7 rounded-xl flex items-center justify-center transition-colors", isLainnyaActive ? "bg-black text-white" : "bg-black/5 text-black/40")}>
                  <MoreHorizontal className="size-4" />
                </div>
                <span className="text-[10px] font-medium leading-none truncate max-w-full">Lainnya</span>
              </button>
            </>
          );
        })()}
      </nav>

      {/* Overdue Tasks Popup */}
      <AnimatePresence>
        {showOverduePopup &&
          allAssignments.filter(
            (t) => !t.completed && new Date(t.deadline) < new Date(),
          ).length > 0 && (
            <OverdueTasksPopup
              tasks={allAssignments.filter(
                (t) => !t.completed && new Date(t.deadline) < new Date(),
              )}
              onMarkComplete={markAssignmentComplete}
              onClose={() => setShowOverduePopup(false)}
            />
          )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-black/5 hidden lg:flex flex-col p-6 z-30">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="size-8 bg-black rounded-lg flex items-center justify-center text-white text-sm font-bold">R</div>
          <span className="text-[15px] font-semibold tracking-tight text-black">Resisst</span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", activeTab === item.id ? "bg-black text-white" : "text-black/60 hover:bg-black/[0.04] hover:text-black")}
            >
              <div className="flex items-center gap-3">
                <item.icon className="size-4.5" />
                {item.label}
              </div>
              {activeTab === item.id && <ChevronRight className="size-4 text-white/60" />}
            </button>
          ))}
        </nav>

        <div className="mt-6 pt-6 border-t border-black/5">
          <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-black/60 hover:bg-black/[0.04] transition-colors">
            <LogOut className="size-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen pt-14 pb-24 lg:pt-0 lg:pb-0">
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
          <header className="mb-6 flex items-center justify-between gap-4 border-b border-black/5 pb-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-black">
                {activeTab === "overview"
                  ? `Welcome back, ${userData?.name?.split(" ")[0] || "there"}`
                  : activeTab === "lainnya"
                    ? "Lainnya"
                    : TABS.find((t) => t.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-black/60 mt-1">
                {activeTab === "overview" ? "Here's a quick overview of your workspace today." : "Sesuaikan pengaturan untuk pengalaman terbaik."}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-black/40 hidden lg:inline">Today</span>
              <div className="h-8 px-3 rounded-full bg-white border border-black/5 text-xs font-medium text-black/60 flex items-center">Today</div>
            </div>
          </header>

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
                  {/* Task Statistics - Full Width */}
                  <TaskStats
                    overdueCount={
                      allAssignments.filter(
                        (t) =>
                          !t.completed && new Date(t.deadline) < new Date(),
                      ).length
                    }
                    upcomingCount={
                      allAssignments.filter(
                        (t) =>
                          !t.completed && new Date(t.deadline) >= new Date(),
                      ).length
                    }
                    completedCount={
                      allAssignments.filter((t) => t.completed).length
                    }
                    totalCount={allAssignments.length}
                  />

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8 space-y-4">
                      <div className="bg-white rounded-2xl border border-black/5 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-black">Kalender</h3>
                          <span className="text-xs text-black/40">View tasks and project deadlines</span>
                        </div>
                        <CalendarView events={previewEvents.length > 0 ? previewEvents : []} />
                      </div>
                    </div>

                    <div className="xl:col-span-4 space-y-4">
                      <div className="bg-black text-white rounded-2xl p-6">
                        <h3 className="text-sm font-semibold mb-6">Status Koneksi</h3>
                        <ul className="space-y-4">
                          <li className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("size-8 rounded-lg flex items-center justify-center text-xs font-medium", userData?.moodle_enabled ? "bg-white text-black" : "bg-white/10 text-white/40")}>M</div>
                              <span className="text-sm text-white/80">Moodle</span>
                            </div>
                            <div className={cn("size-2 rounded-full", userData?.moodle_enabled ? "bg-emerald-500" : "bg-white/20")} />
                          </li>
                          <li className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("size-8 rounded-lg flex items-center justify-center text-xs font-medium", userData?.google_classroom_enabled ? "bg-white text-black" : "bg-white/10 text-white/40")}>G</div>
                              <span className="text-sm text-white/80">Classroom</span>
                            </div>
                            <div className={cn("size-2 rounded-full", userData?.google_classroom_enabled ? "bg-emerald-500" : "bg-white/20")} />
                          </li>
                          <li className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="size-8 bg-white text-black rounded-lg flex items-center justify-center"><Send className="size-4" /></div>
                              <span className="text-sm text-white/80">Bot</span>
                            </div>
                            <div className={cn("size-2 rounded-full", userData?.telegram_enabled ? "bg-emerald-500" : "bg-red-500")} />
                          </li>
                          <li className="flex items-center justify-between opacity-60">
                            <div className="flex items-center gap-3">
                              <div className="size-8 bg-white/10 text-white/60 rounded-lg flex items-center justify-center"><MessageSquare className="size-4" /></div>
                              <span className="text-sm text-white/60">WhatsApp</span>
                            </div>
                            <span className="text-xs text-white/30">Soon</span>
                          </li>
                        </ul>
                        <button onClick={() => setActiveTab("lms")} className="w-full h-9 bg-white text-black rounded-full text-sm font-medium mt-6 hover:bg-white/90 transition-colors">Kelola Koneksi</button>
                      </div>

                      <div className="bg-white rounded-2xl border border-black/5 p-5">
                        <TelegramVerify chatId={userData?.telegram_chat_id} botUsername={userData?.telegram_bot_username} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tugas" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-black">Timeline Tugas</h3>
                      <p className="text-sm text-black/60 mt-1">Daftar tugas dalam tiga kelompok.</p>
                    </div>
                    <button onClick={fetchAssignments} disabled={isLoadingAssignments} className="h-9 px-5 bg-black text-white rounded-full text-sm font-medium inline-flex items-center gap-2 hover:bg-black/90 disabled:opacity-50 transition-colors">
                      <RefreshCw className={cn("size-4", isLoadingAssignments && "animate-spin")} />
                      {isLoadingAssignments ? "Menyinkronkan..." : "Sinkronkan"}
                    </button>
                  </div>

                  {isLoadingAssignments && allAssignments.length === 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <TimelineSkeleton />
                      <TimelineSkeleton />
                      <TimelineSkeleton />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <div className="size-7 bg-black text-white rounded-lg flex items-center justify-center"><AlertTriangle className="size-3.5" /></div>
                            <h4 className="text-sm font-semibold text-black">Terlewat</h4>
                          </div>
                          <span className="text-xs font-medium px-2 py-1 bg-black text-white rounded-full">{allAssignments.filter((t) => !t.completed && new Date(t.deadline) < new Date()).length}</span>
                        </div>
                        <div className="space-y-3">
                          {allAssignments.filter((t) => !t.completed && new Date(t.deadline) < new Date()).length === 0 ? <EmptyTasksState message="Tidak ada tugas terlewat" /> : allAssignments.filter((t) => !t.completed && new Date(t.deadline) < new Date()).map((task) => <TaskCard key={task.id} task={task} onComplete={markAssignmentComplete} />)}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <div className="size-7 bg-black text-white rounded-lg flex items-center justify-center"><Clock className="size-3.5" /></div>
                            <h4 className="text-sm font-semibold text-black">Mendatang</h4>
                          </div>
                          <span className="text-xs font-medium px-2 py-1 bg-black text-white rounded-full">{allAssignments.filter((t) => !t.completed && new Date(t.deadline) >= new Date()).length}</span>
                        </div>
                        <div className="space-y-3">
                          {allAssignments.filter((t) => !t.completed && new Date(t.deadline) >= new Date()).length === 0 ? <EmptyTasksState message="Tidak ada tugas mendatang" /> : allAssignments.filter((t) => !t.completed && new Date(t.deadline) >= new Date()).map((task) => <TaskCard key={task.id} task={task} onComplete={markAssignmentComplete} />)}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <div className="size-7 bg-black text-white rounded-lg flex items-center justify-center"><CheckCircle2 className="size-3.5" /></div>
                            <h4 className="text-sm font-semibold text-black">Selesai</h4>
                          </div>
                          <span className="text-xs font-medium px-2 py-1 bg-black text-white rounded-full">{allAssignments.filter((t) => t.completed).length}</span>
                        </div>
                        <div className="space-y-3">
                          {allAssignments.filter((t) => t.completed).length === 0 ? <EmptyTasksState message="Belum ada tugas selesai" /> : allAssignments.filter((t) => t.completed).map((task) => <TaskCard key={task.id} task={task} onComplete={markAssignmentComplete} />)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "lainnya" && (
                <div className="w-full">
                  <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
                    <div className="divide-y divide-black/5">
                      <button
                        onClick={() => setActiveTab("kelas")}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-black/[0.02] transition-colors"
                      >
                        <GraduationCap className="size-5 text-black/70 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black">Kelas</p>
                          <p className="text-xs text-black/40 mt-0.5">Kelola kelas & mata kuliah</p>
                        </div>
                        <ChevronRight className="size-4 text-black/20 shrink-0" />
                      </button>
                      <button
                        onClick={() => setActiveTab("notifikasi")}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-black/[0.02] transition-colors"
                      >
                        <Bell className="size-5 text-black/70 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black">Bot & Notifikasi</p>
                          <p className="text-xs text-black/40 mt-0.5">Telegram & pengaturan pengingat</p>
                        </div>
                        <ChevronRight className="size-4 text-black/20 shrink-0" />
                      </button>
                      <button
                        onClick={() => setActiveTab("api")}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-black/[0.02] transition-colors"
                      >
                        <KeyRound className="size-5 text-black/70 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black">API Keys</p>
                          <p className="text-xs text-black/40 mt-0.5">Akses tugas via script / curl</p>
                        </div>
                        <ChevronRight className="size-4 text-black/20 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

                    {(activeTab === "kelas" ||
                activeTab === "lms" ||
                activeTab === "notifikasi" ||
                activeTab === "tugas" ||
                activeTab === "profile" ||
                activeTab === "api") && (
                <div className="w-full">
                    {(activeTab === "kelas" || activeTab === "notifikasi" || activeTab === "api") && (
                    <button
                      onClick={() => setActiveTab("lainnya")}
                      className="lg:hidden flex items-center gap-1.5 text-sm text-black/60 mb-3 px-1"
                    >
                      <ChevronRight className="size-4 rotate-180" />
                      Kembali ke Lainnya
                    </button>
                  )}
                  <div className="bg-white p-6 rounded-2xl border border-black/5">
                    {activeTab === "kelas" && (
                      <ClassSettings
                        classCode={userData?.class_code}
                        availableClassCodes={(() => {
                          try {
                            return JSON.parse(
                              userData?.available_class_codes || "[]",
                            );
                          } catch {
                            return [];
                          }
                        })()}
                        availableCourses={availableCourses}
                        mutedCourses={(() => {
                          try {
                            const parsed = JSON.parse(
                              userData?.muted_courses || "[]",
                            );
                            return Array.isArray(parsed) ? parsed : [];
                          } catch {
                            return [];
                          }
                        })()}
                        courseAliases={
                          userData?.course_aliases
                            ? (() => {
                                const raw = userData.course_aliases;
                                if (typeof raw === "string") {
                                  try {
                                    const parsed = JSON.parse(raw);
                                    return parsed &&
                                      typeof parsed === "object" &&
                                      !Array.isArray(parsed)
                                      ? parsed
                                      : {};
                                  } catch {
                                    return {};
                                  }
                                }
                                return raw &&
                                  typeof raw === "object" &&
                                  !Array.isArray(raw)
                                  ? raw
                                  : {};
                              })()
                            : {}
                        }
                        onSave={handleUpdate}
                        isLoading={isSaving}
                      />
                    )}
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
                    {activeTab === "notifikasi" && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 xl:gap-16">
                          <TelegramConfig
                            chatId={userData?.telegram_chat_id || ""}
                            enabled={userData?.telegram_enabled || false}
                            botUsername={
                              userData?.telegram_bot_username || "resisst_bot"
                            }
                            onSave={handleUpdate}
                            isLoading={isSaving}
                          />
                          <div className="xl:border-l xl:border-slate-100 xl:pl-16">
                            <WhatsAppConfig />
                          </div>
                        </div>
                        <div className="h-px bg-black/5" />
                        <div>
                          <h3 className="text-sm font-semibold text-black mb-4 flex items-center gap-2">
                            <Bell className="size-4" />
                            Pengaturan Notifikasi
                          </h3>
                          <GeneralSettings
                            reminderHours={(() => {
                              try {
                                const parsed = JSON.parse(
                                  userData?.reminder_hours || "[24]",
                                );
                                return Array.isArray(parsed) ? parsed : [24];
                              } catch {
                                return [24];
                              }
                            })()}
                            morningBriefing={userData?.morning_briefing || false}
                            mutedCourses={(() => {
                              try {
                                const parsed = JSON.parse(
                                  userData?.muted_courses || "[]",
                                );
                                return Array.isArray(parsed) ? parsed : [];
                              } catch {
                                return [];
                              }
                            })()}
                            availableCourses={availableCourses}
                            telegramConnected={!!userData?.telegram_chat_id}
                            telegramEnabled={userData?.telegram_enabled || false}
                            onSave={handleUpdate}
                            isLoading={isSaving}
                          />
                        </div>
                      </div>
                    )}
                    {activeTab === "profile" && userData && (
                      <ProfileSettings
                        userData={userData}
                        onSave={handleUpdate}
                        isLoading={isSaving}
                      />
                    )}
                    {activeTab === "api" && <ApiKeysSettings />}
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

function EmptyTasksState({ message }: { message: string }) {
  return (
    <div className="p-6 text-center bg-white rounded-2xl border border-black/5 border-dashed">
      <p className="text-sm text-black/40">{message}</p>
    </div>
  );
}

function TaskCard({
  task,
  onComplete,
}: {
  task: any;
  onComplete: (id: string) => void;
}) {
  const isOverdue = !task.completed && new Date(task.deadline) < new Date();
  const isSelesai = task.completed;

  return (
    <div className={cn("bg-white p-4 rounded-2xl border border-black/5", isSelesai && "opacity-60")}>
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <h5 className={cn("text-sm font-medium text-black leading-tight line-clamp-2", isSelesai && "line-through text-black/40")}>{task.title}</h5>
            <span className="inline-flex text-xs text-black/40 bg-[#F5F0EB] px-2 py-1 rounded-full truncate max-w-full">{task.course}</span>
          </div>
          {!isSelesai ? (
            <button onClick={() => onComplete(task.id)} className="size-8 bg-black text-white rounded-full flex items-center justify-center shrink-0 hover:bg-black/90 transition-colors" title="Tandai Selesai">
              <CheckCircle2 className="size-4" />
            </button>
          ) : (
            <div className="size-8 bg-black/10 text-black/40 rounded-full flex items-center justify-center shrink-0"><CheckCircle2 className="size-4" /></div>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-black/5">
          <span className={cn("text-xs", isOverdue ? "text-red-500 font-medium" : "text-black/40")}>
            {new Date(task.deadline).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WIB
          </span>
          {task.url && <a href={task.url} target="_blank" className="text-xs font-medium text-black hover:text-black/60 transition-colors">Link →</a>}
        </div>
      </div>
    </div>
  );
}
