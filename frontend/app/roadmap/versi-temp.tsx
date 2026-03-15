"use client";

import { InfoLayout } from "@/components/InfoLayout";
import { motion } from "framer-motion";
import {
  Rocket,
  Zap,
  Bug,
  Code2,
  CheckCircle2,
  Calendar,
  GitBranch,
} from "lucide-react";

interface VersionEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  type: "major" | "minor" | "patch";
  highlights: string[];
  fixes?: string[];
}

const VERSION_HISTORY: VersionEntry[] = [
  {
    version: "v0.1.0",
    date: "Maret 2025",
    title: "Beta Release",
    description:
      "Peluncuran versi beta pertama dengan fitur-fitur inti untuk membantu mahasiswa mengelola tugas.",
    type: "major",
    highlights: [
      "Dashboard tugas dengan tampilan kalender",
      "Integrasi Moodle ITERA",
      "Notifikasi WhatsApp real-time",
      "Sinkronisasi Google Calendar",
      "Autentikasi Google OAuth",
      "Tampilan UI/UX yang modern dan responsif",
    ],
    fixes: [],
  },
  {
    version: "v0.0.5",
    date: "Februari 2025",
    title: "Pre-release Testing",
    description:
      "Fase pengujian internal dengan closed beta untuk mahasiswa terpilih.",
    type: "minor",
    highlights: [
      "Sistem autentikasi dengan JWT",
      "Database PostgreSQL dengan Prisma",
      "API endpoints untuk manajemen tugas",
    ],
  },
  {
    version: "v0.0.1",
    date: "Januari 2025",
    title: "Project Init",
    description:
      "Awal mula pengembangan Ressist sebagai solusi untuk mahasiswa ITERA.",
    type: "patch",
    highlights: [
      "Setup project dengan Next.js dan TypeScript",
      "Integrasi Baileys untuk WhatsApp",
      "Riset kebutuhan mahasiswa",
    ],
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case "major":
      return <Rocket className="size-5" />;
    case "minor":
      return <Zap className="size-5" />;
    case "patch":
      return <Bug className="size-5" />;
    default:
      return <Code2 className="size-5" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "major":
      return "bg-blue-500 text-white";
    case "minor":
      return "bg-amber-500 text-white";
    case "patch":
      return "bg-slate-500 text-white";
    default:
      return "bg-slate-500 text-white";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "major":
      return "Major";
    case "minor":
      return "Minor";
    case "patch":
      return "Patch";
    default:
      return "Dev";
  }
};

export default function Versi() {
  return (
    <InfoLayout
      category="Changelog"
      title="Perjalanan Versi"
      subtitle="Ikuti perkembangan Ressist dari awal hingga sekarang."
    >
      <div className="space-y-12">
        {/* Current Version Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2rem] p-8 text-white"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
                Latest
              </span>
              <span className="text-blue-100 text-sm font-medium">v0.3.0</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-2">
              Versi Terbaru
            </h2>
            <p className="text-blue-100 max-w-lg">
              Ressist saat ini dalam fase beta publik. Bantu kami meningkatkan
              dengan memberikan feedback dan melaporkan bug yang kamu temui.
            </p>
          </div>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 via-slate-200 to-transparent" />

          {/* Version Entries */}
          <div className="space-y-8">
            {VERSION_HISTORY.map((version, index) => (
              <motion.div
                key={version.version}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-16 md:pl-20"
              >
                {/* Icon */}
                <div
                  className={`absolute left-0 md:left-1 top-0 size-12 md:size-14 rounded-2xl ${getTypeColor(version.type)} flex items-center justify-center shadow-lg`}
                >
                  {getTypeIcon(version.type)}
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-[1.5rem] border border-slate-100 p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl md:text-2xl font-black text-slate-900">
                          {version.title}
                        </h3>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getTypeColor(version.type)}`}
                        >
                          {getTypeLabel(version.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5 font-semibold text-blue-600">
                          <GitBranch className="size-4" />
                          {version.version}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-4" />
                          {version.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 mb-6 leading-relaxed">
                    {version.description}
                  </p>

                  {/* Highlights */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      Fitur Baru
                    </h4>
                    <ul className="grid md:grid-cols-2 gap-3">
                      {version.highlights.map((highlight, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl"
                        >
                          <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Fixes (if any) */}
                  {version.fixes && version.fixes.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Bug className="size-4" />
                        Perbaikan Bug
                      </h4>
                      <ul className="space-y-2">
                        {version.fixes.map((fix, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm text-slate-600"
                          >
                            <CheckCircle2 className="size-4 text-blue-500 shrink-0 mt-0.5" />
                            {fix}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Coming Soon */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-500 text-sm font-medium">
            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
            Terus berkembang...
          </div>
          <p className="mt-4 text-slate-400 text-sm">
            Stay tuned untuk update menarik berikutnya! 🚀
          </p>
        </motion.div>
      </div>
    </InfoLayout>
  );
}
