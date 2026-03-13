import { InfoLayout } from '@/components/InfoLayout'

export default function Harga() {
  return (
    <InfoLayout 
      category="Produk"
      title="Sederhana & Transparan"
      subtitle="Resisst berkomitmen untuk membantu pendidikan. Gunakan fitur dasar secara gratis selamanya."
    >
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative p-10 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm space-y-6 overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">Gratis</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">Pejuang IPK</h3>
                <p className="text-4xl font-black text-slate-900 tracking-tight">Rp 0 <span className="text-sm font-medium text-slate-400">/ selamanya</span></p>
                <ul className="space-y-3">
                    {['Sinkronisasi Moodle', 'Notifikasi Telegram', 'Morning Briefing', 'Dashboard Personal'].map(item => (
                        <li key={item} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                            <div className="size-5 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-[10px]">✓</div>
                            {item}
                        </li>
                    ))}
                </ul>
                <button className="w-full h-12 bg-slate-50 text-slate-900 hover:bg-slate-100 rounded-xl font-black uppercase tracking-widest transition-all">
                    Sudah Aktif
                </button>
            </div>

            <div className="relative p-10 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl space-y-6 overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">Coming Soon</span>
                </div>
                <h3 className="text-2xl font-black">Cum Laude</h3>
                <p className="text-4xl font-black tracking-tight">Rp 19rb <span className="text-sm font-medium text-slate-500">/ bulan</span></p>
                <ul className="space-y-3">
                    {['Semua Fitur Gratis', 'Notifikasi WhatsApp Premium', 'Unlimited Courses', 'Prioritas Update Jadwal'].map(item => (
                        <li key={item} className="flex items-center gap-3 text-sm font-bold text-slate-300">
                            <div className="size-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px]">✓</div>
                            {item}
                        </li>
                    ))}
                </ul>
                <button className="w-full h-12 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest transition-all opacity-50 cursor-not-allowed">
                    Tunggu Kami
                </button>
            </div>
        </div>
      </div>
    </InfoLayout>
  )
}
