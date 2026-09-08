import { InfoLayout } from "@/components/InfoLayout";

export default function Ketentuan() {
  return (
    <InfoLayout
      category="Legal"
      title="Syarat & Ketentuan"
      subtitle="Aturan main penggunaan Ressist agar tetap nyaman buat semua pejuang IPK."
    >
      <div className="space-y-6 sm:space-y-8">
        <section className="space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Penggunaan Layanan
          </h3>
          <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
            Ressist adalah alat bantu pengingat. Tanggung jawab akademik tetap
            berada di tangan masing-masing mahasiswa. Kami tidak bertanggung
            jawab atas keterlambatan pengumpulan tugas akibat kendala teknis
            pihak ketiga (misalnya server Moodle down).
          </p>
        </section>

        <section className="space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Akun Pengguna
          </h3>
          <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
            Anda diwajibkan menggunakan email institusi
            (@student.itera.ac.id) untuk mendaftar layanan ini guna menjaga
            integritas platform khusus mahasiswa ITERA.
          </p>
        </section>

        <section className="space-y-3 sm:space-y-4">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Pembatasan
          </h3>
          <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
            Dilarang menggunakan bot ini untuk tujuan spamming, manipulasi
            data, atau tindakan yang melanggar kode etik kemahasiswaan.
          </p>
        </section>
      </div>
    </InfoLayout>
  );
}
