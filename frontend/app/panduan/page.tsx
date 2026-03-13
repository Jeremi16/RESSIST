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
      <div className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {STEPS.map((step, i) => (
                <div key={i} className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 space-y-4">
                    <div className="size-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-sm">{i+1}</div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{step.title}</h3>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed">{step.desc}</p>
                </div>
            ))}
        </div>

        <section className="bg-blue-600 rounded-[2.5rem] p-12 text-white flex flex-col items-center text-center space-y-8">
            <div className="size-20 bg-white/10 rounded-full flex items-center justify-center text-4xl">📚</div>
            <div className="space-y-2">
                <h3 className="text-3xl font-black tracking-tight">Butuh panduan lengkap?</h3>
                <p className="text-blue-100 font-medium">Download PDF panduan penggunaan eksklusif untuk mahasiswa Itera.</p>
            </div>
            <button className="h-14 px-8 bg-white text-blue-600 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-blue-50">
                Download PDF
            </button>
        </section>
      </div>
    </InfoLayout>
  )
}
