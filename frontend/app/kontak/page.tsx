import { InfoLayout } from "@/components/InfoLayout";

export default function Kontak() {
  return (
    <InfoLayout
      category="Perusahaan"
      title="Hubungi Kami"
      subtitle="Ada pertanyaan, saran, atau ingin bekerja sama? Kami siap membantu."
    >
      <div className="space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-white border border-black/5 space-y-4">
            <div className="size-10 bg-black rounded-xl flex items-center justify-center text-sm font-medium text-white">
              @
            </div>
            <div>
              <h3 className="text-base font-semibold text-black">Email Dukungan</h3>
              <p className="text-sm text-black/40 mt-1">Sapa kami di email operasional</p>
            </div>
            <p className="text-sm font-medium text-black break-all">support@resisst.com</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-black/5 space-y-4">
            <div className="size-10 bg-black rounded-xl flex items-center justify-center text-xs font-medium text-white">WA</div>
            <div>
              <h3 className="text-base font-semibold text-black">Chat WhatsApp</h3>
              <p className="text-sm text-black/40 mt-1">Fast response 08:00 - 17:00</p>
            </div>
            <p className="text-sm font-medium text-black">+62 812-3456-7890</p>
          </div>
        </section>

        <section className="p-6 rounded-2xl bg-white border border-black/5 space-y-5">
          <h3 className="text-base font-semibold text-black tracking-tight">Kirim Pesan Langsung</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-black/40">Nama Lengkap</label>
              <input type="text" className="w-full h-10 bg-[#F5F0EB] border border-black/5 rounded-xl px-4 text-sm focus:outline-none focus:border-black/10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-black/40">Email Kampus</label>
              <input type="email" className="w-full h-10 bg-[#F5F0EB] border border-black/5 rounded-xl px-4 text-sm focus:outline-none focus:border-black/10" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-black/40">Pesan</label>
              <textarea rows={4} className="w-full bg-[#F5F0EB] border border-black/5 rounded-xl p-4 text-sm focus:outline-none focus:border-black/10"></textarea>
            </div>
            <button className="md:col-span-2 h-10 bg-black text-white rounded-full text-sm font-medium hover:bg-black/90 transition-colors">
              Kirim Pesan
            </button>
          </div>
        </section>
      </div>
    </InfoLayout>
  );
}
