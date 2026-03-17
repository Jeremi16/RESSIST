"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GeneralSettingsProps {
  reminderHours: number[];
  morningBriefing: boolean;
  onSave: (data: {
    reminder_hours: string;
    morning_briefing: boolean;
  }) => Promise<void>;
  isLoading: boolean;
}

export function GeneralSettings({
  reminderHours,
  morningBriefing,
  onSave,
  isLoading,
}: GeneralSettingsProps) {
  const [hours, setHours] = useState<number[]>(reminderHours);
  const [briefing, setBriefing] = useState(morningBriefing);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const reminderOptions = [
    { value: 24, label: "24 Jam" },
    { value: 12, label: "12 Jam" },
    { value: 6, label: "6 Jam" },
    { value: 1, label: "1 Jam" },
  ];

  const toggleHour = (hour: number) => {
    setHours((prev) =>
      prev.includes(hour)
        ? prev.length > 1
          ? prev.filter((h) => h !== hour)
          : prev
        : [...prev, hour].sort((a, b) => b - a),
    );
  };

  const handleSave = async () => {
    await onSave({
      reminder_hours: JSON.stringify(hours),
      morning_briefing: briefing,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <label className="text-sm font-black uppercase tracking-widest text-slate-400 pl-1 flex items-center gap-2">
          <Clock className="size-4" /> Waktu Pengingat
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {reminderOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleHour(opt.value)}
              className={cn(
                "h-12 px-4 rounded-xl text-xs font-black tracking-tight transition-all border flex items-center justify-center gap-2",
                hours.includes(opt.value)
                  ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02]"
                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-200",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          Tentukan kapan bot akan mengirimkan pengingat sebelum deadline tugas berakhir.
        </p>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-3xl p-6">
        <div className="flex items-center justify-between gap-6">
          <div className="flex gap-4">
            <div className="size-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-amber-600">
              <Clock className="size-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 tracking-tight">
                Morning Briefing
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[220px]">
                Ringkasan tugas harian setiap jam 07:00 WIB.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={briefing}
              onChange={(e) => setBriefing(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-amber-200/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600" />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-6 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 shadow-xl shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Save className="size-5" />
          )}
          Simpan Preferensi
        </button>

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-700 text-sm font-bold"
          >
            <CheckCircle2 className="size-5" /> Preferensi disimpan!
          </motion.div>
        )}
      </div>
    </div>
  );
}
