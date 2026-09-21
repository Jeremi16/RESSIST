"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  Copy,
  Download,
  Globe,
  Smartphone,
  Tag,
  TriangleAlert,
  Zap,
} from "lucide-react";
import {
  DocsLayout,
} from "@/components/DocsLayout";
import { docsSidebar } from "@/components/docs-sidebar";

// Fallback saat GitHub API tak terjangkau / rate-limit. WAJIB sinkron dengan
// mobile-kmp/androidApp/build.gradle.kts (versionCode/versionName) dan nama
// file rilis RESSIST-MOBILE: ressist-X.Y.Z-codeN-release.apk.
const FALLBACK_VERSION = "v0.3.2";
const FALLBACK_NAME = "ressist-0.3.2-code8-release.apk";
const FALLBACK_SIZE = "3.44 MB";
const FALLBACK_RELEASED = "September 2026";
// SHA asli APK v0.3.1 (dari GitHub API). WAJIB diganti ke SHA v0.3.2 dari
// SHA256SUMS.txt lewat commit susulan "chore(web)" setelah CI rilis.
const FALLBACK_SHA256 =
  "0f0a8e95e387e31c4a348172bc55672d159eeac141241df24c79873f873a7242";
const APK_MIN_ANDROID = "Android 8.0 atau lebih tinggi";
const RELEASES_REPO = "Jeremi16/RESSIST-MOBILE";
const LATEST_API = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`;

type LiveRelease = {
  version: string;
  name: string;
  url: string;
  size: string;
  released: string;
  htmlUrl: string;
};

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return FALLBACK_SIZE;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return FALLBACK_RELEASED;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const SIDEBAR = docsSidebar([
  { label: "Rilis Stabil", to: "#stabil" },
  { label: "Detail File", to: "#detail" },
  { label: "Cara Install", to: "#install" },
  { label: "FAQ", to: "#faq" },
]);

const CHANGELOG = [
  "Sesi anti-logout: tetap login saat sinyal tidak stabil atau server sibuk.",
  "Sinkron latar belakang tidak lagi memutus sesi.",
  "Halaman download otomatis ikut rilis GitHub terbaru + panduan Play Protect.",
];

const INSTALL_STEPS = [
  {
    step: "1",
    title: "Download file APK",
    description:
      "Ketuk tombol download di halaman ini dan tunggu hingga file selesai terunduh.",
  },
  {
    step: "2",
    title: "Izinkan instalasi",
    description:
      'Saat diminta, izinkan "Install unknown apps" untuk browser yang kamu pakai. Kalau Play Protect muncul, ketuk "More details / Selengkapnya" lalu "Install anyway / Tetap install" — wajar untuk aplikasi sideload yang belum ada di Play Store.',
  },
  {
    step: "3",
    title: "Buka file & install",
    description:
      "Buka file APK dari notifikasi download atau folder Download, lalu ketuk Install.",
  },
  {
    step: "4",
    title: "Login & sinkronkan",
    description:
      "Buka aplikasi Ressist, login dengan akunmu, lalu sinkronkan Moodle dan Google Classroom.",
  },
];

const HIGHLIGHTS = [
  {
    icon: <Zap className="size-5" />,
    title: "Sinkron kilat",
    description:
      "Tugas dari Moodle (kuliah2.itera.ac.id) & Google Classroom masuk dalam hitungan detik.",
  },
  {
    icon: <Bell className="size-5" />,
    title: "Pengingat otomatis",
    description:
      "Dapat notifikasi sebelum deadline plus Morning Briefing tiap jam 07:00 WIB.",
  },
  {
    icon: <Smartphone className="size-5" />,
    title: "Ringan di HP",
    description:
      "Hanya sekitar 3–4 MB. Dibuat untuk dipakai harian tanpa memberatkan memori.",
  },
];

export default function AppDownload() {
  const [copied, setCopied] = useState(false);
  // Data live dari GitHub Release (sumber yang sama dengan update-checker HP).
  // Fallback ke konstanta di atas bila offline / rate-limit (60 req/jam tanpa token).
  const [live, setLive] = useState<LiveRelease | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LATEST_API, {
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) return;
        const json = await res.json();
        const assets: Array<{ name?: string; browser_download_url?: string; size?: number }> =
          json.assets ?? [];
        const apk = assets.find((a) => a.name?.toLowerCase().endsWith(".apk"));
        if (!apk?.browser_download_url || !apk?.name) return;
        if (!cancelled) {
          setLive({
            version: json.tag_name ?? FALLBACK_VERSION,
            name: apk.name,
            url: apk.browser_download_url,
            size: formatSize(apk.size ?? 0),
            released: formatDate(json.published_at ?? ""),
            htmlUrl: json.html_url ?? `https://github.com/${RELEASES_REPO}/releases/latest`,
          });
        }
      } catch {
        // offline / diblokir — biarkan fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const version = live?.version ?? FALLBACK_VERSION;
  const apkName = live?.name ?? FALLBACK_NAME;
  const apkPath =
    live?.url ??
    `https://github.com/${RELEASES_REPO}/releases/download/${FALLBACK_VERSION}/${FALLBACK_NAME}`;
  const apkSize = live?.size ?? FALLBACK_SIZE;
  const apkReleased = live?.released ?? FALLBACK_RELEASED;
  const releasePage = live?.htmlUrl ?? `https://github.com/${RELEASES_REPO}/releases/latest`;

  const copySha = async () => {
    try {
      await navigator.clipboard.writeText(FALLBACK_SHA256);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia — biarkan pengguna menyalin manual
    }
  };

  return (
    <DocsLayout
      versionLabel={version}
      downloadHref="#stabil"
      sidebar={SIDEBAR}
    >
      <div className="space-y-8">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black">
          Download
        </h1>

        {/* Banner peringatan */}
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex gap-3">
          <TriangleAlert className="size-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-sm leading-relaxed">
            <p className="font-semibold text-red-900">
              Hanya tersedia di Android
            </p>
            <p className="text-red-800/80">
              <strong className="text-red-900">Ressist</strong> hanya tersedia
              untuk Android. Aplikasi non-Android bernama{" "}
              <strong className="text-red-900">Ressist</strong> tidak
              berafiliasi dengan proyek ini.
            </p>
          </div>
        </div>

        {/* Kartu rilis stabil */}
        <motion.section
          id="stabil"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="scroll-mt-24 bg-[#0059D0]/5 border border-[#0059D0]/15 rounded-2xl p-5 sm:p-7"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <img
                src="/logo-mark.png"
                alt="Logo Ressist"
                width={56}
                height={56}
                className="size-14 rounded-2xl object-contain shrink-0 bg-white border border-black/5"
              />
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-black">
                  Stabil
                </h2>
                <p className="text-sm text-black/50">
                  Direkomendasikan untuk kebanyakan pengguna
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm md:text-right shrink-0">
              <p className="flex md:justify-end items-center gap-2 text-black/60">
                <Tag className="size-4 text-black/30" />
                Latest release:{" "}
                <strong className="text-black">{version}</strong>
              </p>
              <p className="flex md:justify-end items-center gap-2 text-black/60">
                <CalendarDays className="size-4 text-black/30" />
                Released: <strong className="text-black">{apkReleased}</strong>
              </p>
            </div>
            <a
              href={apkPath}
              download={apkName}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#0059D0] text-white text-sm font-medium hover:bg-[#60A8F8] transition-colors shrink-0"
            >
              <Download className="size-4" />
              Ressist Stabil {version}
            </a>
          </div>
          <p className="mt-4 text-xs text-black/50">
            Requires {APK_MIN_ANDROID}. Ukuran file {apkSize}.
          </p>
        </motion.section>

        {/* Changelog */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-black">
            Changelog{" "}
            <span className="text-base font-medium text-black/40">
              {version}
            </span>
          </h2>
          <ul className="space-y-2">
            {CHANGELOG.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-black/70 bg-black/[0.03] px-4 py-3 rounded-xl leading-relaxed"
              >
                <Check className="size-4 text-[#0059D0] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-black/50">
            Riwayat lengkap perubahan aplikasi di{" "}
            <Link
              to="/change-log"
              className="text-[#0059D0] font-medium hover:underline"
            >
              halaman changelog
            </Link>
            .
          </p>
        </section>

        {/* Detail file */}
        <section id="detail" className="scroll-mt-24 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-black">
            Detail file
          </h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="bg-black/[0.03] rounded-xl px-4 py-3">
              <p className="text-black/40 text-xs font-medium mb-1">
                Nama file
              </p>
              <p className="text-black font-medium break-all">{apkName}</p>
            </div>
            <div className="bg-black/[0.03] rounded-xl px-4 py-3">
              <p className="text-black/40 text-xs font-medium mb-1">Versi</p>
              <p className="text-black font-medium">
                {version} • {apkSize}
              </p>
            </div>
          </div>
          <div className="bg-black/[0.03] rounded-xl px-4 py-3">
            <p className="text-black/40 text-xs font-medium mb-1">
              SHA-256 (verifikasi keaslian file)
            </p>
            <div className="flex items-start gap-2">
              <code className="text-black/70 text-xs leading-relaxed break-all flex-1">
                {FALLBACK_SHA256}
              </code>
              <button
                type="button"
                onClick={copySha}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-[#0059D0] hover:underline"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" /> Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" /> Salin
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-black/50 leading-relaxed">
            SHA di atas untuk v0.3.1. Untuk {version}, cocokkan dengan file{" "}
            <code className="text-black/70">SHA256SUMS.txt</code> di{" "}
            <a
              href={releasePage}
              target="_blank"
              rel="noreferrer"
              className="text-[#0059D0] font-medium hover:underline"
            >
              halaman rilis
            </a>
            .
          </p>
        </section>

        {/* Cara install */}
        <section id="install" className="scroll-mt-24 space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-black mb-1.5">
              Cara install
            </h2>
            <p className="text-sm text-black/60 leading-relaxed">
              Karena aplikasi belum tersedia di Play Store, Android akan
              meminta izin tambahan sekali saja.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {INSTALL_STEPS.map((item, index) => (
              <motion.li
                key={item.step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl border border-black/5 p-5"
              >
                <span className="size-8 rounded-xl bg-[#0059D0] text-white text-sm font-semibold flex items-center justify-center mb-3">
                  {item.step}
                </span>
                <h3 className="text-sm font-semibold text-black mb-1.5">
                  {item.title}
                </h3>
                <p className="text-sm text-black/60 leading-relaxed">
                  {item.description}
                </p>
              </motion.li>
            ))}
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm leading-relaxed text-amber-900">
            <p className="font-semibold mb-1">
              Kalau Play Protect muncul saat install
            </p>
            <p className="text-amber-800/90">
              Peringatan kuning “Unknown app” itu wajar untuk aplikasi sideload:
              ketuk <strong>More details / Selengkapnya</strong> lalu{" "}
              <strong>Install anyway / Tetap install</strong>. Update berikutnya
              biasanya mulus tanpa dialog lagi karena sistem mengenali
              sertifikat yang sama sebagai update resmi. Jangan matikan Play
              Protect — cukup izinkan sekali untuk aplikasi ini. Kalau yang
              muncul peringatan merah “Harmful app”, hentikan dan pastikan file
              cocok dengan SHA-256 di atas.
            </p>
          </div>
        </section>

        {/* Kenapa install */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-black">
            Kenapa install aplikasinya?
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-black/5 p-5"
              >
                <div className="size-10 rounded-xl bg-[#0059D0]/10 text-[#0059D0] flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <h3 className="text-sm font-semibold text-black mb-1.5">
                  {item.title}
                </h3>
                <p className="text-sm text-black/60 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-black">
            Frequently Asked Questions
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/faq/android"
              className="group bg-white rounded-2xl border border-black/5 p-5 block hover:border-[#0059D0]/30 hover:shadow-sm transition-all"
            >
              <h3 className="text-sm font-semibold text-black flex items-center gap-1.5 mb-1.5">
                Aplikasi Android
                <ArrowRight className="size-3.5 text-black/20 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0059D0]" />
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">
                Aman APK, HP didukung, update, dan gagal install.
              </p>
            </Link>
            <Link
              to="/faq/general"
              className="group bg-white rounded-2xl border border-black/5 p-5 block hover:border-[#0059D0]/30 hover:shadow-sm transition-all"
            >
              <h3 className="text-sm font-semibold text-black flex items-center gap-1.5 mb-1.5">
                Umum
                <ArrowRight className="size-3.5 text-black/20 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0059D0]" />
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">
                Biaya, akun, keamanan data, dan versi Web.
              </p>
            </Link>
          </div>
        </section>

        {/* Penutup */}
        <section className="flex items-start gap-3 bg-[#60A8F8]/10 rounded-2xl px-5 py-4">
          <Globe className="size-5 text-[#0059D0] shrink-0 mt-0.5" />
          <p className="text-sm text-black/60 leading-relaxed">
            Lebih suka tanpa install?{" "}
            <Link
              to="/dashboard"
              className="text-[#0059D0] font-medium hover:underline inline-flex items-center gap-1"
            >
              Buka dashboard Web <ArrowRight className="size-3.5" />
            </Link>{" "}
            — butuh langkah awal? Baca{" "}
            <Link
              to="/guide"
              className="text-[#0059D0] font-medium hover:underline"
            >
              panduan memulai
            </Link>
            .
          </p>
        </section>
      </div>
    </DocsLayout>
  );
}
