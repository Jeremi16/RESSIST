"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Save,
  Loader2,
  CheckCircle2,
  Layout,
  AlertCircle,
} from "lucide-react";

interface TelegramConfigProps {
  chatId: string;
  enabled: boolean;
  botUsername: string;
  onSave: (data: {
    telegram_chat_id: string;
    telegram_enabled: boolean;
  }) => Promise<void>;
  isLoading: boolean;
}

export function TelegramConfig({
  chatId,
  enabled,
  botUsername,
  onSave,
  isLoading,
}: TelegramConfigProps) {
  const [tgChatId, setTgChatId] = useState(chatId);
  const [isTgEnabled, setIsTgEnabled] = useState(enabled);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    await onSave({ telegram_chat_id: tgChatId, telegram_enabled: isTgEnabled });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-base font-black text-amber-900 tracking-tight">
              Telegram Bot belum ready
            </h4>
            <p className="text-sm text-amber-700 font-medium mt-1">
              Fitur Telegram Bot masih dalam pengembangan. Status saat ini:{" "}
              <strong>v0.1.0 Beta</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="size-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-600/20">
            <AlertCircle className="size-6" />
          </div>
          <div className="space-y-2">
            <h4 className="text-lg font-black text-slate-900 tracking-tight">
              Wajib: Mulai Chat dengan Bot
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Agar Resisst bisa mengirimkan notifikasi, Anda{" "}
              <strong>wajib</strong> melakukan chat pertama ke bot kami terlebih
              dahulu.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-14 bg-[#24A1DE] text-white rounded-2xl font-black text-base hover:bg-[#208aba] shadow-xl shadow-sky-500/10 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Send className="size-5 fill-white" />
            Buka Bot @{botUsername}
          </a>

          <div className="bg-white/50 rounded-2xl p-6 border border-blue-100/50">
            <h5 className="text-[11px] font-black uppercase tracking-widest text-blue-600 mb-4">
              Tutorial Singkat
            </h5>
            <ol className="space-y-3">
              {[
                {
                  step: "1",
                  text: "Klik tombol biru di atas untuk membuka bot Telegram.",
                },
                {
                  step: "2",
                  text: 'Tekan tombol "Start" di aplikasi Telegram Anda.',
                },
                {
                  step: "3",
                  text: "Ketik perintah /id untuk mendapatkan Chat ID Anda.",
                },
                {
                  step: "4",
                  text: "Salin angka tersebut dan masukkan ke kolom di bawah ini.",
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-4">
                  <span className="flex-shrink-0 size-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black">
                    {item.step}
                  </span>
                  <p className="text-xs text-slate-700 font-medium leading-normal">
                    {item.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600">
              <Layout className="size-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 tracking-tight">
                Konfigurasi Chat ID
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Aktifkan notifikasi & hubungkan Akun
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isTgEnabled}
              onChange={(e) => setIsTgEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 pl-1">
            Chat ID Telegram Anda
          </label>
          <div className="relative group">
            <Send className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              placeholder="Contoh: 123456789"
              className="w-full h-12 bg-white border border-slate-100 rounded-xl pl-12 pr-4 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={handleSave}
          disabled={
            isLoading || (tgChatId === chatId && isTgEnabled === enabled)
          }
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 shadow-xl shadow-slate-900/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Save className="size-5" />
          )}
          Simpan Pengaturan Telegram
        </button>

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-700 text-sm font-bold"
          >
            <CheckCircle2 className="size-5" /> Pengaturan Telegram disimpan!
          </motion.div>
        )}
      </div>
    </div>
  );
}
