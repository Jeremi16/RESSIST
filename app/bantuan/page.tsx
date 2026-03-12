'use client'

import { InfoLayout } from '@/components/InfoLayout'
import { motion } from 'framer-motion'
import { Search, Book, HelpCircle, LifeBuoy } from 'lucide-react'

export default function Bantuan() {
  const FAQS = [
    { q: "Apakah Resisst berbayar?", a: "Fitur utama seperti Sinkronisasi Moodle dan Telegram 100% gratis selamanya untuk mahasiswa ITERA." },
    { q: "Kenapa notifikasi saya tidak masuk?", a: "Pastikan Chat ID Telegram Anda sudah benar dan Bot Telegram sudah di-start (/start)." },
    { q: "Bagaimana cara ganti nomor WhatsApp?", a: "Untuk saat ini WhatsApp masih dalam tahap pengetesan terbatas, silakan kontak support untuk perubahan nomor." },
  ]

  return (
    <InfoLayout 
      category="Sumber Daya"
      title="Pusat Bantuan"
      subtitle="Temukan jawaban untuk pertanyaan yang paling sering diajukan."
    >
      <div className="space-y-12">
        <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-6 text-slate-300" />
            <input 
                type="text" 
                placeholder="Cari solusi atau masalah..." 
                className="w-full h-16 bg-slate-50 border border-slate-100 rounded-[1.5rem] pl-16 pr-6 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all"
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl bg-blue-50 border border-blue-100 text-center space-y-4">
                <Book className="size-8 text-blue-600 mx-auto" />
                <h4 className="font-black text-slate-900">Tutorial</h4>
                <p className="text-xs text-slate-500 font-medium">Panduan langkah demi langkah.</p>
            </div>
            <div className="p-8 rounded-3xl bg-green-50 border border-green-100 text-center space-y-4">
                <HelpCircle className="size-8 text-green-600 mx-auto" />
                <h4 className="font-black text-slate-900">FAQ</h4>
                <p className="text-xs text-slate-500 font-medium">Pertanyaan paling umum.</p>
            </div>
            <div className="p-8 rounded-3xl bg-purple-50 border border-purple-100 text-center space-y-4">
                <LifeBuoy className="size-8 text-purple-600 mx-auto" />
                <h4 className="font-black text-slate-900">Support</h4>
                <p className="text-xs text-slate-500 font-medium">Kontak tim bantuan kami.</p>
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tanya Jawab</h3>
            <div className="space-y-4">
                {FAQS.map((faq, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="p-6 rounded-2xl bg-white border border-slate-100 space-y-2 shadow-sm"
                    >
                        <h4 className="font-black text-slate-900 flex items-center gap-2">
                            <span className="size-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px]">Q</span>
                            {faq.q}
                        </h4>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed pl-8">{faq.a}</p>
                    </motion.div>
                ))}
            </div>
        </div>
      </div>
    </InfoLayout>
  )
}
