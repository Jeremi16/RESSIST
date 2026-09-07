"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Save, Loader2, CheckCircle2, GraduationCap, ToggleLeft, ToggleRight, BookOpen, AlertTriangle } from "lucide-react";

interface LMSConfigProps {
  moodleEnabled: boolean; moodleUrl: string; googleEnabled: boolean; googleConnected: boolean;
  onSave: (config: { moodle_enabled?: boolean; moodle_calendar_url?: string; google_classroom_enabled?: boolean }) => Promise<void>;
  onTest: (config: { testMoodle?: boolean; testGoogle?: boolean; moodleUrl?: string }) => Promise<void>;
  isLoading: boolean; isTesting: boolean;
}

export function LMSConfig({ moodleEnabled, moodleUrl, googleEnabled, googleConnected, onSave, onTest, isLoading, isTesting }: LMSConfigProps) {
  const [moodleUrlInput, setMoodleUrlInput] = useState(moodleUrl);
  const [moodleEnabledState, setMoodleEnabledState] = useState(moodleEnabled);
  const [googleEnabledState, setGoogleEnabledState] = useState(googleEnabled);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const handleSave = async () => { await onSave({ moodle_enabled: moodleEnabledState, moodle_calendar_url: moodleUrlInput, google_classroom_enabled: googleEnabledState }); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); };
  const handleTest = async () => { await onTest({ testMoodle: moodleEnabledState && !!moodleUrlInput, testGoogle: googleEnabledState && googleConnected, moodleUrl: moodleUrlInput }); };
  const hasChanges = moodleEnabledState !== moodleEnabled || moodleUrlInput !== moodleUrl || googleEnabledState !== googleEnabled;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-black">Konfigurasi Sumber Tugas</h3>
        <p className="text-sm text-black/60">Aktifkan satu atau lebih sumber. Sistem menggabungkan tugas dari semua sumber aktif.</p>
      </div>

      <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${moodleEnabledState ? "bg-black text-white" : "bg-[#F5F0EB] text-black/40"}`}><GraduationCap className="size-5" /></div>
            <div><div className="flex items-center gap-2"><h4 className="text-sm font-semibold text-black">Moodle</h4>{moodleEnabledState && <CheckCircle2 className="size-4 text-emerald-500" />}</div><p className="text-xs text-black/40">{moodleEnabledState ? "Aktif" : "Tidak aktif"} • Kalender ICS</p></div>
          </div>
          <button onClick={() => setMoodleEnabledState(!moodleEnabledState)} className="shrink-0">{moodleEnabledState ? <ToggleRight className="size-10 text-black" /> : <ToggleLeft className="size-10 text-black/20" />}</button>
        </div>
        <AnimatePresence>
          {moodleEnabledState && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-black/5">
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-black/40">URL Ekspor Moodle</label>
                  <div className="relative"><Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-black/30" /><input type="url" value={moodleUrlInput} onChange={(e) => setMoodleUrlInput(e.target.value)} placeholder="https://kuliah2.itera.ac.id/calendar/export_execute.php..." className="w-full h-10 bg-[#F5F0EB] border border-black/5 rounded-full pl-10 pr-4 text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/10" /></div>
                </div>
                <div className="bg-[#F5F0EB] border border-black/5 rounded-2xl p-4">
                  <h5 className="text-xs font-medium text-black mb-2">Cara Mendapatkan URL</h5>
                  <ol className="space-y-1.5 text-xs text-black/60">
                    {["Buka Moodle ITERA / Kuliah2", "Klik 'Calendar' di sidebar kiri", "Klik 'Export calendar'", "Pilih 'All events' & 'Recent and next 60 days'", "Klik 'Get calendar URL' dan salin"].map((step, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="size-5 bg-black text-white rounded-full flex items-center justify-center text-xs shrink-0">{i + 1}</span>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${googleEnabledState ? "bg-black text-white" : "bg-[#F5F0EB] text-black/40"}`}>
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" /></svg>
            </div>
            <div><div className="flex items-center gap-2"><h4 className="text-sm font-semibold text-black">Google Classroom</h4>{googleEnabledState && googleConnected && <CheckCircle2 className="size-4 text-emerald-500" />}{googleEnabledState && !googleConnected && <AlertTriangle className="size-4 text-amber-500" />}</div><p className="text-xs text-black/40">{googleConnected ? (googleEnabledState ? "Aktif • Terhubung" : "Tidak aktif") : "Perlu login ulang"}</p></div>
          </div>
          <button onClick={() => setGoogleEnabledState(!googleEnabledState)} className="shrink-0" disabled={!googleConnected}>
            {googleConnected ? (googleEnabledState ? <ToggleRight className="size-10 text-black" /> : <ToggleLeft className="size-10 text-black/20" />) : <span className="px-3 py-1 bg-black/5 text-black/40 rounded-full text-xs">Login Ulang</span>}
          </button>
        </div>
        <AnimatePresence>
          {googleConnected && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-black/5">
              <div className="p-5 space-y-3">
                <div className="bg-[#F5F0EB] border border-black/5 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-black/40 shrink-0 mt-0.5" />
                  <div><p className="text-sm font-medium text-black">Terhubung Otomatis</p><p className="text-xs text-black/60 mt-1">Google Classroom terhubung otomatis saat login dengan akun Google ITERA.</p></div>
                </div>
                <div className="bg-white border border-black/5 rounded-2xl p-4">
                  <h5 className="text-xs font-medium text-black/40 mb-2">Izin Akses</h5>
                  <ul className="space-y-1.5">
                    {["Melihat daftar kursus", "Melihat tugas dan deadline", "Read-only"].map((t) => (
                      <li key={t} className="flex items-center gap-2 text-xs text-black/60"><CheckCircle2 className="size-3.5 text-black/20 shrink-0" />{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!googleConnected && (
          <div className="px-5 pb-5"><div className="bg-[#F5F0EB] border border-black/5 rounded-2xl p-4 flex items-start gap-3"><AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" /><div><p className="text-sm font-medium text-black">Belum Terhubung</p><p className="text-xs text-black/60 mt-1">Logout dan login kembali untuk menghubungkan Google Classroom.</p></div></div></div>
        )}
      </div>

      {(moodleEnabledState || googleEnabledState) && (
        <div className="bg-[#F5F0EB] border border-black/5 rounded-2xl p-4 flex items-start gap-3">
          <BookOpen className="size-4 text-black/40 shrink-0 mt-0.5" />
          <div><h4 className="text-sm font-medium text-black">Penggabungan Tugas Otomatis</h4><p className="text-xs text-black/60 leading-relaxed mt-1">Menggabungkan tugas dari {[moodleEnabledState && "Moodle", googleEnabledState && "Google Classroom"].filter(Boolean).join(" dan ")}. Duplikat otomatis dihapus.</p></div>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <button onClick={handleTest} disabled={isTesting || (!moodleEnabledState && !googleEnabledState)} className="w-full h-10 bg-white text-black border border-black/10 rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#F5F0EB] disabled:opacity-40 transition-colors">
          {isTesting ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}{isTesting ? "Mengetes..." : "Tes Semua Sumber"}
        </button>
        <button onClick={handleSave} disabled={isLoading || !hasChanges} className="w-full h-11 bg-black text-white rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-black/90 disabled:opacity-40 transition-colors">
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Simpan Konfigurasi
        </button>
        {saveSuccess && <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-black text-white rounded-2xl flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" /> Konfigurasi disimpan.</motion.div>}
      </div>
    </div>
  );
}
