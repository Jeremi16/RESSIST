"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  Smartphone,
  CircleHelp,
  RefreshCw,
  LifeBuoy,
  ArrowRight,
} from "lucide-react";
import { DocsLayout } from "@/components/DocsLayout";
import { docsSidebar } from "@/components/docs-sidebar";

const CATEGORIES = [
  {
    icon: CircleHelp,
    title: "Umum",
    desc: "Akun, biaya, dan keamanan.",
    count: "4 pertanyaan",
    to: "/faq/general",
  },
  {
    icon: Smartphone,
    title: "Aplikasi Android",
    desc: "Download, install, dan update.",
    count: "5 pertanyaan",
    to: "/faq/android",
  },
  {
    icon: RefreshCw,
    title: "Sinkronisasi",
    desc: "Moodle, Classroom, dan tugas.",
    count: "4 pertanyaan",
    to: "/faq/sync",
  },
  {
    icon: Bell,
    title: "Notifikasi",
    desc: "Telegram, WhatsApp, dan briefing.",
    count: "4 pertanyaan",
    to: "/faq/notifications",
  },
];

const SIDEBAR = docsSidebar([
  { label: "Kategori Bantuan", to: "#kategori" },
  { label: "Butuh Bantuan Lain?", to: "#support" },
]);

export default function Bantuan() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = CATEGORIES.filter(
    (cat) =>
      q === "" ||
      cat.title.toLowerCase().includes(q) ||
      cat.desc.toLowerCase().includes(q),
  );

  return (
    <DocsLayout sidebar={SIDEBAR}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black mb-3">
            Pusat Bantuan
          </h1>
          <p className="text-sm sm:text-base text-black/60 leading-relaxed">
            Temukan jawaban untuk pertanyaan yang paling sering diajukan.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-black/20" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari topik bantuan..."
            className="w-full h-12 bg-white border border-black/5 rounded-2xl pl-11 pr-4 text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/10 transition-colors"
          />
        </div>

        <section id="kategori" className="scroll-mt-24 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-black">
            Kategori Bantuan
          </h2>
          {filtered.length === 0 ? (
            <p className="text-sm text-black/50 bg-black/[0.03] rounded-2xl px-5 py-6 text-center">
              Tidak ada kategori yang cocok dengan “{query.trim()}”.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((cat, i) => (
                <motion.div
                  key={cat.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={cat.to}
                    className="p-6 rounded-2xl bg-white border border-black/5 space-y-2 block hover:border-[#0059D0]/30 hover:shadow-sm transition-all group"
                  >
                    <cat.icon className="size-6 text-[#0059D0]" />
                    <h3 className="text-sm font-semibold text-black flex items-center gap-1.5">
                      {cat.title}
                      <ArrowRight className="size-3.5 text-black/20 transition-transform group-hover:translate-x-0.5 group-hover:text-[#0059D0]" />
                    </h3>
                    <p className="text-xs text-black/40">{cat.desc}</p>
                    <p className="text-xs font-medium text-[#0059D0]">
                      {cat.count}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <section
          id="support"
          className="scroll-mt-24 flex items-start gap-3 bg-[#60A8F8]/10 rounded-2xl px-5 py-4"
        >
          <LifeBuoy className="size-5 text-[#0059D0] shrink-0 mt-0.5" />
          <p className="text-sm text-black/60 leading-relaxed">
            Tidak ketemu jawabanmu? Hubungi tim kami lewat{" "}
            <Link
              to="/contact"
              className="text-[#0059D0] font-medium hover:underline"
            >
              halaman kontak
            </Link>
            .
          </p>
        </section>
      </div>
    </DocsLayout>
  );
}
