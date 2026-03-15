"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  AlertCircle,
  Save,
  Loader2,
  CheckCircle2,
  GraduationCap,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  AlertTriangle,
} from "lucide-react";

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

/**
 * LMS Configuration Component - Multi Source
 *
 * Note: Google Classroom is automatically connected via Google Login,
 * so no separate OAuth flow is needed.
 */
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
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-black text-slate-900">
          Konfigurasi Sumber Tugas
        </h3>
        <p className="text-sm text-slate-500">
          Aktifkan satu atau lebih sumber tugas. Sistem akan menggabungkan tugas
          dari semua sumber yang aktif.
        </p>
      </div>

      {/* Moodle Section */}
      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`size-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                moodleEnabledState
                  ? "bg-orange-500 text-white"
                  : "bg-orange-50 text-orange-500"
              }`}
            >
              <GraduationCap className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-slate-900">Moodle</h4>
                {moodleEnabledState && (
                  <CheckCircle2 className="size-5 text-green-500" />
                )}
              </div>
              <p className="text-sm text-slate-500">
                {moodleEnabledState ? "Aktif" : "Tidak aktif"} • Ambil dari
                kalender ICS Moodle
              </p>
            </div>
          </div>

          <button
            onClick={() => setMoodleEnabledState(!moodleEnabledState)}
            className="shrink-0"
          >
            {moodleEnabledState ? (
              <ToggleRight className="size-12 text-orange-500" />
            ) : (
              <ToggleLeft className="size-12 text-slate-300" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {moodleEnabledState && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-100"
            >
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-black uppercase tracking-widest text-slate-400 pl-1">
                    URL Ekspor Moodle
                  </label>
                  <div className="relative group">
                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                    <input
                      type="url"
                      value={moodleUrlInput}
                      onChange={(e) => setMoodleUrlInput(e.target.value)}
                      placeholder="https://kuliah2.itera.ac.id/calendar/export_execute.php..."
                      className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-6">
                  <h5 className="text-sm font-black text-orange-900 uppercase tracking-widest mb-4">
                    Cara Mendapatkan URL
                  </h5>
                  <ol className="space-y-2 text-sm text-slate-600">
                    {[
                      "Buka Moodle ITERA / Kuliah2",
                      "Klik 'Calendar' di sidebar kiri",
                      "Klik 'Export calendar'",
                      "Pilih 'All events' & 'Recent and next 60 days'",
                      "Klik 'Get calendar URL' dan salin",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="size-5 bg-orange-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Google Classroom Section */}
      <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`size-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                googleEnabledState
                  ? "bg-green-500 text-white"
                  : "bg-green-50 text-green-500"
              }`}
            >
              <svg className="size-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-slate-900">
                  Google Classroom
                </h4>
                {googleEnabledState && googleConnected && (
                  <CheckCircle2 className="size-5 text-green-500" />
                )}
                {googleEnabledState && !googleConnected && (
                  <AlertTriangle className="size-5 text-amber-500" />
                )}
              </div>
              <p className="text-sm text-slate-500">
                {googleConnected
                  ? googleEnabledState
                    ? "Aktif • Terhubung otomatis"
                    : "Tidak aktif • Login ulang untuk aktifkan"
                  : "Perlu login ulang untuk terhubung"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setGoogleEnabledState(!googleEnabledState)}
            className="shrink-0"
            disabled={!googleConnected}
          >
            {googleConnected ? (
              googleEnabledState ? (
                <ToggleRight className="size-12 text-green-500" />
              ) : (
                <ToggleLeft className="size-12 text-slate-300" />
              )
            ) : (
              <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-xs font-bold">
                Login Ulang
              </span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {googleConnected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-100"
            >
              <div className="p-6 space-y-4">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-green-900">
                        Terhubung Otomatis
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Google Classroom terhubung secara otomatis saat login
                        dengan akun Google ITERA. Tidak perlu setup tambahan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                  <h5 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-3">
                    Izin Akses
                  </h5>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                      <span>Melihat daftar kursus</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                      <span>Melihat tugas dan deadline</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                      <span>Read-only (tidak bisa mengubah)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!googleConnected && (
          <div className="px-6 pb-6">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Belum Terhubung</p>
                <p className="text-sm text-amber-700 mt-1">
                  Logout dan login kembali untuk menghubungkan Google Classroom.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      {(moodleEnabledState || googleEnabledState) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4"
        >
          <BookOpen className="size-6 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900 mb-1">
              Penggabungan Tugas Otomatis
            </h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              Sistem akan menggabungkan tugas dari{" "}
              {[
                moodleEnabledState && "Moodle",
                googleEnabledState && "Google Classroom",
              ]
                .filter(Boolean)
                .join(" dan ")}
              . Tugas yang sama akan otomatis dideduplikasi.
            </p>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 pt-4">
        <button
          onClick={handleTest}
          disabled={isTesting || (!moodleEnabledState && !googleEnabledState)}
          className="w-full h-12 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:border-slate-300 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {isTesting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4 text-blue-600 group-hover:scale-110" />
          )}
          {isTesting ? "Sedang Mengetes..." : "Tes Semua Sumber"}
        </button>

        <button
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 shadow-xl shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Save className="size-5" />
          )}
          Simpan Konfigurasi
        </button>

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-700 text-sm font-bold"
          >
            <CheckCircle2 className="size-5" /> Konfigurasi disimpan!
          </motion.div>
        )}
      </div>
    </div>
  );
}
