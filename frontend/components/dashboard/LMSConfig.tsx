"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Save, Loader2, CheckCircle2, GraduationCap, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LMSConfigProps {
  moodleEnabled: boolean;
  moodleUrl: string;
  googleEnabled: boolean;
  googleConnected: boolean;
  onSave: (config: {
    moodle_enabled?: boolean;
    moodle_calendar_url?: string;
    google_classroom_enabled?: boolean;
  }) => Promise<void>;
  onTest: (config: {
    testMoodle?: boolean;
    testGoogle?: boolean;
    moodleUrl?: string;
  }) => Promise<void>;
  isLoading: boolean;
  isTesting: boolean;
}

export function LMSConfig({
  moodleEnabled,
  moodleUrl,
  googleEnabled,
  googleConnected,
  onSave,
  onTest,
  isLoading,
  isTesting,
}: LMSConfigProps) {
  const [moodleUrlInput, setMoodleUrlInput] = useState(moodleUrl);
  const [moodleEnabledState, setMoodleEnabledState] = useState(moodleEnabled);
  const [googleEnabledState, setGoogleEnabledState] = useState(googleEnabled);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showMoodleHelp, setShowMoodleHelp] = useState(false);

  const handleSave = async () => {
    await onSave({
      moodle_enabled: moodleEnabledState,
      moodle_calendar_url: moodleUrlInput,
      google_classroom_enabled: googleEnabledState,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTest = async () => {
    await onTest({
      testMoodle: moodleEnabledState && !!moodleUrlInput,
      testGoogle: googleEnabledState && googleConnected,
      moodleUrl: moodleUrlInput,
    });
  };

  const hasChanges =
    moodleEnabledState !== moodleEnabled ||
    moodleUrlInput !== moodleUrl ||
    googleEnabledState !== googleEnabled;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-black">Sumber Tugas</h3>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Moodle - simple */}
        <div className="bg-white border border-black/5 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", moodleEnabledState ? "bg-black text-white" : "bg-[#F5F0EB] text-black/40")}>
                <GraduationCap className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-black leading-none">Moodle</p>
                <p className="text-xs text-black/40 mt-1">{moodleEnabledState ? "Aktif" : "Nonaktif"}</p>
              </div>
            </div>
            <button
              onClick={() => setMoodleEnabledState(!moodleEnabledState)}
              className={cn("relative shrink-0 h-6 w-11 rounded-full transition-colors", moodleEnabledState ? "bg-black" : "bg-black/10")}
              aria-label="Toggle Moodle"
            >
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all", moodleEnabledState ? "left-5" : "left-0.5")} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {moodleEnabledState && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-4 space-y-3">
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-black/30" />
                    <input
                      type="url"
                      value={moodleUrlInput}
                      onChange={(e) => setMoodleUrlInput(e.target.value)}
                      placeholder="https://kuliah2.itera.ac.id/calendar/export..."
                      className="w-full h-9 bg-[#F5F0EB] border border-black/5 rounded-full pl-9 pr-3 text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/10"
                    />
                  </div>
                  <button
                    onClick={() => setShowMoodleHelp(!showMoodleHelp)}
                    className="flex items-center gap-1 text-xs text-black/50 hover:text-black transition-colors"
                  >
                    Cara mendapatkan URL <ChevronDown className={cn("size-3.5 transition-transform", showMoodleHelp && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {showMoodleHelp && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <ol className="text-xs text-black/60 space-y-1 bg-[#F5F0EB] rounded-xl p-3 list-decimal list-inside">
                          <li>Moodle → Calendar → Export calendar</li>
                          <li>Pilih All events &amp; Recent and next 60 days</li>
                          <li>Get calendar URL → salin ke atas</li>
                        </ol>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Google Classroom - simple */}
        <div className="bg-white border border-black/5 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", googleEnabledState && googleConnected ? "bg-black text-white" : "bg-[#F5F0EB] text-black/40")}>
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-black leading-none">Google Classroom</p>
                <p className="text-xs text-black/40 mt-1 truncate">{googleConnected ? (googleEnabledState ? "Aktif" : "Nonaktif") : "Butuh login ulang"}</p>
              </div>
            </div>
            {googleConnected ? (
              <button
                onClick={() => setGoogleEnabledState(!googleEnabledState)}
                className={cn("relative shrink-0 h-6 w-11 rounded-full transition-colors", googleEnabledState ? "bg-black" : "bg-black/10")}
                aria-label="Toggle Classroom"
              >
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all", googleEnabledState ? "left-5" : "left-0.5")} />
              </button>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-black/5 text-black/40 shrink-0">Login Ulang</span>
            )}
          </div>
          {!googleConnected && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-3 flex items-center gap-2">
              <AlertTriangle className="size-3.5 shrink-0" /> Logout & login lagi dengan Google ITERA.
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={isTesting || (!moodleEnabledState && !(googleEnabledState && googleConnected))}
          className="flex-1 h-10 bg-white border border-black/10 rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#F5F0EB] disabled:opacity-40"
        >
          {isTesting ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Tes
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
          className="flex-1 h-10 bg-black text-white rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-black/90 disabled:opacity-40"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan
        </button>
      </div>

      <AnimatePresence>
        {saveSuccess && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="flex items-center gap-2 text-sm bg-black text-white rounded-xl px-3 py-2.5">
            <CheckCircle2 className="size-4" /> Tersimpan
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
