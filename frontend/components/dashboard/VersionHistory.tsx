"use client";

import { motion } from "framer-motion";
import { 
  Rocket, 
  Settings, 
  History, 
  CheckCircle2, 
  Zap, 
  Bot,
  Clock,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const VERSIONS = [
  {
    version: "v0.8.7",
    date: "18 Maret 2026",
    title: "UI Expansion",
    changes: ["Perbaikan layout Notifikasi (Wider Container)"],
    icon: Sparkles,
    color: "text-brand-blue bg-brand-blue/10"
  },
  {
    version: "v0.8.6",
    date: "18 Maret 2026",
    title: "LMS Optimization",
    changes: ["Perbaikan layout LMS (3-Column Grid)"],
    icon: CheckCircle2,
    color: "text-green-600 bg-green-50"
  },
  {
    version: "v0.8.5",
    date: "18 Maret 2026",
    title: "Class Management",
    changes: ["Perbaikan layout kelas"],
    icon: Settings,
    color: "text-orange-600 bg-orange-50"
  },
  {
    version: "v0.8.4",
    date: "18 Maret 2026",
    title: "Modern Profile",
    changes: ["Perbaikan layout profil"],
    icon: Sparkles,
    color: "text-purple-600 bg-purple-50"
  },
  {
    version: "v0.8.3",
    date: "18 Maret 2026",
    title: "Task Organization",
    changes: ["Pengelompokkan tugas (Aktif, Terlewat, Selesai)"],
    icon: History,
    color: "text-blue-600 bg-blue-50"
  },
  {
    version: "v0.8.2",
    date: "18 Maret 2026",
    title: "Task Layout Refinement",
    changes: ["Perbaikan layout tugas"],
    icon: CheckCircle2,
    color: "text-green-600 bg-green-50"
  },
  {
    version: "v0.8.1",
    date: "18 Maret 2026",
    title: "Dashboard Overhaul",
    changes: ["Perbaikan layout ringkasan (Dashboard Premium)"],
    icon: Sparkles,
    color: "text-brand-blue bg-brand-blue/10"
  },
  {
    version: "v0.8.0",
    date: "18 Maret 2026",
    title: "Dedicated Task View",
    changes: ["Penambahan tab tugas"],
    icon: History,
    color: "text-purple-600 bg-purple-50"
  },
  {
    version: "v0.7.2",
    date: "17 Maret 2026",
    title: "Final Polish & Overdue Management",
    changes: [
      "Penanda tugas sudah selesai (Strikethrough)",
      "Popup otomatis untuk tugas yang melewati deadline saat login",
      "Pembaruan desain sidebar & navigasi dengan aksen Brand Dark",
      "Pembaruan fitur 'What's New' di Dashboard"
    ],
    icon: Sparkles,
    color: "text-brand-blue bg-brand-blue/10"
  },
  {
    version: "v0.7.1",
    date: "16 Maret 2026",
    title: "History & Tracking",
    changes: [
      "Penambahan fitur riwayat penyelesaian tugas",
      "Integrasi status real-time antara Timeline dan History",
      "Pembaruan sistem sorting deadline"
    ],
    icon: History,
    color: "text-purple-600 bg-purple-50"
  },
  {
    version: "v0.7.0",
    date: "15 Maret 2026",
    title: "Task Management Suite",
    changes: [
      "Tab 'Tugas' baru untuk kontrol tugas yang lebih baik",
      "Pemisahan manajemen tugas dari ringkasan utama",
      "Pembaruan icon bot menjadi Robot untuk identitas yang lebih kuat"
    ],
    icon: CheckCircle2,
    color: "text-green-600 bg-green-50"
  },
  {
    version: "v0.6.1",
    date: "12 Maret 2026",
    title: "Maintenance Patch",
    changes: [
      "Patch update untuk schedule morning briefing",
      "Perbaikan bug pada sinkronisasi waktu kalender"
    ],
    icon: Settings,
    color: "text-orange-600 bg-orange-50"
  },
  {
    version: "v0.6.0",
    date: "10 Maret 2026",
    title: "Bot Telegram Berjalan",
    changes: [
      "Bot Telegram sudah aktif dan bisa berjalan",
      "Fitur scheduling otomatis untuk pengingat tugas",
      "Sistem otentikasi via Telegram Chat ID"
    ],
    icon: Bot,
    color: "text-blue-600 bg-blue-50"
  }
];

export function VersionHistory() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      <div className="relative border-l-2 border-slate-100 ml-4 sm:ml-6 pl-8 sm:pl-10 space-y-12">
        {VERSIONS.map((v, idx) => (
          <motion.div 
            key={v.version}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="relative"
          >
            {/* Dot & Icon */}
            <div className={cn(
              "absolute -left-[45px] sm:-left-[53px] top-0 size-10 sm:size-12 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white z-10",
              v.color
            )}>
              <v.icon className="size-5 sm:size-6" />
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-xl sm:text-2xl font-black text-brand-dark tracking-tight">
                  {v.version}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg w-fit">
                  {v.date}
                </span>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group">
                <h4 className="text-lg font-black text-brand-dark mb-4 group-hover:text-brand-blue transition-colors">
                  {v.title}
                </h4>
                <ul className="space-y-3">
                  {v.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-500 leading-relaxed font-medium">
                      <div className="size-1.5 rounded-full bg-brand-blue mt-2 shrink-0" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 text-[11px] font-bold text-slate-400">
          <Rocket className="size-3.5" />
          More updates coming soon
        </div>
      </div>
    </div>
  );
}
