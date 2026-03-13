import { InfoLayout } from '@/components/InfoLayout'

export default function Roadmap() {
  const MILESTONES = [
    { quarter: "Q1 2024", title: "Resisst Launch", desc: "Peluncuran perdana dengan dukungan Moodle ITERA dan Telegram.", status: "Done" },
    { quarter: "Q2 2024", title: "WhatsApp Integration", desc: "Mendatangkan pengingat langsung ke aplikasi chat terpopuler.", status: "In Progress" },
    { quarter: "Q3 2024", title: "Google Classroom", desc: "Mendukung sinkronisasi tugas dari platform Google.", status: "Planned" },
    { quarter: "Q4 2024", title: "Smart Scheduling", desc: "Prediksi waktu yang dibutuhkan untuk mengerjakan tugas berbasis AI.", status: "Research" },
  ]

  return (
    <InfoLayout 
      category="Produk"
      title="Roadmap Pengembangan"
      subtitle="Melihat rencana masa depan Resisst untuk mendukung prestasimu."
    >
      <div className="space-y-12">
        <div className="relative space-y-8 before:absolute before:left-8 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
            {MILESTONES.map((item, i) => (
                <div key={i} className="relative pl-20 group">
                    <div className={`absolute left-8 -translate-x-1/2 top-4 size-8 rounded-full border-4 border-white shadow-sm transition-all ${item.status === 'Done' ? 'bg-green-500' : item.status === 'In Progress' ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`} />
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all group-hover:scale-[1.01] group-hover:shadow-md">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">{item.quarter} • {item.status}</span>
                        <h3 className="text-xl font-black text-slate-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </InfoLayout>
  )
}
