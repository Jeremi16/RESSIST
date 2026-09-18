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
      versionLabel="v0.1.0"
      downloadHref="/app#stabil"
      sidebar={SIDEBAR}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black mb-3">
            Panduan Memulai
          </h1>
          <p className="text-sm sm:text-base text-black/60 leading-relaxed">
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
              className="scroll-mt-24 p-6 rounded-2xl bg-white border border-black/5 flex gap-4"
            >
              <div className="size-8 bg-[#0059D0] text-white rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                {i + 1}
              </div>
              <div>
                <h2 className="text-base font-semibold text-black tracking-tight mb-1">
                  {step.title}
                </h2>
                <p className="text-sm text-black/60 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </motion.section>
          ))}
        </div>

        <section
          id="lengkap"
          className="scroll-mt-24 bg-[#0059D0] rounded-2xl p-8 text-white flex flex-col items-center text-center space-y-4"
        >
          <h2 className="text-xl font-semibold tracking-tight">
            Butuh panduan lengkap?
          </h2>
          <p className="text-sm text-white/60">
            Download PDF panduan penggunaan eksklusif untuk mahasiswa ITERA.
          </p>
          <button className="h-10 px-6 bg-white text-[#0059D0] rounded-full text-sm font-medium">
            Download PDF
          </button>
        </section>

        <section className="bg-[#60A8F8]/10 rounded-2xl px-5 py-4">
          <p className="text-sm text-black/60 leading-relaxed">
            Masih bingung? Lihat{" "}
            <Link
              to="/help"
              className="text-[#0059D0] font-medium hover:underline inline-flex items-center gap-1"
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
