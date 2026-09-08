'use client'

import { InfoLayout } from '@/components/InfoLayout'

export default function Karir() {
  return (
    <InfoLayout 
      category="Perusahaan"
      title="Gabung Tim Kami"
      subtitle="Bantu kami membangun asisten akademik terbaik untuk masa depan."
    >
      <div className="space-y-8">
        <p className="text-sm text-black/60 leading-relaxed max-w-2xl">
          Ressist adalah proyek berbasis komunitas mahasiswa ITERA. Kami membuka kesempatan bagi Anda yang ingin belajar membangun produk nyata.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-white border border-black/5 space-y-3">
            <h3 className="text-base font-semibold text-black">Engineering</h3>
            <p className="text-sm text-black/60 leading-relaxed">Membangun integrasi API, optimasi scheduler, dan scale up infrastruktur bot.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 bg-[#F5F0EB] rounded-full text-xs font-medium text-black/60">Next.js</span>
              <span className="px-2.5 py-1 bg-[#F5F0EB] rounded-full text-xs font-medium text-black/60">Prisma</span>
              <span className="px-2.5 py-1 bg-[#F5F0EB] rounded-full text-xs font-medium text-black/60">TypeScript</span>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-black/5 space-y-3">
            <h3 className="text-base font-semibold text-black">Design & UX</h3>
            <p className="text-sm text-black/60 leading-relaxed">Mendefinisikan visual brand Ressist dan memastikan pengalaman user tak terlupakan.</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 bg-[#F5F0EB] rounded-full text-xs font-medium text-black/60">Figma</span>
              <span className="px-2.5 py-1 bg-[#F5F0EB] rounded-full text-xs font-medium text-black/60">Branding</span>
              <span className="px-2.5 py-1 bg-[#F5F0EB] rounded-full text-xs font-medium text-black/60">Animation</span>
            </div>
          </div>
        </div>

        <div className="bg-black rounded-2xl p-8 text-center space-y-3">
          <h3 className="text-lg font-semibold text-white">Tertarik Berkolaborasi?</h3>
          <p className="text-sm text-white/60">Kirimkan portofolio atau ide gilamu ke email kami.</p>
          <a href="mailto:careers@ressist.com" className="inline-flex h-10 px-6 bg-white text-black rounded-full text-sm font-medium items-center">
            Kirim Portofolio
          </a>
        </div>
      </div>
    </InfoLayout>
  )
}
