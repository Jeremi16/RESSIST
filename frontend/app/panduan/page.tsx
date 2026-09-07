import { InfoLayout } from '@/components/InfoLayout'

export default function Panduan() {
  const STEPS = [
    { title: "Daftar Akun", desc: "Gunakan email institusi (@student.itera.ac.id) untuk keamanan ekstra." },
    { title: "Hubungkan Moodle", desc: "Salin link export calendar dari Moodle Itera ke Dashboard Resisst." },
    { title: "Set Up Telegram", desc: "Buka bot kami di Telegram dan masukkan Chat ID Anda." },
    { title: "Santai!", desc: "Bot akan otomatis mengirimkan reminder sesuai jadwal yang Anda tentukan." },
  ]

  return (
    <InfoLayout 
      category="Sumber Daya"
      title="Panduan Memulai"
      subtitle="Mulai tingkatkan produktivitas akademik Anda hanya dalam 5 menit."
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STEPS.map((step, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white border border-black/5 space-y-3">
              <div className="size-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium">{i+1}</div>
              <h3 className="text-base font-semibold text-black tracking-tight">{step.title}</h3>
              <p className="text-sm text-black/60 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-black rounded-2xl p-8 text-white flex flex-col items-center text-center space-y-4">
          <h3 className="text-xl font-semibold tracking-tight">Butuh panduan lengkap?</h3>
          <p className="text-sm text-white/60">Download PDF panduan penggunaan eksklusif untuk mahasiswa ITERA.</p>
          <button className="h-10 px-6 bg-white text-black rounded-full text-sm font-medium">
            Download PDF
          </button>
        </div>
      </div>
    </InfoLayout>
  )
}
