"use client";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  Download,
  Rocket,
  Tag,
} from "lucide-react";
import {
  DocsLayout,
} from "@/components/DocsLayout";
import { docsSidebar } from "@/components/docs-sidebar";

const APK_VERSION = "v0.3.0";
const APK_NAME = "ressist-0.3.0-code6-release.apk";
const APK_PATH = `https://github.com/Jeremi16/RESSIST-MOBILE/releases/download/${APK_VERSION}/${APK_NAME}`;
const APK_SIZE = "3.42 MB"; // TODO(rilis): sesuaikan dengan ukuran APK v0.3.0 dari CI.
const APK_RELEASED = "20 September 2026";
const APK_MIN_ANDROID = "Android 8.0 atau lebih tinggi";

const V023_VERSION = "v0.2.3";
const V023_NAME = "ressist-0.2.3-code5-release.apk";
const V023_PATH = `https://github.com/Jeremi16/RESSIST-MOBILE/releases/download/${V023_VERSION}/${V023_NAME}`;
const V023_SIZE = "3.42 MB";
const V023_RELEASED = "20 September 2026";

const V021_VERSION = "v0.2.1";
const V021_NAME = "ressist-0.2.1-code3-release.apk";
const V021_PATH = `https://github.com/Jeremi16/RESSIST-MOBILE/releases/download/${V021_VERSION}/${V021_NAME}`;
const V021_SIZE = "3.41 MB";
const V021_RELEASED = "18 September 2026";

const V020_VERSION = "v0.2.0";
const V020_NAME = "ressist-0.2.0-code2-release.apk";
const V020_PATH = `https://github.com/Jeremi16/RESSIST-MOBILE/releases/download/${V020_VERSION}/${V020_NAME}`;
const V020_SIZE = "3.41 MB";
const V020_RELEASED = "18 September 2026";

const V010_VERSION = "v0.1.0";
const V010_NAME = "ressist-0.1.0-code1-release.apk";
const V010_PATH = `https://github.com/Jeremi16/RESSIST-MOBILE/releases/download/${V010_VERSION}/${V010_NAME}`;
const V010_SIZE = "2.86 MB";
const V010_RELEASED = "18 September 2026";

type ReleaseEntry = {
  id: string;
  version: string;
  fileName: string;
  filePath: string;
  size: string;
  released: string;
  title: string;
  description: string;
  highlights: string[];
};

// Single source of truth — urutan terbaru dulu. Menambah rilis baru
// cukup tambah 1 objek di sini; sidebar + section ikut otomatis.
const RELEASES: ReleaseEntry[] = [
  {
    id: "v0-3-0",
    version: APK_VERSION,
    fileName: APK_NAME,
    filePath: APK_PATH,
    size: APK_SIZE,
    released: APK_RELEASED,
    title: "Sinkronisasi Otomatis",
    description: `Versi terbaru aplikasi Android (${APK_MIN_ANDROID}). Update langsung timpa versi lama, tidak perlu uninstall.`,
    highlights: [
      "Sinkronisasi otomatis berkala: tiap 1/3/6/12 jam atau manual, selalu force Moodle & Classroom.",
      "Layar baru Lainnya → Sinkronisasi: jadwal, mode WiFi-only, status, dan tombol sync manual.",
      "Notifikasi saat ada tugas baru + status Terakhir sync di Ringkasan.",
      "Pengaturan sync pindah dari tab Pengingat; tombol Manual kini full-width.",
      `Ringan — hanya sekitar ${APK_SIZE}.`,
    ],
  },
  {
    id: "v0-2-3",
    version: V023_VERSION,
    fileName: V023_NAME,
    filePath: V023_PATH,
    size: V023_SIZE,
    released: V023_RELEASED,
    title: "Cek Pembaruan Otomatis",
    description: `Versi terbaru aplikasi Android (${APK_MIN_ANDROID}). Update langsung timpa versi lama, tidak perlu uninstall.`,
    highlights: [
      "Cek Pembaruan di Tentang: aplikasi tahu sendiri kalau ada versi baru.",
      "Notifikasi otomatis + unduh dan install langsung dari aplikasi.",
      "Tampilan Tentang baru: Versi, Cek Pembaruan, dan Yang Baru.",
      `Ringan — hanya sekitar ${APK_SIZE}.`,
    ],
  },
  {
    id: "v0-2-2",
    version: "v0.2.2",
    fileName: "ressist-0.2.2-code4-release.apk",
    filePath: `https://github.com/Jeremi16/RESSIST-MOBILE/releases/download/v0.2.2/ressist-0.2.2-code4-release.apk`,
    size: "3.41 MB",
    released: "19 September 2026",
    title: "Kelas Terpisah & Lainnya Rapi",
    description: `Versi aplikasi Android (${APK_MIN_ANDROID}). Update langsung timpa versi lama, tidak perlu uninstall.`,
    highlights: [
      "Mata Kuliah dan Filter Kelas kini layar terpisah berheader sendiri, tanpa tab.",
      "Kartu beta dihapus; statistik tampil per layar sesuai konteks.",
      "Header Lainnya disederhanakan — logo saja, versi tetap ada di Tentang.",
      "Ringan — hanya sekitar 3.41 MB.",
    ],
  },
  {
    id: "v0-2-1",
    version: V021_VERSION,
    fileName: V021_NAME,
    filePath: V021_PATH,
    size: V021_SIZE,
    released: V021_RELEASED,
    title: "Kartu Bersih & Navigasi Rapi",
    description: `Versi aplikasi Android (${APK_MIN_ANDROID}). Update langsung timpa versi lama, tidak perlu uninstall.`,
    highlights: [
      "Badge Classroom di kartu Tugas dihapus agar tampilan kartu bersih.",
      "Tombol Back HP kini kembali ke menu sebelumnya, tidak langsung keluar aplikasi.",
      `Ringan — hanya sekitar ${V021_SIZE}.`,
    ],
  },
  {
    id: "v0-2-0",
    version: V020_VERSION,
    fileName: V020_NAME,
    filePath: V020_PATH,
    size: V020_SIZE,
    released: V020_RELEASED,
    title: "Rebrand Biru & Pengingat Lokal",
    description: `Versi aplikasi Android (${APK_MIN_ANDROID}). Update langsung timpa versi lama, tidak perlu uninstall.`,
    highlights: [
      "Rebrand putih-biru dengan logo R Ressist di seluruh aplikasi.",
      "Tab Tugas ala Mihon: tab + badge angka + indikator animasi + tombol sinkron.",
      "Ringkasan: kartu statistik tonal, kartu Status Koneksi dihapus.",
      "Morning Briefing jam 07:00 WIB via notifikasi lokal Android.",
      "Tab Lainnya ala Mihon + halaman Tentang.",
      "Kelas dipecah jadi Mata Kuliah & Filter Kelas.",
      "Status Sistem: cek izin real-time + tombol ke Setelan.",
      `Ringan — hanya sekitar ${V020_SIZE}.`,
    ],
  },
  {
    id: "v0-1-0",
    version: V010_VERSION,
    fileName: V010_NAME,
    filePath: V010_PATH,
    size: V010_SIZE,
    released: V010_RELEASED,
    title: "Rilis Perdana Aplikasi Android",
    description: `Versi pertama aplikasi Android (${APK_MIN_ANDROID}). Semua yang kamu butuhkan untuk tidak ketinggalan deadline — dalam genggaman.`,
    highlights: [
      "Ringkasan tugas: Terlewat, Akan Datang, dan Selesai.",
      "Daftar tugas + tandai selesai langsung dari aplikasi.",
      "Kalender deadline agar tidak ketinggalan jadwal.",
      "Koneksi Moodle (kuliah2.itera.ac.id) & Google Classroom.",
      "Pengingat otomatis sebelum deadline langsung di HP.",
      `Ringan — hanya sekitar ${V010_SIZE}.`,
    ],
  },
];

