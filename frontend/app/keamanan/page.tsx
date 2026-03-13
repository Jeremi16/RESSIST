import { InfoLayout } from '@/components/InfoLayout'

export default function Keamanan() {
  return (
    <InfoLayout 
      category="Produk"
      title="Standar Keamanan"
      subtitle="Data akademik Anda aman bersama Resisst dengan enkripsi tingkat tinggi."
    >
      <div className="space-y-8">
        <section className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
                <div className="size-16 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm text-blue-600">🛡️</div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Proteksi Data</h3>
            </div>
            <p className="text-lg text-slate-600 font-medium leading-relaxed">
                Kami menggunakan SSL/TLS untuk setiap transmisi data. Selain itu, database kami diproteksi dengan keamanan berlapis dan hanya dapat diakses oleh layanan terautorisasi.
            </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-100">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-2">
                <h4 className="font-black text-slate-900">Enkripsi AES-256</h4>
                <p className="text-sm text-slate-500 font-medium">Semua URL Moodle dan Chat ID didekripsi hanya saat dibutuhkan untuk pengiriman notifikasi.</p>
            </div>
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 space-y-2">
                <h4 className="font-black text-slate-900">No Password Storage</h4>
                <p className="text-sm text-slate-500 font-medium">Bekerja via Link Export Calendar berarti kami TIDAK meminta password Moodle Anda.</p>
            </div>
        </section>
      </div>
    </InfoLayout>
  )
}
