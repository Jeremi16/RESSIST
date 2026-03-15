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
    version: "v0.3.0",
    date: "Maret 2026",
    title: "Pembaruan UX",
    description:
      "Rilis minor yang berfokus pada peningkatan pengalaman pengguna di mobile dan penyederhanaan alur interaksi utama.",
    type: "minor",
    highlights: [
      "Perbaikan responsivitas di halaman-halaman informasi",
      "Penyempurnaan tata letak Whats New di mobile",
      "Navigasi dan hierarki visual dibuat lebih konsisten",
      "Peningkatan keterbacaan tombol, kartu, dan konten utama",
    ],
    fixes: [],
  },
  {
    version: "v0.2.1",
    date: "Maret 2026",
    title: "Perbaikan Alur Login",
    description:
      "Patch untuk memperbaiki pengguna yang sempat nyangkut di halaman login setelah autentikasi berhasil.",
    type: "patch",
    highlights: [
      "Perbaikan redirect setelah login agar langsung menuju dashboard",
      "Pengalaman login lebih mulus tanpa langkah tambahan",
      "Penanganan sinkronisasi sesi dibuat lebih stabil",
    ],
    fixes: [],
  },
  {
    version: "v0.2.0",
    date: "Maret 2026",
    title: "Pembaruan Tampilan Depan",
    description:
      "Rilis minor yang membawa penyegaran tampilan halaman depan agar lebih modern, jelas, dan nyaman dipakai.",
    type: "minor",
    highlights: [
      "Penyegaran desain landing page",
      "Peningkatan keterbacaan konten utama",
      "Navigasi halaman depan dibuat lebih jelas",
      "Peningkatan konsistensi visual antar komponen",
    ],
    fixes: [],
  },
  {
    version: "v0.1.0",
    date: "Maret 2025",
    title: "Beta Release",
    description:
      "Fase pengujian internal dengan closed beta untuk mahasiswa terpilih.",
    type: "major",
    highlights: [
      "Dashboard tugas dengan tampilan kalender",
      "Integrasi Moodle ITERA",
      "Autentikasi Google OAuth",
      "Tampilan UI/UX yang modern dan responsif",
    ],
    fixes: [],
  },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case "major":
      return <Rocket className="size-4 sm:size-5" />;
    case "minor":
      return <Zap className="size-4 sm:size-5" />;
    case "patch":
      return <Bug className="size-4 sm:size-5" />;
    default:
      return <Code2 className="size-4 sm:size-5" />;
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

export default function Version() {
  return (
    <InfoLayout
      category="Changelog"
      title="Perjalanan Versi"
      subtitle="Ikuti perkembangan Ressist dari awal hingga sekarang."
    >
      <div className="space-y-8 sm:space-y-12">
        {/* Current Version Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8 text-white"
        >
          <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
                Latest
              </span>
              <span className="text-blue-100 text-xs sm:text-sm font-medium">
                v0.3.0
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-2">
              Versi Terbaru
            </h2>
            <p className="text-blue-100 text-sm sm:text-base max-w-lg leading-relaxed">
              Fokus pembaruan terbaru ada pada peningkatan UX agar navigasi,
              keterbacaan, dan pengalaman mobile terasa lebih nyaman.
            </p>
          </div>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 sm:left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 via-slate-200 to-transparent" />

          {/* Version Entries */}
          <div className="space-y-6 sm:space-y-8">
            {VERSION_HISTORY.map((version, index) => (
              <motion.div
                key={version.version}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-12 sm:pl-16 md:pl-20"
              >
                {/* Icon */}
                <div
                  className={`absolute left-0 sm:left-0 md:left-1 top-0 size-8 sm:size-12 md:size-14 rounded-xl sm:rounded-2xl ${getTypeColor(version.type)} flex items-center justify-center shadow-lg`}
                >
                  {getTypeIcon(version.type)}
                </div>

                {/* Content Card */}
                <div className="bg-white rounded-[1.25rem] sm:rounded-[1.5rem] border border-slate-100 p-4 sm:p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 mb-4">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 leading-tight">
                          {version.title}
                        </h3>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getTypeColor(version.type)}`}
                        >
                          {getTypeLabel(version.type)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
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
                  <p className="text-slate-600 text-sm sm:text-base mb-5 sm:mb-6 leading-relaxed">
                    {version.description}
                  </p>

                  {/* Highlights */}
                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-400">
                      Fitur Baru
                    </h4>
                    <ul className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
                      {version.highlights.map((highlight, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 sm:gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl"
                        >
                          <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </InfoLayout>
  );
}
