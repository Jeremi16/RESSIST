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
    version: "v0.8.7",
    date: "18 Maret 2026",
    title: "Perbaikan Layout Notifikasi",
    description:
      "Penyempurnaan tampilan tab Notifikasi dengan test buttons untuk Telegram dan pengaturan yang lebih intuitif.",
    type: "patch",
    highlights: [
      "Tambah tombol Test Reminder dan Test Morning Briefing",
      "Feedback real-time saat mengirim test notifikasi",
      "Validasi status Telegram sebelum test",
      "Peningkatan visual pengaturan notifikasi",
    ],
    fixes: ["Perbaikan layout responsive di mobile"],
  },
  {
    version: "v0.8.6",
    date: "18 Maret 2026",
    title: "Perbaikan Layout LMS",
    description:
      "Optimasi tampilan pengaturan LMS untuk pengalaman konfigurasi yang lebih baik.",
    type: "patch",
    highlights: [
      "Penyempurnaan layout konfigurasi Moodle",
      "Peningkatan visual Google Classroom settings",
      "Perbaikan spacing dan alignment",
    ],
    fixes: [],
  },
  {
    version: "v0.8.5",
    date: "18 Maret 2026",
    title: "Perbaikan Layout Kelas",
    description:
      "Penambahan warning banner untuk fitur yang masih dalam pengembangan dan perbaikan visual.",
    type: "patch",
    highlights: [
      "Warning banner untuk fitur beta",
      "Informasi status pengembangan yang jelas",
      "Badge Beta Feature dan versi",
      "Peningkatan UX untuk ekspektasi pengguna",
    ],
    fixes: [],
  },
  {
    version: "v0.8.4",
    date: "18 Maret 2026",
    title: "Perbaikan Layout Profil",
    description:
      "Optimasi tampilan halaman profil untuk kemudahan akses pengaturan akun.",
    type: "patch",
    highlights: [
      "Penyempurnaan layout pengaturan profil",
      "Peningkatan visual form input",
      "Perbaikan responsive design",
    ],
    fixes: [],
  },
  {
    version: "v0.8.3",
    date: "18 Maret 2026",
    title: "Pengelompokkan Tugas",
    description:
      "Sistem pengelompokkan tugas yang lebih baik untuk memudahkan manajemen deadline.",
    type: "patch",
    highlights: [
      "Pengelompokkan tugas berdasarkan status",
      "Kategori: Terlewat, Akan Datang, Selesai",
      "Visual indicator untuk setiap kategori",
      "Filter dan sorting yang lebih baik",
    ],
    fixes: [],
  },
  {
    version: "v0.8.2",
    date: "18 Maret 2026",
    title: "Perbaikan Layout Tugas",
    description:
      "Peningkatan tampilan timeline tugas dengan visual yang lebih clean dan informatif.",
    type: "patch",
    highlights: [
      "Redesign kartu tugas dengan informasi lebih lengkap",
      "Peningkatan readability deadline dan status",
      "Perbaikan spacing dan hierarchy visual",
      "Optimasi untuk berbagai ukuran layar",
    ],
    fixes: [],
  },
  {
    version: "v0.8.1",
    date: "18 Maret 2026",
    title: "Perbaikan Layout Ringkasan",
    description:
      "Redesign tab Ringkasan dengan statistik tugas yang lebih informatif dan visual yang menarik.",
    type: "patch",
    highlights: [
      "4 kartu statistik: Terlewat, Akan Datang, Selesai, Total",
      "Progress bar untuk completion rate",
      "Animasi smooth dengan framer-motion",
      "Layout full-width untuk stats di atas",
      "Hover effects dan visual feedback",
    ],
    fixes: ["Perbaikan perhitungan statistik tugas"],
  },
  {
    version: "v0.8.0",
    date: "18 Maret 2026",
    title: "Penambahan Tab Tugas",
    description:
      "Tab baru khusus untuk manajemen tugas dengan timeline dan filter yang lebih lengkap.",
    type: "minor",
    highlights: [
      "Tab Tugas dengan timeline lengkap",
      "Filter berdasarkan status dan deadline",
      "Tombol sinkronisasi manual",
      "Tampilan kartu tugas yang informatif",
      "Mark as complete langsung dari timeline",
    ],
    fixes: [],
  },
  {
    version: "v0.7.0",
    date: "18 Maret 2026",
    title: "Tab Notifikasi Lengkap",
    description:
      "Pengaturan notifikasi yang komprehensif dengan fitur mute courses dan test buttons.",
    type: "minor",
    highlights: [
      "Pengaturan waktu pengingat (24h, 12h, 6h, 1h)",
      "Toggle Morning Briefing jam 07:00 WIB",
      "Fitur Bisukan Mata Kuliah",
      "Tombol test untuk Reminder dan Morning Briefing",
      "Change detection untuk efisiensi save",
    ],
    fixes: [],
  },
  {
    version: "v0.6.0",
    date: "18 Maret 2026",
    title: "Telegram Bot Integration",
    description:
      "Integrasi lengkap Telegram Bot dengan sistem verifikasi code untuk notifikasi tugas real-time.",
    type: "minor",
    highlights: [
      "Sistem verifikasi code 6 karakter",
      "Countdown timer 10 menit untuk code",
      "Copy code ke clipboard dengan satu klik",
      "Instruksi step-by-step yang jelas",
      "Link langsung ke bot Telegram",
      "Status koneksi real-time",
      "Toggle enable/disable notifikasi",
    ],
    fixes: [],
  },
  {
    version: "v0.5.1",
    date: "17 Maret 2026",
    title: "Smart Login & Stability",
    description:
      "Penyempurnaan alur login Google dan peningkatan stabilitas autentikasi antar perangkat.",
    type: "patch",
    highlights: [
      "Smart Google Login: Lewati consent screen untuk pengguna lama",
      "Fix race condition saat login di perangkat baru",
      "Peningkatan stabilitas sesi cross-subdomain",
    ],
    fixes: [
      "Perbaikan redirect loop pada middleware",
      "Sinkronisasi SESSION_SECRET antar modul",
    ],
  },
  {
    version: "v0.5.0",
    date: "16 Maret 2026",
    title: "Quick Access Dashboard",
    description:
      "Akses cepat ke tautan tugas langsung dari timeline dashboard tanpa perlu membuka detail.",
    type: "minor",
    highlights: [
      "Tombol 'Buka Tugas' langsung di timeline dashboard",
      "Navigasi antar tugas yang lebih efisien",
      "Penyelarasan visual identitas Resisst",
    ],
    fixes: ["Pembersihan redundansi header badge di semua tab"],
  },
  {
    version: "v0.4.2",
    date: "16 Maret 2026",
    title: "Mobile UI Optimization",
    description:
      "Perbaikan tampilan antarmuka (UI) pada mode mobile untuk aksesibilitas yang lebih baik.",
    type: "patch",
    highlights: [
      "Optimasi tampilan Timeline Tugas di HP",
      "Perbaikan skeleton loading untuk responsivitas mobile",
      "Penyesuaian padding dan layout untuk kenyamanan navigasi",
    ],
    fixes: ["Pencegahan teks countdown terpotong di mode mobile"],
  },
  {
    version: "v0.4.1",
    date: "16 Maret 2026",
    title: "Session & Auth Fix",
    description:
      "Perbaikan fitur auto-logout otomatis saat sesi pengguna telah berakhir untuk keamanan yang lebih baik.",
    type: "patch",
    highlights: [
      "Fix auto-logout otomatis saat session expired",
      "Peningkatan stabilitas manajemen sesi",
      "Redirect ke halaman login yang lebih mulus",
    ],
    fixes: [],
  },
  {
    version: "v0.4.0",
    date: "16 Maret 2026",
    title: "Tab Mata Kuliah & Reorganisasi",
    description:
      "Pembaruan tab Mata Kuliah serta rekomposisi fitur Alias dan Filter untuk alur kerja yang lebih intuitif.",
    type: "minor",
    highlights: [
      "Update tab Mata Kuliah dengan tampilan baru",
      "Rekomposisi fitur Course Alias agar lebih mudah diakses",
      "Penyempurnaan sistem Filter tugas",
      "Optimasi performa manajemen data mata kuliah",
    ],
    fixes: [],
  },
  {
    version: "v0.3.5",
    date: "16 Maret 2026",
    title: "Aliasing & Logic Fix",
    description:
      "Perbaikan kesalahan logika pada sistem alias mata kuliah untuk konsistensi data yang lebih baik.",
    type: "patch",
    highlights: [
      "Fix logic error pada sistem alias mata kuliah",
      "Peningkatan konsistensi nama alias di berbagai tampilan",
      "Sinkronisasi alias yang lebih stabil",
    ],
    fixes: [],
  },
  {
    version: "v0.3.4",
    date: "15 Maret 2026",
    title: "Perbaikan UI Navbar",
    description:
      "Peningkatan visibilitas logo dan ukuran teks di navbar untuk pengalaman pengguna yang lebih baik.",
    type: "patch",
    highlights: [
      "Logo navbar diperbesar untuk visibilitas lebih baik",
      "Ukuran teks 'Ressist by NODRYX' ditingkatkan",
      "Ukuran versi (v0.3.4) diperbesar dan lebih terbaca",
      "Ukuran icon logo R diperbesar",
    ],
    fixes: [],
  },
  {
    version: "v0.3.3",
    date: "15 Maret 2026",
    title: "Filter Kelas & Sinkronisasi",
    description:
      "Peningkatan pengelolaan tugas dengan filter berdasarkan kelas dan sinkronisasi otomatis saat login.",
    type: "patch",
    highlights: [
      "Filter tugas berdasarkan kode kelas (RA, RB, RC, dll)",
      "Auto-detect kode kelas dari judul tugas [XX]",
      "Sinkronisasi otomatis setelah login",
      "Setting kode kelas di profil pengguna",
    ],
    fixes: [],
  },
  {
    version: "v0.3.2",
    date: "15 Maret 2026",
    title: "Course Alias & Smart Update",
    description:
      "Fitur penamaan ulang mata kuliah dan optimasi update data agar lebih efisien.",
    type: "patch",
    highlights: [
      "Course alias untuk mengganti nama mata kuliah",
      "Pengaturan alias di halaman profil",
      "Smart update: hanya update data yang berubah",
      "Penghematan query database saat sinkronisasi",
    ],
    fixes: [],
  },
  {
    version: "v0.3.1",
    date: "15 Maret 2026",
    title: "Sorting & Notifikasi",
    description:
      "Penambahan opsi pengurutan tugas dan notifikasi untuk tugas baru.",
    type: "patch",
    highlights: [
      "Filter sorting tugas (deadline terdekat/terjauh, terbaru/terlama)",
      "Toast notification untuk tugas baru saat sinkronisasi",
      "Indikator jumlah tugas baru di response API",
      "Perbaikan backend untuk performa lebih baik",
    ],
    fixes: [],
  },
  {
    version: "v0.3.0",
    date: "15 Maret 2026",
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
    date: "15 Maret 2026",
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
    date: "15 Maret 2026",
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
    date: "13 Maret 2026",
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
      return <Rocket className="size-4" />;
    case "minor":
      return <Zap className="size-4" />;
    case "patch":
      return <Bug className="size-4" />;
    default:
      return <Code2 className="size-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "major":
      return "bg-black text-white";
    case "minor":
      return "bg-black text-white";
    case "patch":
      return "bg-white text-black border border-black/10";
    default:
      return "bg-white text-black border border-black/10";
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
      subtitle="Ikuti perkembangan Resisst dari awal hingga sekarang."
    >
      <div className="space-y-10">
        {/* Current Version Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black rounded-2xl p-6 sm:p-8 text-white"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-white text-black text-xs font-medium">
              Latest
            </span>
            <span className="text-white/60 text-sm">v0.8.7</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">
            Perbaikan Layout Notifikasi
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
            Tab Notifikasi kini dilengkapi dengan tombol test untuk Telegram, feedback real-time, dan pengaturan yang lebih intuitif.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-4 sm:left-5 top-0 bottom-0 w-px bg-black/5" />
          <div className="space-y-6">
            {VERSION_HISTORY.map((version, index) => (
              <motion.div
                key={version.version}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="relative pl-12 sm:pl-14"
              >
                <div
                  className={`absolute left-0 top-0 size-8 sm:size-9 rounded-xl ${getTypeColor(version.type)} flex items-center justify-center`}
                >
                  {getTypeIcon(version.type)}
                </div>

                <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-base sm:text-lg font-semibold text-black tracking-tight">
                          {version.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(version.type)}`}>
                          {getTypeLabel(version.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-black/40">
                        <span className="flex items-center gap-1.5 font-medium text-black">
                          <GitBranch className="size-3.5" />
                          {version.version}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-3.5" />
                          {version.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-black/60 leading-relaxed mb-5">
                    {version.description}
                  </p>

                  <div className="space-y-3">
                    <h4 className="text-xs font-medium tracking-wide text-black/40">
                      Fitur Baru
                    </h4>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {version.highlights.map((highlight, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-black/70 bg-[#F5F0EB] px-3 py-2.5 rounded-xl"
                        >
                          <CheckCircle2 className="size-4 text-black/30 shrink-0 mt-0.5" />
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
