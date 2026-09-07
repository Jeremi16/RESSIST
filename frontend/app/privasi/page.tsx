import { InfoLayout } from "@/components/InfoLayout";

export default function Privasi() {
  return (
    <InfoLayout
      category="Legal"
      title="Kebijakan Privasi"
      subtitle="Keamanan data Anda adalah prioritas utama kami."
    >
      <div className="space-y-8">
        <section className="space-y-2">
          <h3 className="text-base font-semibold text-black tracking-tight">
            Data yang Kami Kumpulkan
          </h3>
          <p className="text-sm text-black/60 leading-relaxed">
            Kami hanya mengumpulkan data yang diperlukan untuk fungsi bot
            pengingat, yaitu:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-black/60">
            <li>Informasi akun (Nama, Email ITERA)</li>
            <li>Link kalender export Moodle yang Anda bagikan</li>
            <li>Chat ID Telegram/WhatsApp untuk pengiriman notifikasi</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-black tracking-tight">
            Bagaimana Kami Menggunakan Data
          </h3>
          <p className="text-sm text-black/60 leading-relaxed">
            Data digunakan eksklusif untuk memproses jadwal tugas
            dan mengirim pengingat. Kami tidak pernah menjual data kepada pihak ketiga.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-black tracking-tight">
            Keamanan
          </h3>
          <p className="text-sm text-black/60 leading-relaxed">
            Data sensitif dienkripsi standar industri untuk
            memastikan tidak ada akses tidak sah.
          </p>
        </section>
      </div>
    </InfoLayout>
  );
}
