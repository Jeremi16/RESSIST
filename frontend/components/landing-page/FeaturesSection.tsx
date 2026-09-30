"use client";

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CalendarSync, GraduationCap, MessageCircle } from "lucide-react";

const features = [
  {
    name: "Sinkron Moodle.",
    description:
      "Tugas dari kuliah2.itera.ac.id terambil otomatis — cukup tempel URL kalender sekali.",
    icon: CalendarSync,
  },
  {
    name: "Sinkron Classroom.",
    description:
      "Login dengan akun Google ITERA, tugas Google Classroom langsung masuk ke daftar.",
    icon: GraduationCap,
  },
  {
    name: "Ingat via chat.",
    description:
      "Pengingat dikirim ke WhatsApp atau Telegram sebelum deadline, sesuai jadwal pilihanmu.",
    icon: MessageCircle,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-xl mb-16"
        >
          <h2 className="font-display text-4xl lg:text-5xl font-bold tracking-tight mb-5">
            Mulai perjalananmu.
          </h2>
          <p className="font-serif text-lg text-black/80 leading-relaxed">
            Datang dengan semua deadline, tugas yang menumpuk, dan grup kelas
            yang ramai — biar Ressist yang merapikannya.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {features.map((f) => (
            <div key={f.name}>
              <f.icon className="size-9 text-black mb-6" strokeWidth={1.25} />
              <h3 className="font-display text-sm font-bold mb-3">{f.name}</h3>
              <p className="font-serif text-black/70 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>

        <Link
          to="/features"
          className="inline-block mt-16 font-display text-xs uppercase tracking-wider text-black/60 underline underline-offset-4 hover:text-[#0059D0] transition-colors"
        >
          Lihat semua fitur &rarr;
        </Link>
      </div>
    </section>
  );
}
