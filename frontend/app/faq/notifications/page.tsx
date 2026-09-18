"use client";

import { Link } from "react-router-dom";
import { DocsLayout } from "@/components/DocsLayout";
import { docsSidebar } from "@/components/docs-sidebar";
import { FaqList, type FaqItem } from "@/components/FaqList";

const ITEMS: FaqItem[] = [
  {
    id: "telegram-tidak-masuk",
    nav: "Notifikasi tidak masuk",
    q: "Kenapa notifikasi Telegram saya tidak masuk?",
    a: "Pastikan Chat ID Telegram kamu sudah benar dan bot Telegram sudah di-start dengan perintah /start. Cek juga pengaturan pengingat di dashboard — notifikasi hanya dikirim untuk mata kuliah yang tidak dibisukan.",
  },
  {
    id: "jam-pengingat",
    nav: "Jam pengingat",
    q: "Kapan pengingat dikirim?",
    a: "Kamu bisa mengatur pengingat H-24, H-12, H-6, dan H-1 jam sebelum deadline lewat pengaturan notifikasi di dashboard.",
  },
  {
    id: "morning-briefing",
    nav: "Morning Briefing",
    q: "Apa itu Morning Briefing?",
    a: "Ringkasan tugas yang dikirim tiap jam 07:00 WIB agar kamu tahu agenda hari ini sejak pagi. Fitur ini bisa dinyalakan atau dimatikan dari pengaturan notifikasi.",
  },
  {
    id: "ganti-whatsapp",
    nav: "Ganti nomor WhatsApp",
    q: "Bagaimana cara ganti nomor WhatsApp?",
    a: (
      <>
        Untuk saat ini notifikasi WhatsApp masih dalam tahap pengetesan
        terbatas. Untuk perubahan nomor, silakan hubungi tim kami lewat{" "}
        <Link
          to="/contact"
          className="text-[#0059D0] font-medium hover:underline"
        >
          halaman kontak
        </Link>
        .
      </>
    ),
  },
];

const SIDEBAR = docsSidebar(
  ITEMS.map((i) => ({ label: i.nav, to: `#${i.id}` })),
);

export default function FaqNotifications() {
  return (
    <DocsLayout sidebar={SIDEBAR}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black mb-3">
            FAQ Notifikasi
          </h1>
          <p className="text-sm sm:text-base text-black/60 leading-relaxed">
            Seputar pengingat Telegram, WhatsApp, dan Morning Briefing.
          </p>
        </div>
        <FaqList items={ITEMS} />
      </div>
    </DocsLayout>
  );
}
