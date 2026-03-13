'use client'

import { InfoLayout } from '@/components/InfoLayout'
import { motion } from 'framer-motion'
import { MapPin, Mail, Phone, Users, Rocket, Target } from 'lucide-react'

export default function Karir() {
  return (
    <InfoLayout 
      category="Perusahaan"
      title="Gabung Tim Kami"
      subtitle="Bantu kami membangun asisten akademik terbaik untuk masa depan."
    >
      <div className="space-y-16">
        <section className="text-center space-y-6">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ingin Berkontribusi?</h2>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                Resisst adalah proyek berbasis komunitas mahasiswa ITERA. Kami membuka kesempatan bagi Anda yang ingin belajar membangun produk nyata.
            </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-10 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 space-y-6">
                <div className="size-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">💻</div>
                <h3 className="text-2xl font-black text-indigo-900">Engineering</h3>
                <p className="text-sm text-indigo-700/70 font-medium leading-relaxed">Membangun integrasi API, optimasi scheduler, dan scale up infrastruktur bot.</p>
                <div className="pt-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-indigo-600 border border-indigo-200">Next.js</span>
                    <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-indigo-600 border border-indigo-200">Prisma</span>
                    <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-indigo-600 border border-indigo-200">TypeScript</span>
                </div>
            </div>
            <div className="p-10 rounded-[2.5rem] bg-pink-50 border border-pink-100 space-y-6">
                <div className="size-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm">🎨</div>
                <h3 className="text-2xl font-black text-pink-900">Design & UX</h3>
                <p className="text-sm text-pink-700/70 font-medium leading-relaxed">Mendefinisikan visual brand Resisst dan memastikan pengalaman user yang tak terlupakan.</p>
                <div className="pt-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-pink-600 border border-pink-200">Figma</span>
                    <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-pink-600 border border-pink-200">Branding</span>
                    <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-pink-600 border border-pink-200">Animation</span>
                </div>
            </div>
        </section>

        <section className="bg-slate-50 rounded-[2.5rem] p-12 text-center space-y-6 border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Tertarik Berkolaborasi?</h3>
            <p className="text-slate-500 font-medium max-w-lg mx-auto">Kirimkan portofolio atau ide gilamu ke email kami dan mari bicara!</p>
            <a href="mailto:careers@resisst.com" className="inline-flex h-14 px-8 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest items-center transition-all hover:bg-slate-800 active:scale-95">
                Kirim Portofolio
            </a>
        </section>
      </div>
    </InfoLayout>
  )
}
