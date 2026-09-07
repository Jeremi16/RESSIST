import { InfoLayout } from '@/components/InfoLayout'

export default function Status() {
  const SYSTEMS = [
    { name: "Penyimpanan Database", status: "Operational", color: "bg-emerald-500" },
    { name: "Sync Moodle (@kuliah2)", status: "Operational", color: "bg-emerald-500" },
    { name: "Sync Moodle (@moodle)", status: "Operational", color: "bg-emerald-500" },
    { name: "Bot Telegram", status: "Operational", color: "bg-emerald-500" },
    { name: "Bot WhatsApp (Alpha)", status: "Checking", color: "bg-amber-500" },
  ]

  return (
    <InfoLayout 
      category="Sumber Daya"
      title="Status Sistem"
      subtitle="Pantau performa layanan Resisst secara real-time."
    >
      <div className="space-y-8">
        <div className="p-6 rounded-2xl bg-black text-white flex items-center justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-white/40 mb-1">Status Global</p>
            <h3 className="text-xl font-semibold tracking-tight">Semua Sistem Normal</h3>
          </div>
          <div className="size-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <div className="size-3 bg-emerald-500 rounded-full" />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium tracking-wide text-black/40">Kesehatan Layanan</h3>
          <div className="grid gap-3">
            {SYSTEMS.map(sys => (
              <div key={sys.name} className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-2xl">
                <span className="text-sm font-medium text-black">{sys.name}</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-black/40">{sys.status}</span>
                  <div className={`size-2 rounded-full ${sys.color}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </InfoLayout>
  )
}
