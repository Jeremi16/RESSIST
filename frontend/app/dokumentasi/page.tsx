import { InfoLayout } from "@/components/InfoLayout";

export default function Dokumentasi() {
  return (
    <InfoLayout
      category="Sumber Daya"
      title="Dokumentasi"
      subtitle="Pelajari cara kerja Ressist dan bagaimana mengoptimalkan penggunaannya."
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-black">Pengenalan</h3>
          <p className="text-sm text-black/60 leading-relaxed">
            Ressist adalah bot asisten akademik yang menghubungkan Moodle ITERA
            dengan Telegram dan WhatsApp melalui fitur Export Calendar.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-black">Arsitektur</h3>
          <p className="text-sm text-black/60 leading-relaxed">
            Sistem mem-parsing file <code className="px-1.5 py-0.5 bg-[#F5F0EB] rounded text-xs">.ics</code> dari
            Moodle secara berkala dan mencocokkan waktu saat ini dengan waktu
            pengingat yang Anda atur di Dashboard.
          </p>
        </div>

        <div className="bg-black text-white p-6 rounded-2xl space-y-2">
          <h4 className="text-xs font-medium tracking-wide text-white/40">
            Penting
          </h4>
          <p className="text-sm text-white/70 leading-relaxed">
            Ressist tidak melakukan scraping langsung ke Moodle, sehingga akun
            Anda tetap aman dari risiko deteksi bot oleh admin kampus.
          </p>
        </div>
      </div>
    </InfoLayout>
  );
}
