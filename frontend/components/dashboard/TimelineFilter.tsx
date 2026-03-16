"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineFilterProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const SORT_OPTIONS = [
  { value: "deadline_asc", label: "Deadline Terdekat" },
  { value: "deadline_desc", label: "Deadline Terjauh" },
];

export function TimelineFilter({ value, onChange, disabled }: TimelineFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm transition-all duration-300",
          "hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5",
          "focus:outline-none focus:ring-4 focus:ring-blue-500/10",
          isOpen && "border-blue-500 ring-4 ring-blue-500/10",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <ArrowUpDown className={cn(
          "size-4 transition-colors",
          isOpen ? "text-blue-500" : "text-slate-400"
        )} />
        <span className="text-sm font-bold text-slate-700 min-w-[120px] text-left">
          {selectedOption.label}
        </span>
        <ChevronDown className={cn(
          "size-4 text-slate-400 transition-transform duration-300",
          isOpen && "rotate-180 text-blue-500"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-64 z-50 overflow-hidden"
          >
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-[1.5rem] shadow-2xl shadow-slate-900/10 p-2 border-slate-200">
              <div className="px-3 py-2 border-b border-slate-100/50 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Urutkan Berdasarkan
                </span>
              </div>
              <div className="space-y-1">
                {SORT_OPTIONS.map((option) => {
                  const isActive = option.value === value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 group",
                        isActive 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <span>{option.label}</span>
                      {isActive ? (
                        <Check className="size-4 text-white" />
                      ) : (
                        <div className="size-4 rounded-full border border-slate-200 group-hover:border-blue-300 transition-colors" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
