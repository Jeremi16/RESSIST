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

const APK_VERSION = "v0.1.0";
const APK_NAME = "ressist-0.1.0-release.apk";
const APK_PATH = `/downloads/${APK_NAME}`;
const APK_SIZE = "2.86 MB";
const APK_RELEASED = "18 September 2026";
const APK_MIN_ANDROID = "Android 8.0 atau lebih tinggi";

const SIDEBAR = docsSidebar([{ label: "v0.1.0", to: "#v0-1-0" }]);

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
            Rilis Perdana Aplikasi Android
          </h2>
          <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
            Ressist kini hadir sebagai aplikasi Android: login, sinkronkan
            tugas, dan terima pengingat deadline langsung di HP.
          </p>
        </motion.div>

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
