"use client";

import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuthStatus } from "@/src/hooks/use-auth-status";

const steps = [
  { title: "Masuk", description: "Gunakan akun Google @student.itera.ac.id. Tanpa daftar manual." },
  { title: "Hubungkan", description: "Tempel URL kalender Moodle; Classroom tersambung otomatis." },
  { title: "Atur pengingat", description: "Pilih WhatsApp atau Telegram, lalu tentukan kapan diingatkan." },
  { title: "Fokus belajar", description: "Ressist memantau deadline, kamu cukup mengerjakan tugasnya." },
];

export function StepsSection() {
  const authStatus = useAuthStatus();
  return (
    <section id="how-it-works" className="bg-[#F5F5F5] py-24 lg:py-32">
      <div className="mx-auto max-w-[1120px] px-6 grid lg:grid-cols-12 gap-16 items-start">
        <div className="lg:col-span-7">
          <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Mulai hari ini.
          </h2>
          <p className="font-serif text-lg text-black/80 mb-14">
            Empat langkah dari deadliner jadi non-chalant.
          </p>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-12">
            {steps.map((s, i) => (
              <div key={s.title}>
                <h3 className="font-display text-sm font-bold mb-3">
                  {i + 1}. {s.title}
                </h3>
                <p className="font-serif text-black/70 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-10 text-center shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]">
          <div className="flex justify-center mb-6">
            <Logo size={40} to={null} showWordmark={false} />
          </div>
          <p className="font-display text-sm font-bold mb-3">Siap berhenti panik deadline?</p>
          <p className="font-serif text-black/70 leading-relaxed mb-8">
            Gratis untuk mahasiswa ITERA. Bisa dipakai di web maupun aplikasi Android.
          </p>
          <div className="flex flex-col items-center gap-5">
            <Link
              to={authStatus === "authed" ? "/dashboard" : "/login"}
              className="inline-flex items-center justify-center h-12 px-7 bg-[#0059D0] text-white font-display text-xs font-medium uppercase tracking-wider hover:bg-[#0043A5] transition-colors"
            >
              {authStatus === "authed" ? "Buka Dashboard" : "Masuk dengan Google"}
            </Link>
            <Link
              to="/app"
              className="font-display text-xs uppercase tracking-wider text-black/60 underline underline-offset-4 hover:text-[#0059D0] transition-colors"
            >
              Unduh aplikasi Android &rarr;
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
