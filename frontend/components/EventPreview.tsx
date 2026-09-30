"use client";

import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import type { EventPreview as EventPreviewType } from "@/src/lib/api-types";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
        <h3 className="text-red-900 font-display font-bold tracking-tight mb-2">
          Terjadi Kesalahan
        </h3>
        <p className="text-red-600 text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center bg-[#F5F5F5] rounded-xl border border-black/10 border-dashed">
        <div className="size-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl shadow-sm">
          😴
        </div>
        <h3 className="text-black font-display font-bold tracking-tight mb-1">
          Semua Aman!
        </h3>
        <p className="text-black/40 text-sm font-medium">
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

  const getSourceBadgeColor = (source: string) => {
    return source === "google_classroom"
      ? "bg-green-100 text-green-700"
      : "bg-orange-100 text-orange-700";
  };

  return (
    <div className="space-y-4">
      <Accordion className="grid grid-cols-1 gap-3 sm:gap-4 p-2 sm:p-4">
        {events.map((event, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "rounded-md sm:rounded-lg border transition-all shadow-sm hover:shadow-lg group relative overflow-hidden",
              event.source === "google_classroom"
                ? "border-green-100 hover:border-green-200"
                : "border-orange-100 hover:border-orange-200",
            )}
          >
            <AccordionItem value={`item-${index}`} className="border-none">
              <AccordionTrigger className="p-4 sm:p-6 hover:no-underline">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full text-left gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                    <h4 className="text-base sm:text-lg font-display font-bold tracking-tight text-black group-hover:text-[#0059D0] transition-colors line-clamp-2 sm:line-clamp-1 leading-tight">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-2 text-black/60 text-[11px] sm:text-xs font-semibold">
                      <CalendarIcon className="size-3.5 text-black/40 shrink-0" />
                      <span className="truncate">
                        {formatDeadline(event.deadline)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    {event.url ? (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-wider text-white bg-[#0059D0] hover:bg-[#0043A5] rounded-md transition-colors"
                      >
                        <ExternalLink className="size-3.5" />
                        Buka Tugas
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-wider text-black/40 bg-black/5 rounded-md">
                        Link Tidak Tersedia
                      </span>
                    )}

                    <div className="px-3 py-1.5 sm:p-0 bg-[#F5F5F5] sm:bg-transparent rounded-xl border border-black/10 sm:border-none">
                      <span className="text-sm sm:text-base font-display font-bold text-black whitespace-nowrap">
                        {event.timeRemaining.toLowerCase() === "besok"
                          ? "Besok"
                          : event.timeRemaining.toLowerCase() === "hari ini"
                            ? "Hari ini"
                            : event.timeRemaining}
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pt-0 pb-4 px-4 sm:px-6">
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-md",
                        getSourceBadgeColor(event.source),
                      )}
                    >
                      {event.course}
                    </span>

                    {event.class_code && (
                      <span className="text-[10px] font-display font-bold uppercase tracking-wider px-2.5 py-1 bg-[#F5F5F5] border border-[#0059D0]/20 text-[#0059D0] rounded-md">
                        Kelas {event.class_code}
                      </span>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-sm text-black/80 leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        ))}
      </Accordion>

      <div className="px-4 sm:px-8 pb-6 sm:pb-8 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 justify-between text-[11px] font-bold text-black/40">
        <p>Menampilkan {events.length} tugas terdekat</p>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-green-500" />
          Terakhir Update: Real-time
        </div>
      </div>
    </div>
  );
}
