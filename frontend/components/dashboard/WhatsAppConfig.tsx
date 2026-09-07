"use client";

import { MessageSquare } from "lucide-react";

export function WhatsAppConfig() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-14 bg-black text-white rounded-2xl flex items-center justify-center mb-4">
        <MessageSquare className="size-7" />
      </div>
      <h3 className="text-base font-semibold text-black mb-2">WhatsApp Coming Soon</h3>
      <p className="text-sm text-black/60 max-w-xs leading-relaxed">Kami sedang menyiapkan integrasi WhatsApp Bot agar notifikasi tugasmu semakin mudah diakses.</p>
      <div className="mt-6 px-3 py-1.5 bg-black text-white text-xs font-medium rounded-full">Tahap Pengembangan</div>
    </div>
  );
}
