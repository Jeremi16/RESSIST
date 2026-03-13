import { InfoLayout } from '@/components/InfoLayout'

export default function KebijakanCookie() {
  return (
    <InfoLayout 
      category="Legal"
      title="Kebijakan Cookie"
      subtitle="Kami menggunakan cookie untuk memastikan Anda tetap masuk dan mendapatkan pengalaman terbaik."
    >
      <div className="space-y-8">
        <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Apa itu Cookie?</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
                Cookie adalah file teks kecil yang disimpan di perangkat Anda untuk membantu situs web berfungsi dengan baik.
            </p>
        </section>

        <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Cookie yang Kami Gunakan</h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-600 font-medium">
                <li><strong>Autentikasi:</strong> Untuk menjaga sesi login Anda tetap aktif.</li>
                <li><strong>Preferensi:</strong> Mengingat pengaturan tab atau bahasa yang Anda pilih.</li>
            </ul>
        </section>

        <section className="space-y-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Mengelola Cookie</h3>
            <p className="text-slate-600 font-medium leading-relaxed">
                Anda dapat menonaktifkan cookie melalui pengaturan browser Anda, namun ini mungkin akan mengganggu fungsi login kami.
            </p>
        </section>
      </div>
    </InfoLayout>
  )
}
