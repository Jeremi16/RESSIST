import { InfoLayout } from '@/components/InfoLayout'

export default function Harga() {
  return (
    <InfoLayout 
      category="Produk"
      title="Sederhana & Transparan"
      subtitle="Ressist berkomitmen untuk membantu pendidikan. Gunakan fitur dasar secara gratis selamanya."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-8 rounded-2xl bg-white border border-black/5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black">Pejuang IPK</h3>
            <span className="px-2.5 py-1 bg-[#F5F0EB] text-black/40 rounded-full text-xs font-medium">Gratis</span>
          </div>
          <p className="text-3xl font-semibold tracking-tight text-black">Rp 0 <span className="text-sm font-normal text-black/40">/ selamanya</span></p>
          <ul className="space-y-2.5">
            {['Sinkronisasi Moodle', 'Notifikasi Telegram', 'Morning Briefing', 'Dashboard Personal'].map(item => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-black/70">
                <span className="size-5 bg-black text-white rounded-full flex items-center justify-center text-[10px]">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <button className="w-full h-10 bg-[#F5F0EB] text-black rounded-full text-sm font-medium">
            Sudah Aktif
          </button>
        </div>

        <div className="p-8 rounded-2xl bg-black text-white space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Cum Laude</h3>
            <span className="px-2.5 py-1 bg-white text-black rounded-full text-xs font-medium">Coming Soon</span>
          </div>
          <p className="text-3xl font-semibold tracking-tight">Rp 19rb <span className="text-sm font-normal text-white/40">/ bulan</span></p>
          <ul className="space-y-2.5">
            {['Semua Fitur Gratis', 'Notifikasi WhatsApp Premium', 'Unlimited Courses', 'Prioritas Update Jadwal'].map(item => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                <span className="size-5 bg-white text-black rounded-full flex items-center justify-center text-[10px]">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <button className="w-full h-10 bg-white text-black rounded-full text-sm font-medium opacity-60 cursor-not-allowed">
            Tunggu Kami
          </button>
        </div>
      </div>
    </InfoLayout>
  )
}
