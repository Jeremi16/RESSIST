import { Link } from "react-router-dom";
import {
  CalendarSync,
  GraduationCap,
  MessageCircle,
  Sunrise,
  RefreshCw,
  WifiOff,
  CalendarDays,
  Filter,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { InfoLayout } from "@/components/InfoLayout";

const groups = [
  {
    title: "Sinkronisasi",
    items: [
      {
        icon: CalendarSync,
        name: "Moodle ITERA",
        desc: "Tempel URL kalender kuliah2.itera.ac.id sekali, tugas dan deadline terambil otomatis.",
      },
      {
        icon: GraduationCap,
        name: "Google Classroom",
        desc: "Masuk dengan akun Google @student.itera.ac.id, tugas Classroom langsung ikut masuk.",
      },
      {
        icon: RefreshCw,
        name: "Sinkron otomatis berkala",
        desc: "Tiap 1, 3, 6, atau 12 jam — atau manual. Bisa khusus WiFi, plus notifikasi saat ada tugas baru.",
      },
    ],
  },
  {
    title: "Pengingat",
    items: [
      {
        icon: MessageCircle,
        name: "Bot Telegram & WhatsApp",
        desc: "Pengingat deadline dikirim ke chat, dengan waktu pengingat yang bisa kamu atur sendiri.",
      },
      {
        icon: Sunrise,
        name: "Morning Briefing",
        desc: "Ringkasan tugas hari ini dikirim setiap pagi, jadi kamu bangun dengan gambaran yang jelas.",
      },
      {
        icon: CalendarDays,
        name: "Kalender tugas",
        desc: "Semua deadline dari Moodle dan Classroom dalam satu kalender, di web maupun aplikasi.",
      },
    ],
  },
  {
    title: "Aplikasi Android",
    items: [
      {
        icon: WifiOff,
        name: "Mode offline",
        desc: "Tugas, kelas, dan kalender terakhir tersimpan di HP dan tetap tampil tanpa koneksi.",
      },
      {
        icon: Filter,
        name: "Batas tampilan tugas",
        desc: "Tampilkan tugas 7, 14, 28, atau 60 hari ke depan saja; pengingat tetap mencakup semuanya.",
      },
      {
        icon: Smartphone,
        name: "Update dari aplikasi",
        desc: "Cek pembaruan otomatis, unduh, dan pasang versi baru langsung dari menu Tentang.",
      },
      {
        icon: ShieldCheck,
        name: "Sesi yang awet",
        desc: "Tetap masuk walau sinyal putus-putus atau server sibuk sesaat; logout selalu bersih.",
      },
    ],
  },
];

export default function Fitur() {
  return (
    <InfoLayout
      category="Produk"
      title="Semua yang Ressist bisa."
      subtitle="Satu tempat untuk semua deadline Moodle dan Google Classroom, dengan pengingat yang datang sendiri ke chat kamu."
    >
      <div className="space-y-20 not-prose">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="font-display text-[11px] font-medium uppercase tracking-wider text-black/50 mb-8 pb-3 border-b border-black/10">
              {g.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
              {g.items.map((f) => (
                <div key={f.name}>
                  <f.icon className="size-7 text-black mb-4" strokeWidth={1.25} />
                  <h3 className="font-display text-sm font-bold text-black mb-2">{f.name}</h3>
                  <p className="font-serif text-black/70 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="flex flex-wrap items-center gap-6">
          <Link
            to="/login"
            className="inline-flex items-center justify-center h-12 px-7 bg-[#0059D0] text-white font-display text-xs font-medium uppercase tracking-wider hover:bg-[#0043A5] transition-colors no-underline"
          >
            Mulai Sekarang
          </Link>
          <Link
            to="/app"
            className="font-display text-xs uppercase tracking-wider text-black/60 underline underline-offset-4 hover:text-[#0059D0] transition-colors"
          >
            Unduh App &rarr;
          </Link>
        </section>
      </div>
    </InfoLayout>
  );
}
