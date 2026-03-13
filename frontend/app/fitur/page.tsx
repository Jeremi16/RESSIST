import { InfoLayout } from '@/components/InfoLayout'

export default function Fitur() {
  return (
    <InfoLayout 
      category="Produk"
      title="Fitur Unggulan"
      subtitle="Dirancang khusus untuk membantu mahasiswa menguasai jadwal akademik tanpa rasa khawatir."
    >
      <div className="space-y-12">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                <div className="size-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl">📅</div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Sinkronisasi Moodle Otomatis</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                    Tidak perlu lagi cek Moodle secara manual setiap jam. Resisst akan memantau kalender Moodle Anda dan mengupdate jadwal secara real-time.
                </p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-4">
                <div className="size-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl">📱</div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Notifikasi Telegram & WhatsApp</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                    Terima pengingat tugas langsung di aplikasi chat favorit Anda. Kustomisasi waktu pengingat sesuai keinginan Anda (24 jam, 12 jam, hingga 1 jam sebelum deadline).
                </p>
            </div>
        </section>

        <section className="space-y-6">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Lebih dari sekadar pengingat</h2>
            <p className="text-lg text-slate-500 font-medium leading-relaxed">
                Resisst dikembangkan dengan memahami struggle mahasiswa. Kami menyertakan fitur Morning Briefing setiap jam 7 pagi agar Anda bangun dengan gambaran tugas apa saja yang menanti hari ini.
            </p>
        </section>
      </div>
    </InfoLayout>
  )
}
