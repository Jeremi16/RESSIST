"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Link2, AlertCircle, Save, Loader2, CheckCircle2 } from "lucide-react";

interface MoodleConfigProps {
  url: string;
  onSave: (url: string) => Promise<void>;
  onTest: (url: string) => Promise<void>;
  isLoading: boolean;
  isTesting: boolean;
}

export function MoodleConfig({
  url,
  onSave,
  onTest,
  isLoading,
  isTesting,
}: MoodleConfigProps) {
  const [moodleUrl, setMoodleUrl] = useState(url);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    await onSave(moodleUrl);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <label className="text-sm font-black uppercase tracking-widest text-slate-400 pl-1">
          URL Ekspor Moodle
        </label>
        <div className="relative group">
          <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-[#0059D0] transition-colors" />
          <input
            type="url"
            value={moodleUrl}
            onChange={(e) => setMoodleUrl(e.target.value)}
            placeholder="https://kuliah2.itera.ac.id/calendar/export_execute.php..."
            className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#60A8F8]/30 focus:border-[#0059D0] transition-all shadow-sm"
          />
        </div>
        <div className="text-[11px] text-slate-400 pl-1 flex flex-col gap-2 leading-relaxed">
          <span className="flex items-center gap-1">
            <AlertCircle className="size-3 shrink-0" /> Dapatkan URL ini di
            Moodle ITERA {">"} Calendar {">"} Export Calendar {">"} Get calendar
            URL.
          </span>
          <div className="flex items-center gap-2 ml-4">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_ITERA.png"
              alt="ITERA Logo"
              className="h-6 object-contain"
            />
            <span className="font-bold text-[#60A8F8]">
              Compatible with kuliah2.itera.ac.id
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#60A8F8]/10 border border-[#60A8F8]/30 rounded-[2rem] p-8 space-y-6">
        <h4 className="text-sm font-black text-[#0043A5] uppercase tracking-widest">
          Cara Mendapatkan URL Moodle
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {[
              "Buka Moodle ITERA / Kuliah2",
              "Klik 'Calendar' di sidebar kiri",
              "Scroll ke bawah, klik 'Export calendar'",
              "Pilih 'All events' & 'Custom range'",
              "Klik 'Get calendar URL'",
              "Salin link yang muncul ke kotak di atas",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="size-5 bg-[#0059D0] text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-xs font-bold text-slate-600">{step}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-[#60A8F8]/30 p-4 flex flex-col items-center justify-center text-center space-y-2">
            <div className="size-12 bg-[#60A8F8]/10 rounded-full flex items-center justify-center text-2xl">
              💡
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Tips
            </p>
            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              Pastikan pilih{" "}
              <strong>&quot;Recent and next 60 days&quot;</strong> agar semua
              deadline terbaca oleh bot.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => onTest(moodleUrl)}
          disabled={isTesting || !moodleUrl}
          className="w-full h-12 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:border-slate-300 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {isTesting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4 text-[#0059D0] group-hover:scale-110" />
          )}
          {isTesting ? "Sedang Mengetes..." : "Tes Koneksi Kalender"}
        </button>

        <button
          onClick={handleSave}
          disabled={isLoading || moodleUrl === url}
          className="w-full h-14 bg-[#0059D0] text-white rounded-2xl font-black text-lg hover:bg-[#60A8F8] shadow-xl shadow-[#0059D0]/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
