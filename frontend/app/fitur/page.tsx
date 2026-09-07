import { InfoLayout } from "@/components/InfoLayout";

export default function Fitur() {
  return (
    <InfoLayout
      category="Produk"
      title="Fitur Unggulan"
      subtitle="Dirancang khusus untuk membantu mahasiswa menguasai jadwal akademik tanpa rasa khawatir."
    >
      <div className="space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-white border border-black/5 space-y-3">
            <div className="size-10 bg-black rounded-xl flex items-center justify-center text-xs font-medium text-white">
              LMS
            </div>
            <h3 className="text-base font-semibold text-black tracking-tight">
              Sinkronisasi Moodle Otomatis
            </h3>
            <p className="text-sm text-black/60 leading-relaxed">
              Tidak perlu cek Moodle manual setiap jam. Resisst
              memantau kalender Moodle dan mengupdate jadwal real-time.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-black/5 space-y-3">
            <div className="size-10 bg-black rounded-xl flex items-center justify-center text-xs font-medium text-white">
              CHAT
            </div>
            <h3 className="text-base font-semibold text-black tracking-tight">
              Notifikasi Telegram & WhatsApp
            </h3>
            <p className="text-sm text-black/60 leading-relaxed">
              Terima pengingat langsung di aplikasi chat favorit Anda.
              Kustomisasi waktu pengingat sesuai keinginan Anda.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-black tracking-tight">
            Lebih dari sekadar pengingat
          </h2>
          <p className="text-sm text-black/60 leading-relaxed">
            Resisst dikembangkan memahami struggle mahasiswa. Fitur Morning Briefing setiap jam 7 pagi membantu Anda
            bangun dengan gambaran tugas yang menanti hari ini.
          </p>
        </section>
      </div>
    </InfoLayout>
  );
}
