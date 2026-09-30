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
          "flex items-center gap-2 px-4 py-2.5 bg-white border border-black/10 rounded-xl transition-all duration-300",
          "hover:border-black/20",
          "focus:outline-none focus:border-[#0059D0]",
          isOpen && "border-[#0059D0]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <ArrowUpDown className={cn(
          "size-4 transition-colors",
          isOpen ? "text-[#0059D0]" : "text-black/40"
        )} />
        <span className="text-sm font-bold text-black/80 min-w-[120px] text-left">
          {selectedOption.label}
        </span>
        <ChevronDown className={cn(
          "size-4 text-black/40 transition-transform duration-300",
          isOpen && "rotate-180 text-[#0059D0]"
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
            <div className="bg-white border rounded-xl p-2 border-black/10">
              <div className="px-3 py-2 border-b border-black/10 mb-1">
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-black/40">
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
                          ? "bg-[#0059D0] text-white/20" 
                          : "text-black/70 hover:bg-[#F5F5F5] hover:text-black"
                      )}
                    >
                      <span>{option.label}</span>
                      {isActive ? (
                        <Check className="size-4 text-white" />
                      ) : (
                        <div className="size-4 rounded-full border border-black/10 group-hover:border-[#0059D0] transition-colors" />
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
