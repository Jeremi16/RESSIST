import { InfoLayout } from '@/components/InfoLayout'

export default function Kontak() {
  return (
    <InfoLayout 
      category="Perusahaan"
      title="Hubungi Kami"
      subtitle="Ada pertanyaan, saran, atau ingin bekerja sama? Kami siap membantu."
    >
      <div className="space-y-12">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-6">
                <div className="size-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl">📧</div>
                <div>
                   <h3 className="text-xl font-black text-slate-900">Email Dukungan</h3>
                   <p className="text-slate-500 font-medium text-sm mt-1">Sapa kami di email operasional</p>
                </div>
                <p className="text-blue-600 font-black text-lg">support@resisst.com</p>
            </div>
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 space-y-6">
                <div className="size-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl">💬</div>
                <div>
                   <h3 className="text-xl font-black text-slate-900">Chat WhatsApp</h3>
                   <p className="text-slate-500 font-medium text-sm mt-1">Fast response jam 08:00 - 17:00</p>
                </div>
                <p className="text-green-600 font-black text-lg">+62 812-3456-7890</p>
            </div>
        </section>

        <section className="p-12 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Kirim Pesan Langsung</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Nama Lengkap</label>
                    <input type="text" className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Email Kampus</label>
                    <input type="email" className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600" />
                </div>
                <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Pesan</label>
                    <textarea rows={4} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600"></textarea>
                </div>
                <button className="md:col-span-2 h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                    Kirim Pesan
                </button>
            </div>
        </section>
      </div>
    </InfoLayout>
  )
}
