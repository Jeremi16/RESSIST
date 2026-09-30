"use client";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { DocsLayout } from "@/components/DocsLayout";
import { docsSidebar } from "@/components/docs-sidebar";

const STEPS = [
  {
    id: "daftar",
    title: "Daftar Akun",
    desc: "Gunakan email institusi (@student.itera.ac.id) untuk keamanan ekstra.",
  },
  {
    id: "moodle",
    title: "Hubungkan Moodle",
    desc: "Salin link export calendar dari Moodle Itera ke Dashboard Ressist.",
  },
  {
    id: "telegram",
    title: "Set Up Telegram",
    desc: "Buka bot kami di Telegram dan masukkan Chat ID Anda.",
  },
  {
    id: "santai",
    title: "Santai!",
    desc: "Bot akan otomatis mengirimkan reminder sesuai jadwal yang Anda tentukan.",
  },
];

const SIDEBAR = docsSidebar([
  ...STEPS.map((s) => ({ label: s.title, to: `#${s.id}` })),
  { label: "Butuh Panduan Lengkap?", to: "#lengkap" },
]);

export default function Panduan() {
  return (
    <DocsLayout
      versionLabel="v0.2.2"
      downloadHref="/app#stabil"
      sidebar={SIDEBAR}
    >
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-black mb-3">
            Panduan Memulai
          </h1>
          <p className="font-serif text-sm sm:text-base text-black/60 leading-relaxed">
            Mulai tingkatkan produktivitas akademik Anda hanya dalam 5 menit.
          </p>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <motion.section
              key={step.id}
              id={step.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="scroll-mt-24 p-6 rounded-none bg-white border border-black/5 flex gap-4"
            >
              <div className="size-8 bg-[#0059D0] text-white rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                {i + 1}
              </div>
              <div>
                <h2 className="font-display text-base font-bold text-black tracking-tight mb-1">
                  {step.title}
                </h2>
                <p className="font-serif text-sm text-black/60 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.section>
          ))}
        </div>

        <section
          id="lengkap"
          className="scroll-mt-24 bg-black rounded-none p-8 text-white flex flex-col items-center text-center space-y-4"
        >
          <h2 className="font-display text-xl font-bold tracking-tight">
            Butuh panduan lengkap?
          </h2>
          <p className="font-serif text-sm text-white/60">
            Download PDF panduan penggunaan eksklusif untuk mahasiswa ITERA.
          </p>
          <button className="h-10 px-6 bg-white text-black rounded-full text-sm font-medium">
            Download PDF
          </button>
        </section>

        <section className="bg-[#F5F5F5] rounded-none px-5 py-4">
          <p className="font-serif text-sm text-black/60 leading-relaxed">
            Masih bingung? Lihat{" "}
            <Link
              to="/help"
              className="text-black font-medium hover:underline inline-flex items-center gap-1"
            >
              pusat bantuan <ArrowRight className="size-3.5" />
            </Link>
            .
          </p>
        </section>
      </div>
    </DocsLayout>
  );
}
