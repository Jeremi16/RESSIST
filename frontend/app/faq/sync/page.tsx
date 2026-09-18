"use client";

import { Link } from "react-router-dom";
import { DocsLayout } from "@/components/DocsLayout";
import { docsSidebar } from "@/components/docs-sidebar";
import { FaqList, type FaqItem } from "@/components/FaqList";

const ITEMS: FaqItem[] = [
  {
    id: "hubungkan-moodle",
    nav: "Hubungkan Moodle",
    q: "Bagaimana cara menghubungkan Moodle?",
    a: "Dari Moodle (kuliah2.itera.ac.id), buka menu export calendar lalu salin URL-nya. Tempel URL tersebut di Dashboard Ressist pada tab LMS, lalu jalankan sinkronisasi.",
  },
  {
    id: "otomatis",
    nav: "Otomatis?",
    q: "Apakah sinkronisasi berjalan otomatis?",
    a: "Ya, sinkronisasi berjalan otomatis setiap kamu login. Selain itu tersedia tombol sinkronisasi manual di dashboard kalau kamu baru menambah tugas di LMS.",
  },
  {
    id: "tugas-tidak-muncul",
    nav: "Tugas tidak muncul",
    q: "Tugas tidak muncul setelah sinkronisasi?",
    a: "Pastikan URL calendar Moodle masih benar, lalu coba sinkronisasi ulang manual. Periksa juga filter kode kelas dan daftar mata kuliah yang dibisukan — tugas dari kelas yang difilter tidak ditampilkan.",
  },
  {
    id: "classroom",
    nav: "Google Classroom",
    q: "Bagaimana menghubungkan Google Classroom?",
    a: (
      <>
        Login dengan akun Google-mu, lalu aktifkan Google Classroom di
        pengaturan LMS pada{" "}
        <Link
          to="/dashboard"
          className="text-[#0059D0] font-medium hover:underline"
        >
          dashboard
        </Link>
        . Tugas dari kelas yang kamu ikuti akan ikut tersinkron.
      </>
    ),
  },
];

const SIDEBAR = docsSidebar(
  ITEMS.map((i) => ({ label: i.nav, to: `#${i.id}` })),
);

export default function FaqSync() {
  return (
    <DocsLayout sidebar={SIDEBAR}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black mb-3">
            FAQ Sinkronisasi
          </h1>
          <p className="text-sm sm:text-base text-black/60 leading-relaxed">
            Seputar menghubungkan Moodle, Google Classroom, dan sinkronisasi
            tugas.
          </p>
        </div>
        <FaqList items={ITEMS} />
      </div>
    </DocsLayout>
  );
}
