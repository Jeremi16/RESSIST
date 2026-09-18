"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, CheckCircle2, User as UserIcon, Phone, Send, Link as LinkIcon, Copy } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";

interface ProfileSettingsProps {
  userData: { id: string; email: string; name: string | null; avatar_url: string | null; whatsapp_number: string | null; whatsapp_enabled: boolean; telegram_chat_id: string | null; telegram_enabled: boolean; telegram_bot_username: string; };
  onSave: (data: any) => Promise<void>; isLoading: boolean;
}

export function ProfileSettings({ userData, onSave, isLoading }: ProfileSettingsProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(userData.name || "");
  const [whatsappNumber, setWhatsappNumber] = useState(userData.whatsapp_number || "");
  const [telegramChatId, setTelegramChatId] = useState(userData.telegram_chat_id || "");
  const [saveSuccess, setSaveSuccess] = useState(false);
  useEffect(() => { setName(userData.name || ""); setWhatsappNumber(userData.whatsapp_number || ""); setTelegramChatId(userData.telegram_chat_id || ""); }, [userData]);
  const handleSave = async () => { await onSave({ name, whatsapp_number: whatsappNumber, telegram_chat_id: telegramChatId }); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000); };
  const copyToClipboard = (text: string, message: string) => { navigator.clipboard.writeText(text); showToast({ title: "Berhasil disalin!", description: message, variant: "success" }); };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-black/40 flex items-center gap-1.5"><UserIcon className="size-3.5" /> Nama Lengkap</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Anda" className="w-full h-10 px-4 bg-[#60A8F8]/10 border border-black/5 rounded-full text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/10" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-black/40 flex items-center gap-1.5"><Phone className="size-3.5" /> WhatsApp</label>
        <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="Nomor WhatsApp (ex: +62812...)" className="w-full h-10 px-4 bg-[#60A8F8]/10 border border-black/5 rounded-full text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/10" />
        <p className="text-xs text-black/30">Masukkan nomor dengan kode negara (ex: +62812...).</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-black/40 flex items-center gap-1.5"><Send className="size-3.5" /> Telegram Chat ID</label>
        <input type="text" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Telegram Chat ID Anda" className="w-full h-10 px-4 bg-[#60A8F8]/10 border border-black/5 rounded-full text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/10" />
        <div className="flex flex-wrap items-center gap-2 text-xs text-black/60">
          <span>Chat dengan bot <a href={`https://t.me/${userData.telegram_bot_username}`} target="_blank" rel="noopener noreferrer" className="font-medium underline inline-flex items-center gap-1">@{userData.telegram_bot_username} <LinkIcon className="size-3" /></a> lalu /start.</span>
          {userData.telegram_chat_id && <button type="button" onClick={() => copyToClipboard(userData.telegram_chat_id!, "Chat ID Telegram disalin!")} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0059D0] text-white rounded-full text-xs hover:bg-[#60A8F8] transition-colors"><Copy className="size-3" /> Salin Chat ID</button>}
        </div>
      </div>

      <div className="pt-4 border-t border-black/5 flex flex-col gap-3">
        <button onClick={handleSave} disabled={isLoading} className="w-full h-11 bg-[#0059D0] text-white rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#60A8F8] disabled:opacity-50 transition-colors">
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan Profil
        </button>
        {saveSuccess && <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-[#0059D0] text-white rounded-2xl flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" /> Profil berhasil disimpan.</motion.div>}
      </div>
    </div>
  );
}
