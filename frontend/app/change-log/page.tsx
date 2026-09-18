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

const APK_VERSION = "v0.2.1";
const APK_NAME = "ressist-0.2.1-release.apk";
const APK_PATH = `https://github.com/Jeremi16/RESSIST/releases/download/${APK_VERSION}/${APK_NAME}`;
const APK_SIZE = "3.41 MB";
const APK_RELEASED = "18 September 2026";
const APK_MIN_ANDROID = "Android 8.0 atau lebih tinggi";

const V020_VERSION = "v0.2.0";
const V020_NAME = "ressist-0.2.0-release.apk";
const V020_PATH = `https://github.com/Jeremi16/RESSIST/releases/download/${V020_VERSION}/${V020_NAME}`;
const V020_SIZE = "3.41 MB";
const V020_RELEASED = "18 September 2026";

const V010_VERSION = "v0.1.0";
const V010_NAME = "ressist-0.1.0-release.apk";
const V010_PATH = `https://github.com/Jeremi16/RESSIST/releases/download/${V010_VERSION}/${V010_NAME}`;
const V010_SIZE = "2.86 MB";
const V010_RELEASED = "18 September 2026";

const SIDEBAR = docsSidebar([
  { label: "v0.2.1", to: "#v0-2-1" },
  { label: "v0.2.0", to: "#v0-2-0" },
  { label: "v0.1.0", to: "#v0-1-0" },
]);

const V021_HIGHLIGHTS = [
  "Badge Classroom di kartu Tugas dihapus agar tampilan kartu bersih.",
  "Tombol Back HP kini kembali ke menu sebelumnya, tidak langsung keluar aplikasi.",
  `Ringan — hanya sekitar ${APK_SIZE}.`,
];

const V020_HIGHLIGHTS = [
  "Rebrand putih-biru dengan logo R Ressist di seluruh aplikasi.",
  "Tab Tugas ala Mihon: tab + badge angka + tombol sinkron.",
  "Morning Briefing jam 07:00 WIB via notifikasi lokal Android.",
  "Tab Lainnya baru + halaman Tentang; Kelas dipecah jadi Mata Kuliah & Filter Kelas.",
  `Ringan — hanya sekitar ${APK_SIZE}.`,
];

const V010_HIGHLIGHTS = [
  "Rilis perdana aplikasi Android Ressist.",
  "Login dan sinkronisasi tugas Moodle (kuliah2.itera.ac.id) & Google Classroom.",
  "Pengingat deadline otomatis langsung di HP.",
  `Ringan — hanya sekitar ${APK_SIZE}.`,
];

export default function ChangeLog() {
  return (
    <DocsLayout
      versionLabel={APK_VERSION}
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
            <span className="text-white/60 text-sm">{APK_VERSION}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">
            Kartu Bersih & Navigasi Rapi
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
            Kartu Tugas tanpa badge Classroom yang mengganggu, dan tombol
            Back HP kini kembali ke menu sebelumnya.
          </p>
        </motion.div>

        {/* Entri v0.2.1 */}
        <motion.section
          id="v0-2-1"
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
                  Kartu Bersih & Navigasi Rapi
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-black/40">
                  <span className="flex items-center gap-1.5 font-medium text-black">
                    <Tag className="size-3.5" />
                    {APK_VERSION}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    {APK_RELEASED}
                  </span>
                </div>
              </div>
              <a
                href={APK_PATH}
                download={APK_NAME}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0059D0] text-white text-sm font-medium hover:bg-[#60A8F8] transition-colors"
              >
                <Download className="size-4" />
                Download ({APK_SIZE})
              </a>
            </div>

            <p className="text-sm text-black/60 leading-relaxed mb-5">
              Versi terbaru aplikasi Android ({APK_MIN_ANDROID}). Update
              langsung timpa versi lama, tidak perlu uninstall.
            </p>

            <h4 className="text-xs font-medium tracking-wide text-black/40 mb-2.5">
              Yang Baru
            </h4>
            <ul className="grid gap-2 sm:grid-cols-2">
              {V021_HIGHLIGHTS.map((item) => (
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

        {/* Entri v0.2.0 */}
        <motion.section
          id="v0-2-0"
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
                  Rebrand Biru & Pengingat Lokal
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-black/40">
                  <span className="flex items-center gap-1.5 font-medium text-black">
                    <Tag className="size-3.5" />
                    {APK_VERSION}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    {APK_RELEASED}
                  </span>
                </div>
              </div>
              <a
                href={APK_PATH}
                download={APK_NAME}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0059D0] text-white text-sm font-medium hover:bg-[#60A8F8] transition-colors"
              >
                <Download className="size-4" />
                Download ({APK_SIZE})
              </a>
            </div>

            <p className="text-sm text-black/60 leading-relaxed mb-5">
              Versi aplikasi Android ({APK_MIN_ANDROID}). Update
              langsung timpa versi lama, tidak perlu uninstall.
            </p>

            <h4 className="text-xs font-medium tracking-wide text-black/40 mb-2.5">
              Yang Baru
            </h4>
            <ul className="grid gap-2 sm:grid-cols-2">
              {V020_HIGHLIGHTS.map((item) => (
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

        {/* Entri v0.1.0 */}
        <motion.section
          id="v0-1-0"
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
                  Rilis Perdana Aplikasi Android
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm text-black/40">
                  <span className="flex items-center gap-1.5 font-medium text-black">
                    <Tag className="size-3.5" />
                    {V020_VERSION}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    {V020_RELEASED}
                  </span>
                </div>
              </div>
              <a
                href={V020_PATH}
                download={V020_NAME}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0059D0] text-white text-sm font-medium hover:bg-[#60A8F8] transition-colors"
              >
                <Download className="size-4" />
                Download ({V020_SIZE})
              </a>
            </div>

            <p className="text-sm text-black/60 leading-relaxed mb-5">
              Versi pertama aplikasi Android ({APK_MIN_ANDROID}). Semua yang
              kamu butuhkan untuk tidak ketinggalan deadline — dalam genggaman.
            </p>

            <h4 className="text-xs font-medium tracking-wide text-black/40 mb-2.5">
              Yang Baru
            </h4>
            <ul className="grid gap-2 sm:grid-cols-2">
              {V010_HIGHLIGHTS.map((item) => (
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
