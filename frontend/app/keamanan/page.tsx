import { InfoLayout } from '@/components/InfoLayout'

export default function Keamanan() {
  return (
    <InfoLayout 
      category="Produk"
      title="Standar Keamanan"
      subtitle="Data akademik Anda aman bersama Ressist dengan enkripsi tingkat tinggi."
    >
      <div className="space-y-6">
        <p className="text-sm text-black/60 leading-relaxed">
          Kami menggunakan SSL/TLS untuk setiap transmisi data. Database diproteksi berlapis dan hanya dapat diakses layanan terautorisasi.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-6 rounded-2xl bg-white border border-black/5 space-y-1.5">
            <h4 className="text-sm font-semibold text-black">Enkripsi AES-256</h4>
            <p className="text-sm text-black/60 leading-relaxed">URL Moodle dan Chat ID didekripsi hanya saat dibutuhkan untuk pengiriman notifikasi.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-black/5 space-y-1.5">
            <h4 className="text-sm font-semibold text-black">No Password Storage</h4>
            <p className="text-sm text-black/60 leading-relaxed">Bekerja via Link Export Calendar — kami TIDAK meminta password Moodle Anda.</p>
          </div>
        </div>
      </div>
    </InfoLayout>
  )
}