const LATEST = RELEASES[0];

const SIDEBAR = docsSidebar(
  RELEASES.map((r) => ({ label: r.version, to: `#${r.id}` })),
);

function ReleaseSection({ entry }: { entry: ReleaseEntry }) {
  return (
    <motion.section
      id={entry.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="scroll-mt-24 relative pl-12 sm:pl-14"
    >
      <div className="absolute left-0 top-0 size-8 sm:size-9 rounded-xl bg-[#0059D0] text-white flex items-center justify-center">
        <Rocket className="size-4" />
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-black tracking-tight mb-1.5">
              {entry.title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-black/40">
              <span className="flex items-center gap-1.5 font-medium text-black">
                <Tag className="size-3.5" />
                {entry.version}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {entry.released}
              </span>
            </div>
          </div>
          <a
            href={entry.filePath}
            download={entry.fileName}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0059D0] text-white text-sm font-medium hover:bg-[#60A8F8] transition-colors"
          >
            <Download className="size-4" />
            Download ({entry.size})
          </a>
        </div>

        <p className="text-sm text-black/60 leading-relaxed mb-5">
          {entry.description}
        </p>

        <h4 className="text-xs font-medium tracking-wide text-black/40 mb-2.5">
          Yang Baru
        </h4>
        <ul className="grid gap-2 sm:grid-cols-2">
          {entry.highlights.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-black/70 bg-[#60A8F8]/10 px-3 py-2.5 rounded-xl"
            >
              <Check className="size-4 text-[#0059D0] shrink-0 mt-0.5" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}

export default function ChangeLog() {
  return (
    <DocsLayout
      versionLabel={LATEST.version}
      downloadHref={`/app#stabil`}
      sidebar={SIDEBAR}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black mb-3">
            Changelog
          </h1>
          <p className="text-sm sm:text-base text-black/60 leading-relaxed">
            Ikuti perkembangan aplikasi Android Ressist dari rilis ke rilis.
          </p>
        </div>

        {/* Banner versi terbaru */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0059D0] rounded-2xl p-6 sm:p-8 text-white"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-white text-black text-xs font-medium">
              Latest
            </span>
            <span className="text-white/60 text-sm">{LATEST.version}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">
            {LATEST.title}
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
            Aplikasi kini tersinkron otomatis dari Moodle & Classroom,
            memberi tahu saat ada tugas baru, dan semua pengaturannya
            ada di Lainnya → Sinkronisasi.
          </p>
        </motion.div>

        {RELEASES.map((entry) => (
          <ReleaseSection key={entry.id} entry={entry} />
        ))}

        {/* Penutup */}
        <section className="bg-[#60A8F8]/10 rounded-2xl px-5 py-4">
          <p className="text-sm text-black/60 leading-relaxed">
            Belum install aplikasinya? Lihat{" "}
            <Link
              to="/app"
              className="text-[#0059D0] font-medium hover:underline"
            >
              halaman download
            </Link>{" "}
            untuk cara install dan file APK terbaru.
          </p>
        </section>
      </div>
    </DocsLayout>
  );
}
