import { InfoLayout } from "@/components/InfoLayout";

export default function Tentang() {
  return (
    <InfoLayout
      category="Perusahaan"
      title="Tentang Resisst"
      subtitle="Dari Mahasiswa ITERA, Untuk Mahasiswa ITERA."
    >
      <div className="space-y-8 sm:space-y-12">
        <section className="space-y-4 sm:space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Misi Kami
          </h2>
          <p className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed">
            Resisst lahir dari keresahan yang dialami mahasiswa ITERA dalam
            mengelola deadline tugas yang menumpuk di Moodle. Kami percaya
            bahwa teknologi harus bisa membantu mahasiswa fokus belajar, bukan
            pusing menghafal deadline dari berbagai platform berbeda.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
          {[
            {
              label: "Platform Terbaik",
              value: "#1",
              desc: "Reminder Moodle di ITERA",
            },
            {
              label: "Mahasiswa Aktif",
              value: "1,000+",
              desc: "Telah terdaftar",
            },
            {
              label: "Notifikasi Terkirim",
              value: "50k+",
              desc: "Setiap bulannya",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-5 sm:p-8 bg-slate-50 rounded-2xl sm:rounded-3xl border border-slate-100"
            >
              <p className="text-[10px] sm:text-sm font-black text-slate-400 uppercase tracking-widest mb-2">
                {stat.label}
              </p>
              <p className="text-3xl sm:text-4xl font-black text-blue-600 mb-1">
                {stat.value}
              </p>
              <p className="text-[11px] font-bold text-slate-500">{stat.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </InfoLayout>
  );
}
