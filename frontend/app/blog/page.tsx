import { InfoLayout } from '@/components/InfoLayout'

export default function Blog() {
  const POSTS = [
    { title: "Tips Mengatur Waktu bagi Mahasiswa Semester 5", date: "12 Mar 2024", tag: "Produktivitas" },
    { title: "Ressist v2.0: Kini Lebih Cepat & Mendukung WhatsApp", date: "10 Mar 2024", tag: "Update" },
    { title: "Panduan Integrasi Moodle ITERA yang Benar", date: "05 Mar 2024", tag: "Tutorial" },
  ]

  return (
    <InfoLayout 
      category="Perusahaan"
      title="Blog & Berita"
      subtitle="Wawasan seputar dunia perkuliahan dan update terbaru dari tim Ressist."
    >
      <div className="space-y-3">
        {POSTS.map((post, i) => (
          <div key={i} className="group flex items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-black/5 hover:border-black/10 transition-colors cursor-pointer">
            <div className="space-y-2">
              <span className="inline-flex px-2.5 py-1 bg-[#F5F0EB] text-black/60 rounded-full text-xs font-medium">{post.tag}</span>
              <h3 className="text-base font-semibold text-black tracking-tight group-hover:text-black/70 transition-colors">{post.title}</h3>
              <p className="text-sm text-black/40">{post.date}</p>
            </div>
            <div className="size-9 rounded-xl bg-[#F5F0EB] flex items-center justify-center text-black/40 group-hover:bg-black group-hover:text-white transition-colors shrink-0">
              →
            </div>
          </div>
        ))}
      </div>
    </InfoLayout>
  )
}
