import { InfoLayout } from '@/components/InfoLayout'

export default function Status() {
  const SYSTEMS = [
    { name: "Penyimpanan Database", status: "Operational", color: "bg-green-500" },
    { name: "Sync Moodle (@kuliah2)", status: "Operational", color: "bg-green-500" },
    { name: "Sync Moodle (@moodle)", status: "Operational", color: "bg-green-500" },
    { name: "Bot Telegram", status: "Operational", color: "bg-green-500" },
    { name: "Bot WhatsApp (Alpha)", status: "Checking", color: "bg-amber-500" },
  ]

  return (
    <InfoLayout 
      category="Sumber Daya"
      title="Status Sistem"
      subtitle="Pantau performa layanan Resisst secara real-time."
    >
      <div className="space-y-12">
        <div className="p-10 rounded-[3rem] bg-slate-900 text-white flex items-center justify-between shadow-2xl">
            <div className="space-y-2">
                <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Status Global</p>
                <h3 className="text-3xl font-black tracking-tight">Semua Sistem Normal</h3>
            </div>
            <div className="size-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="size-8 bg-green-500 rounded-full animate-ping opacity-50 absolute" />
                <div className="size-4 bg-green-500 rounded-full" />
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight pl-2">Kesehatan Layanan</h3>
            <div className="grid grid-cols-1 gap-4">
                {SYSTEMS.map(sys => (
                    <div key={sys.name} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                        <span className="font-bold text-slate-700">{sys.name}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{sys.status}</span>
                            <div className={`size-2.5 rounded-full ${sys.color}`} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </InfoLayout>
  )
}
