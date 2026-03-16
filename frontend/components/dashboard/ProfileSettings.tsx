"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Save,
  Loader2,
  CheckCircle2,
  User as UserIcon,
  Phone,
  Send,
  Link as LinkIcon,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-provider";

interface ProfileSettingsProps {
  userData: {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    whatsapp_number: string | null;
    whatsapp_enabled: boolean;
    telegram_chat_id: string | null;
    telegram_enabled: boolean;
    telegram_bot_username: string;
  };
  onSave: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function ProfileSettings({ userData, onSave, isLoading }: ProfileSettingsProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(userData.name || "");
  const [whatsappNumber, setWhatsappNumber] = useState(userData.whatsapp_number || "");
  const [telegramChatId, setTelegramChatId] = useState(userData.telegram_chat_id || "");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setName(userData.name || "");
    setWhatsappNumber(userData.whatsapp_number || "");
    setTelegramChatId(userData.telegram_chat_id || "");
  }, [userData]);

  const handleSave = async () => {
    await onSave({
      name: name,
      whatsapp_number: whatsappNumber,
      telegram_chat_id: telegramChatId,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    showToast({
      title: "Berhasil disalin!",
      description: message,
      variant: "success",
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <label className="text-sm font-black uppercase tracking-widest text-slate-400 pl-1 flex items-center gap-2">
          <UserIcon className="size-4" /> Nama Lengkap
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Anda"
          className="w-full h-12 px-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      <div className="space-y-4">
        <label className="text-sm font-black uppercase tracking-widest text-slate-400 pl-1 flex items-center gap-2">
          <Phone className="size-4" /> WhatsApp
        </label>
        <input
          type="text"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="Nomor WhatsApp (ex: +62812...)"
          className="w-full h-12 px-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
        <p className="text-xs text-slate-500">
          Masukkan nomor WhatsApp Anda dengan kode negara (ex: +62812...).
        </p>
      </div>

      <div className="space-y-4">
        <label className="text-sm font-black uppercase tracking-widest text-slate-400 pl-1 flex items-center gap-2">
          <Send className="size-4" /> Telegram Chat ID
        </label>
        <input
          type="text"
          value={telegramChatId}
          onChange={(e) => setTelegramChatId(e.target.value)}
          placeholder="Telegram Chat ID Anda"
          className="w-full h-12 px-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center text-xs text-blue-700">
          <p>
            Untuk mendapatkan Chat ID, mulai chat dengan bot{" "}
            <a
              href={`https://t.me/${userData.telegram_bot_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline flex items-center gap-1 hover:text-blue-800"
            >
              @{userData.telegram_bot_username} <LinkIcon className="size-3" />
            </a>{" "}
            lalu ketik `/start`.
          </p>
          {userData.telegram_chat_id && (
            <button
              type="button"
              onClick={() => copyToClipboard(userData.telegram_chat_id!, "Chat ID Telegram disalin!")}
              className="flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-100 rounded-md hover:bg-blue-100 transition-colors"
            >
              <Copy className="size-3" /> Salin Chat ID Saat Ini
            </button>
          )}
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
          Simpan Profil
        </button>

        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-700 text-sm font-bold"
          >
            <CheckCircle2 className="size-5" /> Profil berhasil disimpan!
          </motion.div>
        )}
      </div>
    </div>
  );
}
