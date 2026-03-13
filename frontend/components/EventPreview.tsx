"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { EventPreview as EventPreviewType } from "@/app/api/test-calendar/route";
import { cn } from "@/lib/utils";

interface EventPreviewProps {
  events: EventPreviewType[];
  error?: string;
}

export function EventPreview({ events, error }: EventPreviewProps) {
  if (error) {
    return (
      <div className="p-5 sm:p-8 text-center bg-red-50/50 rounded-[2rem] border border-red-100">
        <div className="size-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="size-8" />
        </div>
        <h3 className="text-red-900 font-black tracking-tight mb-2">
          Terjadi Kesalahan
        </h3>
        <p className="text-red-600 text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center bg-slate-50/30 rounded-[2.5rem] border border-slate-100 border-dashed">
        <div className="size-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl shadow-sm">
          😴
        </div>
        <h3 className="text-slate-900 font-black tracking-tight mb-1">
          Semua Aman!
        </h3>
        <p className="text-slate-400 text-sm font-medium">
          Tidak ada tugas dalam 7 hari ke depan.
        </p>
      </div>
    );
  }

  const formatDeadline = (dateString: string): string => {
    const date = new Date(dateString);
    return (
      date.toLocaleString("id-ID", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }) + " WIB"
    );
  };

  const getSourceStyles = (source: string) => {
    if (source === "google_classroom") {
      return "bg-green-50/50 border-green-200 hover:border-green-400 group-hover:bg-green-50";
    }
    return "bg-orange-50/50 border-orange-200 hover:border-orange-400 group-hover:bg-orange-50";
  };

  const getAccentColor = (source: string) => {
    return source === "google_classroom" ? "bg-green-600" : "bg-orange-600";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:gap-4 p-2 sm:p-4">
        {events.map((event, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "p-3 sm:p-6 pl-5 sm:pl-8 rounded-[1.5rem] sm:rounded-[2.5rem] border transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-slate-200/50 group relative overflow-hidden",
              getSourceStyles(event.source),
            )}
          >
            {/* Left Accent Line */}
            <div
              className={cn(
                "absolute left-0 top-0 bottom-0 w-1.5 sm:w-2 transition-all sm:group-hover:w-3",
                getAccentColor(event.source),
              )}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-6 relative z-10">
              <div className="space-y-2 sm:space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] px-2 sm:px-3 py-1 sm:py-1.5 bg-white/80 backdrop-blur-sm border border-slate-100 text-slate-500 rounded-lg sm:rounded-xl">
                    {event.course}
                  </span>

                  {event.timeRemaining.includes("jam") && (
                    <motion.span
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] px-2 sm:px-3 py-1 sm:py-1.5 bg-red-600 text-white rounded-lg sm:rounded-xl shadow-lg shadow-red-200"
                    >
                      Urgent
                    </motion.span>
                  )}
                </div>

                <div>
                  <h4 className="text-base sm:text-xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                    {event.title}
                  </h4>
                  <div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-3">
                    <p className="text-slate-500 text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 sm:gap-2">
                      <CalendarIcon className="size-3 sm:size-3.5 text-slate-400" />
                      {formatDeadline(event.deadline)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-1 shrink-0 pt-2 sm:pt-4 md:pt-0 border-t md:border-t-0 border-slate-100/50">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400">
                  Waktu Tersisa
                </span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={cn(
                      "size-8 sm:size-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12",
                      event.source === "google_classroom"
                        ? "bg-green-100 text-green-600"
                        : "bg-orange-100 text-orange-600",
                    )}
                  >
                    <Clock className="size-4 sm:size-5" />
                  </div>
                  <span className="text-lg sm:text-2xl font-black tracking-tighter text-slate-900">
                    {event.timeRemaining === "besok"
                      ? "Besok"
                      : event.timeRemaining}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="px-4 sm:px-8 pb-6 sm:pb-8 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 justify-between text-[11px] font-bold text-slate-400">
        <p>Menampilkan {events.length} tugas terdekat</p>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-green-500" />
          Terakhir Update: Real-time
        </div>
      </div>
    </div>
  );
}
