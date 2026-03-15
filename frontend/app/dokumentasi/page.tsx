import { InfoLayout } from "@/components/InfoLayout";

export default function Dokumentasi() {
  return (
    <InfoLayout
      category="Sumber Daya"
      title="Dokumentasi"
      subtitle="Pelajari cara kerja Resisst dan bagaimana mengoptimalkan penggunaannya."
    >
      <div className="space-y-6 sm:space-y-8 prose prose-slate max-w-none">
        <h3 className="text-lg sm:text-xl font-black text-slate-900">
          Pengenalan
        </h3>
        <p className="text-slate-600 font-medium text-sm sm:text-base">
          Resisst adalah bot asisten akademik yang menghubungkan Moodle Itera
          dengan Telegram dan WhatsApp melalui fitur Export Calendar.
        </p>

        <h3 className="text-lg sm:text-xl font-black text-slate-900">
          Arsitektur
        </h3>
        <p className="text-slate-600 font-medium text-sm sm:text-base">
          Sistem kami mem-parsing file <code>.ics</code> yang disediakan oleh
          Moodle secara berkala dan mencocokkan waktu saat ini dengan waktu
          pengingat yang Anda atur di Dashboard.
        </p>

        <div className="bg-slate-900 text-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl space-y-3 sm:space-y-4">
          <h4 className="text-blue-400 font-black uppercase text-xs tracking-widest">
            Penting
          </h4>
          <p className="font-medium text-slate-300 text-sm sm:text-base">
            Resisst tidak melakukan scraping langsung ke Moodle, sehingga akun
            Anda tetap aman dari risiko deteksi bot oleh admin kampus.
          </p>
        </div>
      </div>
    </InfoLayout>
  );
}
