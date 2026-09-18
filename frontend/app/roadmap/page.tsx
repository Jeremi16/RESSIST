import { InfoLayout } from '@/components/InfoLayout'

export default function Roadmap() {
  const MILESTONES = [
    { quarter: "Q1 2024", title: "Ressist Launch", desc: "Peluncuran perdana dengan dukungan Moodle ITERA dan Telegram.", status: "Done" },
    { quarter: "Q2 2024", title: "WhatsApp Integration", desc: "Mendatangkan pengingat langsung ke aplikasi chat terpopuler.", status: "In Progress" },
    { quarter: "Q3 2024", title: "Google Classroom", desc: "Mendukung sinkronisasi tugas dari platform Google.", status: "Planned" },
    { quarter: "Q4 2024", title: "Smart Scheduling", desc: "Prediksi waktu yang dibutuhkan untuk mengerjakan tugas berbasis AI.", status: "Research" },
  ]

  return (
    <InfoLayout 
      category="Produk"
      title="Roadmap Pengembangan"
      subtitle="Rencana masa depan Ressist untuk mendukung prestasimu."
    >
      <div className="relative space-y-4 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-black/5">
        {MILESTONES.map((item, i) => (
          <div key={i} className="relative pl-12">
            <div className={`absolute left-4 -translate-x-1/2 top-5 size-3 rounded-full ${item.status === 'Done' ? 'bg-[#0059D0]' : item.status === 'In Progress' ? 'bg-[#60A8F8]' : 'bg-black/20'}`} />
            <div className="bg-white p-6 rounded-2xl border border-black/5">
              <span className="text-xs text-black/40">{item.quarter} • {item.status}</span>
              <h3 className="text-base font-semibold text-black mt-1 mb-1">{item.title}</h3>
              <p className="text-sm text-black/60 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </InfoLayout>
  )
}
