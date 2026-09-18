import { InfoLayout } from "@/components/InfoLayout";

export default function Tentang() {
  return (
    <InfoLayout
      category="Perusahaan"
      title="Tentang Ressist"
      subtitle="Dari Mahasiswa ITERA, Untuk Mahasiswa ITERA."
    >
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-black tracking-tight">
            Misi Kami
          </h2>
          <p className="text-base text-black/60 leading-relaxed">
            Ressist lahir dari keresahan mahasiswa ITERA dalam
            mengelola deadline tugas yang menumpuk di Moodle. Kami percaya
            bahwa teknologi harus membantu mahasiswa fokus belajar, bukan
            pusing menghafal deadline dari berbagai platform.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Platform Terbaik", value: "#1", desc: "Reminder Moodle di ITERA" },
            { label: "Mahasiswa Aktif", value: "1,000+", desc: "Telah terdaftar" },
            { label: "Notifikasi Terkirim", value: "50k+", desc: "Setiap bulannya" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-6 bg-[#60A8F8]/10 rounded-2xl border border-black/5"
            >
              <p className="text-xs font-medium tracking-wide text-black/40 mb-2">
                {stat.label}
              </p>
              <p className="text-3xl font-semibold text-[#0059D0] mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-black/40">{stat.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </InfoLayout>
  );
}
