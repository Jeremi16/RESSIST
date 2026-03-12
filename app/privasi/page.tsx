import { InfoLayout } from '@/components/InfoLayout'

export default function Privasi() {
  return (
    <InfoLayout 
      category="Legal"
      title="Kebijakan Privasi"
      subtitle="Keamanan data Anda adalah prioritas utama kami. Kami menghormati privasi akademik Anda."
    >
      <div className="space-y-8">
        <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Data yang Kami Kumpulkan</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
                Kami hanya mengumpulkan data yang diperlukan untuk fungsi bot pengingat, yaitu:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600 font-medium">
                <li>Informasi akun (Nama, Email ITERA)</li>
                <li>Link kalender export Moodle yang Anda bagikan</li>
                <li>Chat ID Telegram/WhatsApp untuk pengiriman notifikasi</li>
            </ul>
        </section>

        <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Bagaimana Kami Menggunakan Data</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
                Data Anda digunakan secara eksklusif untuk memproses jadwal tugas dan mengirimkan pengingat. Kami tidak pernah menjual data Anda kepada pihak ketiga.
            </p>
        </section>

        <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Keamanan</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
                Setiap data sensitif dienkrpisi menggunakan standar industri untuk memastikan tidak ada akses tidak sah ke rencana akademik Anda.
            </p>
        </section>
      </div>
    </InfoLayout>
  )
}
