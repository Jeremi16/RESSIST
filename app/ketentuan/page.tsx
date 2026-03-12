import { InfoLayout } from '@/components/InfoLayout'

export default function Ketentuan() {
  return (
    <InfoLayout 
      category="Legal"
      title="Syarat & Ketentuan"
      subtitle="Aturan main penggunaan Resisst agar tetap nyaman buat semua pejuang IPK."
    >
      <div className="space-y-8">
        <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Penggunaan Layanan</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
                Resisst adalah alat bantu pengingat. Tanggung jawab akademik tetap berada di tangan masing-masing mahasiswa. Kami tidak bertanggung jawab atas keterlambatan pengumpulan tugas akibat kendala teknis pihak ketiga (e.g. server Moodle down).
            </p>
        </section>

        <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Akun Pengguna</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
                Anda diwajibkan menggunakan email institusi (@student.itera.ac.id) untuk mendaftar layanan ini guna menjaga integritas platform khusus mahasiswa Itera.
            </p>
        </section>

        <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Pembatasan</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
                Dilarang menggunakan bot ini untuk tujuan spamming, manipulasi data, atau tindakan yang melanggar kode etik kemahasiswaan.
            </p>
        </section>
      </div>
    </InfoLayout>
  )
}
