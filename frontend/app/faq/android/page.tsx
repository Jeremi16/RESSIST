"use client";

import { Link } from "react-router-dom";
import { DocsLayout } from "@/components/DocsLayout";
import { docsSidebar } from "@/components/docs-sidebar";
import { FaqList, type FaqItem } from "@/components/FaqList";

const ITEMS: FaqItem[] = [
  {
    id: "download",
    nav: "Di mana download?",
    q: "Di mana download aplikasinya?",
    a: (
      <>
        Di{" "}
        <Link to="/app" className="text-[#0059D0] font-medium hover:underline">
          halaman download
        </Link>
        . Versi terbaru saat ini v0.2.0 (sekitar 3.41 MB, Android 8.0 ke
        atas).
      </>
    ),
  },
  {
    id: "aman",
    nav: "Aman dari luar Play Store?",
    q: "Apakah aman install APK dari luar Play Store?",
    a: "File ini dirilis resmi oleh tim Ressist. Untuk memastikan keasliannya, cocokkan SHA-256 file yang kamu download dengan nilai di bagian Detail File halaman download sebelum install.",
  },
  {
    id: "perangkat",
    nav: "HP yang didukung",
    q: "HP apa saja yang didukung?",
    a: "Aplikasi membutuhkan Android 8.0 atau lebih tinggi.",
  },
  {
    id: "update",
    nav: "Cara update",
    q: "Bagaimana cara update ke versi baru?",
    a: "Download file APK versi terbaru dari halaman download lalu install seperti biasa — cukup timpa versi lama, tidak perlu uninstall.",
  },
  {
    id: "gagal",
    nav: "Gagal install",
    q: "Gagal install / muncul peringatan?",
        a: 'Pastikan "Install unknown apps" diizinkan untuk browsermu, ruang penyimpanan cukup, dan file terdownload penuh (cek ukurannya 3.41 MB). Kalau masih gagal, baca halaman Bantuan.',
  },
];

const SIDEBAR = docsSidebar(
  ITEMS.map((i) => ({ label: i.nav, to: `#${i.id}` })),
);

export default function FaqAndroid() {
  return (
    <DocsLayout
      versionLabel="v0.2.0"
      downloadHref="/app#stabil"
      sidebar={SIDEBAR}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black mb-3">
            FAQ Aplikasi Android
          </h1>
          <p className="text-sm sm:text-base text-black/60 leading-relaxed">
            Seputar download, install, dan update aplikasi Android Ressist.
          </p>
        </div>
        <FaqList items={ITEMS} />
      </div>
    </DocsLayout>
  );
}
