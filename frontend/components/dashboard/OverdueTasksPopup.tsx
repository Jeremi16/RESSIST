"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  X, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventPreview as EventType } from "@/src/lib/api-types";

interface OverdueTasksPopupProps {
  tasks: EventType[];
  onMarkComplete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function OverdueTasksPopup({ tasks, onMarkComplete, onClose }: OverdueTasksPopupProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (tasks.length === 0 || !isVisible) return null;

  const currentTask = tasks[currentIndex];
  const progress = ((currentIndex) / tasks.length) * 100;

  const handleMarkComplete = async () => {
    if (!currentTask.id || isProcessing) return;
    setIsProcessing(true);
    try {
      await onMarkComplete(currentTask.id);
      if (currentIndex < tasks.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        handleClose();
      }
    } catch (error) {
      console.error("Failed to mark overdue task complete:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < tasks.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  const formatDeadline = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    }) + " WIB";
  };

  const getSourceLabel = (source: string) =>
    source === "google_classroom" ? "Google Classroom" : "SCeLE / Moodle";

  const isGoogleTask = currentTask?.source === "google_classroom";

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/30 backdrop-blur-sm"
      onClick={handleClose}
    >
      <motion.div 
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl relative overflow-hidden"
      >
        {/* Progress bar */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-slate-100">
          <motion.div 
            className="h-full bg-slate-700"
            initial={{ width: `${progress}%` }}
            animate={{ width: `${((currentIndex) / tasks.length) * 100}%` }}
            transition={{ ease: "easeOut" }}
          />
        </div>

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-0.5">
                {currentIndex + 1} / {tasks.length} tugas terlewat
              </p>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Tinjau Tugas</h2>
            </div>
            <button 
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors -mt-0.5 -mr-1"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Task Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {/* Source & Course badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                  {getSourceLabel(currentTask.source)}
                </span>
                {currentTask.course && (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                    {currentTask.course}
                  </span>
                )}
              </div>

              {/* Task title */}
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {currentTask.title}
              </h3>

              {/* Deadline */}
              <div className="flex items-center gap-1.5 text-red-500">
                <Clock className="size-3.5 shrink-0" />
                <span className="text-xs font-semibold">
                  Deadline: {formatDeadline(currentTask.deadline)}
                </span>
              </div>

              {/* Open link */}
              {currentTask.url && (
                <a 
                  href={currentTask.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors py-1"
                >
                  <ExternalLink className="size-3.5" />
                  Buka di LMS
                </a>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Divider */}
          <div className="border-t border-slate-100 my-5" />

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Prev */}
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>

            {/* Skip */}
            <button
              onClick={handleNext}
              className="flex-1 py-2.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Lewati
            </button>

            {/* Mark Complete - hidden for Classroom (full source of truth) */}
            {!isGoogleTask ? (
              <button
                onClick={handleMarkComplete}
                disabled={isProcessing}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1.5",
                  isProcessing && "opacity-60 animate-pulse"
                )}
              >
                <CheckCircle2 className="size-3.5" />
                {isProcessing ? "Memproses..." : "Tandai Selesai"}
              </button>
            ) : (
              <div className="flex-1 py-2.5 text-[10px] font-semibold text-center text-slate-400 bg-slate-50 rounded-xl">Status mengikuti Classroom</div>
            )}

            {/* Next */}
            <button
              onClick={handleNext}
              disabled={currentIndex >= tasks.length - 1}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
