import { InfoLayout } from '@/components/InfoLayout'

export default function Blog() {
  const POSTS = [
    { title: "Tips Mengatur Waktu bagi Mahasiswa Semester 5", date: "12 Mar 2024", tag: "Produktivitas" },
    { title: "Resisst v2.0: Kini Lebih Cepat & Mendukung WhatsApp", date: "10 Mar 2024", tag: "Update" },
    { title: "Panduan Integrasi Moodle ITERA yang Benar", date: "05 Mar 2024", tag: "Tutorial" },
  ]

  return (
    <InfoLayout 
      category="Perusahaan"
      title="Blog & Berita"
      subtitle="Wawasan seputar dunia perkuliahan dan update terbaru dari tim Resisst."
    >
      <div className="space-y-8">
        {POSTS.map((post, i) => (
            <div key={i} className="group p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:border-blue-200 transition-all cursor-pointer">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-3">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">{post.tag}</span>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">{post.title}</h3>
                        <p className="text-sm text-slate-400 font-bold">{post.date}</p>
                    </div>
                    <div className="size-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        →
                    </div>
                </div>
            </div>
        ))}
      </div>
    </InfoLayout>
  )
}
