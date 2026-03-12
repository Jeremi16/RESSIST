"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Event {
  title: string;
  course: string | null;
  deadline: Date | string;
}

interface CalendarViewProps {
  events: Event[];
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const startObj = startOfWeek(startOfMonth(currentMonth));
    const endObj = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start: startObj, end: endObj });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const formattedEvents = useMemo(() => {
    return events.map((e) => ({
      ...e,
      date: new Date(e.deadline),
    }));
  }, [events]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight capitalize">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Deadline Tugas
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={goToToday}
            className="h-8 px-2.5 sm:px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 rounded-lg hover:text-slate-900 hover:border-slate-300 transition-all font-sans"
          >
            Hari Ini
          </button>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={prevMonth}
              className="p-1 hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-white/50">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {calendarDays.map((day, i) => {
          const dayEvents = formattedEvents.filter((e) =>
            isSameDay(e.date, day),
          );
          const isSelectedMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[72px] sm:min-h-[80px] p-1.5 sm:p-2 border-r border-b border-slate-50 last:border-r-0 transition-all cursor-default",
                !isSelectedMonth
                  ? "opacity-30"
                  : "bg-white hover:bg-slate-50/30",
              )}
            >
              <div className="flex justify-start pb-1 mb-2">
                <span
                  className={cn(
                    "text-[10px] font-black tracking-tighter size-6 flex items-center justify-center rounded-lg transition-all",
                    isTodayDate
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : isSelectedMonth
                        ? "text-slate-900"
                        : "text-slate-300",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              <div className="space-y-1.5 overflow-hidden">
                {dayEvents.slice(0, 3).map((event, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight truncate bg-blue-50 text-blue-600 border border-blue-100 group relative"
                    title={`${event.title} (${event.course})`}
                  >
                    <div className="w-1 h-3 bg-blue-600 absolute left-0 top-1/2 -translate-y-1/2 rounded-r-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest pl-1 mt-1">
                    +{dayEvents.length - 3} Tugas
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
