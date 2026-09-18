"use client";

import { Link } from "react-router-dom";
import { DocsLayout } from "@/components/DocsLayout";
import { docsSidebar } from "@/components/docs-sidebar";
import { FaqList, type FaqItem } from "@/components/FaqList";

const ITEMS: FaqItem[] = [
  {
    id: "berbayar",
    nav: "Apakah berbayar?",
    q: "Apakah Ressist berbayar?",
    a: "Tidak. Fitur utama seperti sinkronisasi Moodle dan notifikasi Telegram 100% gratis selamanya untuk mahasiswa ITERA.",
  },
  {
    id: "akun",
    nav: "Akun pendaftaran",
    q: "Akun apa yang dipakai untuk daftar?",
    a: "Disarankan memakai email institusi (@student.itera.ac.id). Login dengan Google juga tersedia, sekaligus untuk menghubungkan Google Classroom.",
  },
  {
    id: "keamanan",
    nav: "Keamanan data",
    q: "Apakah data dan akun saya aman?",
    a: "Aman. Ressist tidak melakukan scraping langsung ke Moodle — ia hanya membaca file export calendar (.ics) yang kamu berikan, sehingga kredensial Moodle tidak pernah disimpan.",
  },
  {
    id: "wajib-install",
    nav: "Harus install?",
    q: "Apakah harus install aplikasi Android?",
    a: (
      <>
        Tidak wajib. Versi Web di{" "}
        <Link
          to="/dashboard"
          className="text-[#0059D0] font-medium hover:underline"
        >
          dashboard
        </Link>{" "}
        punya fitur yang sama. Aplikasi Android (
        <Link to="/app" className="text-[#0059D0] font-medium hover:underline">
          download di sini
        </Link>
        ) berguna kalau kamu mau pengingat deadline langsung di HP.
      </>
    ),
  },
];

const SIDEBAR = docsSidebar(
  ITEMS.map((i) => ({ label: i.nav, to: `#${i.id}` })),
);

export default function FaqGeneral() {
  return (
    <DocsLayout sidebar={SIDEBAR}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black mb-3">
            FAQ Umum
          </h1>
          <p className="text-sm sm:text-base text-black/60 leading-relaxed">
            Pertanyaan umum seputar akun, biaya, dan keamanan Ressist.
          </p>
        </div>
        <FaqList items={ITEMS} />
      </div>
    </DocsLayout>
  );
}
