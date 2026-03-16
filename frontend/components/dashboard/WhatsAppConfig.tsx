"use client";

import { MessageSquare } from "lucide-react";

export function WhatsAppConfig() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="size-20 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mb-6 animate-pulse">
        <MessageSquare className="size-10" />
      </div>
      <h3 className="text-2xl font-black text-slate-900 mb-2">
        WhatsApp Coming Soon!
      </h3>
      <p className="text-slate-500 max-w-sm font-medium">
        Kami sedang bekerja keras untuk menghadirkan integrasi WhatsApp Bot agar notifikasi tugasmu semakin mudah diakses.
      </p>
      <div className="mt-8 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
        Tahap Pengembangan
      </div>
    </div>
  );
}
