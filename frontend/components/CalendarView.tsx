"use client";

import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Event { title: string; course: string | null; class_code?: string | null; deadline: Date | string; full_title?: string; original_course?: string | null; }
interface CalendarViewProps { events: Event[]; }

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
  const formattedEvents = useMemo(() => events.map((e) => ({ ...e, date: new Date(e.deadline), full_title: e.title, original_course: e.course })), [events]);

  return (
    <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-black/5">
        <h3 className="text-sm font-semibold text-black capitalize">{format(currentMonth, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-1.5">
          <button onClick={goToToday} className="h-7 px-2.5 text-xs font-medium text-black/60 bg-[#F5F0EB] border border-black/5 rounded-full hover:bg-black/[0.04] transition-colors">Today</button>
          <div className="flex items-center bg-[#F5F0EB] border border-black/5 rounded-full p-0.5">
            <button onClick={prevMonth} className="size-6 flex items-center justify-center text-black/40 hover:text-black transition-colors"><ChevronLeft className="size-4" /></button>
            <button onClick={nextMonth} className="size-6 flex items-center justify-center text-black/40 hover:text-black transition-colors"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-black/5 bg-[#F5F0EB]/50">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-black/30">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {calendarDays.map((day) => {
          const dayEvents = formattedEvents.filter((e) => isSameDay(e.date, day));
          const isSelectedMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);
          return (
            <div key={day.toISOString()} className={cn("min-h-[68px] p-1.5 border-r border-b border-black/5", !isSelectedMonth ? "opacity-30 bg-black/[0.01]" : "bg-white")}>
              <span className={cn("text-xs font-medium size-6 flex items-center justify-center rounded-full", isTodayDate ? "bg-black text-white" : isSelectedMonth ? "text-black" : "text-black/30")}>
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((event, idx) => (
                  <div key={idx} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium truncate bg-black text-white" title={event.full_title || event.title}>
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && <div className="text-[11px] text-black/30 pl-1">+{dayEvents.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
