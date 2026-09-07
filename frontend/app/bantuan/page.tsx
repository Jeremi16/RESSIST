"use client";

import { InfoLayout } from "@/components/InfoLayout";
import { motion } from "framer-motion";
import { Search, Book, HelpCircle, LifeBuoy } from "lucide-react";

export default function Bantuan() {
  const FAQS = [
    {
      q: "Apakah Resisst berbayar?",
      a: "Fitur utama seperti Sinkronisasi Moodle dan Telegram 100% gratis selamanya untuk mahasiswa ITERA.",
    },
    {
      q: "Kenapa notifikasi saya tidak masuk?",
      a: "Pastikan Chat ID Telegram Anda sudah benar dan Bot Telegram sudah di-start (/start).",
    },
    {
      q: "Bagaimana cara ganti nomor WhatsApp?",
      a: "Untuk saat ini WhatsApp masih dalam tahap pengetesan terbatas, silakan kontak support untuk perubahan nomor.",
    },
  ];

  return (
    <InfoLayout
      category="Sumber Daya"
      title="Pusat Bantuan"
      subtitle="Temukan jawaban untuk pertanyaan yang paling sering diajukan."
    >
      <div className="space-y-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-black/20" />
          <input
            type="text"
            placeholder="Cari solusi atau masalah..."
            className="w-full h-12 bg-white border border-black/5 rounded-2xl pl-11 pr-4 text-sm text-black placeholder:text-black/30 focus:outline-none focus:border-black/10 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-white border border-black/5 text-center space-y-3">
            <Book className="size-6 text-black mx-auto" />
            <h4 className="text-sm font-semibold text-black">Tutorial</h4>
            <p className="text-xs text-black/40">Panduan langkah demi langkah.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-black/5 text-center space-y-3">
            <HelpCircle className="size-6 text-black mx-auto" />
            <h4 className="text-sm font-semibold text-black">FAQ</h4>
            <p className="text-xs text-black/40">Pertanyaan paling umum.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-black/5 text-center space-y-3">
            <LifeBuoy className="size-6 text-black mx-auto" />
            <h4 className="text-sm font-semibold text-black">Support</h4>
            <p className="text-xs text-black/40">Kontak tim bantuan kami.</p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-black tracking-tight">
            Tanya Jawab
          </h3>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                key={i}
                className="p-5 rounded-2xl bg-white border border-black/5 space-y-2"
              >
                <h4 className="text-sm font-semibold text-black flex items-start gap-2">
                  <span className="size-5 shrink-0 bg-black text-white rounded-full flex items-center justify-center text-[10px]">Q</span>
                  <span>{faq.q}</span>
                </h4>
                <p className="text-sm text-black/60 leading-relaxed pl-7">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </InfoLayout>
  );
}
