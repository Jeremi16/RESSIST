"use client";

import { format } from "date-fns";
import { CheckCircle2, Clock, ListTodo, Calendar } from "lucide-react";

interface Assignment {
  id: string | number;
  title: string;
  course: string | null;
  class_code?: string | null;
  deadline: Date | string;
  full_title?: string;
  original_course?: string | null;
  completed?: boolean;
  completed_at?: Date | string | null;
}

interface AssignmentManagerProps {
  assignments: Assignment[];
  onMarkComplete: (id: string | number) => void;
}

export function AssignmentManager({
  assignments,
  onMarkComplete,
}: AssignmentManagerProps) {
  const pendingAssignments = assignments.filter((a) => !a.completed);
  const completedAssignments = assignments.filter((a) => a.completed);

  const formatDeadline = (deadline: Date | string) => {
    try {
      const date = typeof deadline === "string" ? new Date(deadline) : deadline;
      return format(date, "dd MMM yyyy, HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="p-6 sm:p-8 bg-brand-dark border-b border-brand-dark">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-brand-blue flex items-center justify-center shadow-lg shadow-brand-blue/20">
              <ListTodo className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Tugas Sedang Berjalan
              </h3>
              <p className="text-[10px] font-bold text-brand-blue/80 uppercase tracking-widest mt-0.5">
                {pendingAssignments.length} Tugas Aktif &bull; Prioritas Utama
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          {pendingAssignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="size-20 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">
                Semua Tugas Selesai
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-5 rounded-3xl border border-slate-100 bg-slate-50/20 hover:bg-white hover:border-brand-blue/30 hover:shadow-xl hover:shadow-brand-blue/5 transition-all group relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-black text-brand-dark tracking-tight mb-3 group-hover:text-brand-blue transition-colors">
                        {assignment.full_title || assignment.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-widest shadow-sm">
                          {assignment.original_course || assignment.course}
                        </span>
                        {assignment.class_code && (
                          <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-brand-blue uppercase tracking-widest shadow-sm">
                            Kelas {assignment.class_code}
                          </span>
                        )}
                        <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-[10px] font-black text-amber-600 uppercase tracking-widest shadow-sm">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDeadline(assignment.deadline)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onMarkComplete(assignment.id)}
                      className="w-full sm:w-auto px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] text-white bg-brand-blue hover:bg-brand-dark rounded-2xl shadow-lg shadow-brand-blue/20 hover:shadow-brand-dark/20 transition-all active:scale-95"
                    >
                      Tandai Selesai
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-green-100 flex items-center justify-center shadow-lg shadow-green-600/10">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-brand-dark tracking-tight">
                Riwayat Penyelesaian
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {completedAssignments.length} Tugas Telah Diselesaikan
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8">
          {completedAssignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="size-20 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-slate-200" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">
                Belum Ada Riwayat
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50/30 opacity-80 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 size-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-slate-500 tracking-tight mb-3 truncate line-through">
                        {assignment.full_title || assignment.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {assignment.original_course || assignment.course}
                        </span>
                        {assignment.completed_at && (
                          <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 text-[10px] font-black text-green-600 uppercase tracking-widest shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Selesai {formatDeadline(assignment.completed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
