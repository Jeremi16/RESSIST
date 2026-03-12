import { InfoLayout } from '@/components/InfoLayout'

export default function Dokumentasi() {
  return (
    <InfoLayout 
      category="Sumber Daya"
      title="Dokumentasi"
      subtitle="Pelajari cara kerja Resisst dan bagaimana mengoptimalkan penggunaannya."
    >
      <div className="space-y-8 prose prose-slate max-w-none">
        <h3 className="text-xl font-black text-slate-900">Pengenalan</h3>
        <p className="text-slate-600 font-medium">
            Resisst adalah bot asisten akademik yang menghubungkan Moodle Itera dengan Telegram dan WhatsApp melalui fitur Export Calendar.
        </p>
        
        <h3 className="text-xl font-black text-slate-900">Arsitektur</h3>
        <p className="text-slate-600 font-medium">
            Sistem kami mem-parsing file `.ics` yang disediakan oleh Moodle secara berkala dan mencocokkan waktu saat ini dengan waktu pengingat yang Anda atur di Dashboard.
        </p>

        <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-4">
            <h4 className="text-blue-400 font-black uppercase text-xs tracking-widest">Penting</h4>
            <p className="font-medium text-slate-300">Resisst tidak melakukan scraping langsung ke Moodle, sehingga akun Anda tetap aman dari resiko deteksi bot oleh admin kampus.</p>
        </div>
      </div>
    </InfoLayout>
  )
}
