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
      <div className="space-y-8 sm:space-y-12">
        <div className="relative">
          <Search className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 size-5 sm:size-6 text-slate-300" />
          <input
            type="text"
            placeholder="Cari solusi atau masalah..."
            className="w-full h-14 sm:h-16 bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-[1.5rem] pl-12 sm:pl-16 pr-4 sm:pr-6 text-slate-900 text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-blue-50 border border-blue-100 text-center space-y-4">
            <Book className="size-7 sm:size-8 text-blue-600 mx-auto" />
            <h4 className="font-black text-slate-900">Tutorial</h4>
            <p className="text-xs text-slate-500 font-medium">
              Panduan langkah demi langkah.
            </p>
          </div>
          <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-green-50 border border-green-100 text-center space-y-4">
            <HelpCircle className="size-7 sm:size-8 text-green-600 mx-auto" />
            <h4 className="font-black text-slate-900">FAQ</h4>
            <p className="text-xs text-slate-500 font-medium">
              Pertanyaan paling umum.
            </p>
          </div>
          <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-purple-50 border border-purple-100 text-center space-y-4 sm:col-span-2 md:col-span-1">
            <LifeBuoy className="size-7 sm:size-8 text-purple-600 mx-auto" />
            <h4 className="font-black text-slate-900">Support</h4>
            <p className="text-xs text-slate-500 font-medium">
              Kontak tim bantuan kami.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Tanya Jawab
          </h3>
          <div className="space-y-3 sm:space-y-4">
            {FAQS.map((faq, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i}
                className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-100 space-y-2 shadow-sm"
              >
                <h4 className="font-black text-slate-900 flex items-start gap-2 text-sm sm:text-base">
                  <span className="size-6 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center text-[10px]">
                    Q
                  </span>
                  <span>{faq.q}</span>
                </h4>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
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
