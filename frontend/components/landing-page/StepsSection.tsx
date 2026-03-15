"use client";

import { motion } from "framer-motion";
import { UserPlus, Link2, BellRing, Coffee } from "lucide-react";

const steps = [
  {
    title: "Pendaftaran",
    description: "Masuk dengan akun Student ITERA",
    icon: UserPlus,
  },
  {
    title: "Integrasi",
    description: "Hubungkan dengan kuliah2.itera.ac.id cukup dengan URL.",
    icon: Link2,
  },
  {
    title: "Otomatisasi",
    description: "Atur kapan kamu ingin menerima pesan pengingat.",
    icon: BellRing,
  },
  {
    title: "Fokus Belajar",
    description:
      "Biarkan Resisst yang memantau deadline sementara kamu fokus belajar.",
    icon: Coffee,
  },
];

export function StepsSection() {
  return (
    <section id="how-it-works" className="py-32 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-blue-600 mb-4">
              Alur Kerja
            </h2>
            <p className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Dari Deadliners jadi <br /> non-chalant.
            </p>
          </motion.div>
        </div>

        <div className="relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center text-center group"
              >
                <div className="size-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center mb-8 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all duration-500 shadow-sm relative">
                  <step.icon className="size-8 text-slate-400 group-hover:text-white transition-colors" />
                  <div className="absolute -top-2 -right-2 size-8 bg-white rounded-full border border-slate-100 flex items-center justify-center text-xs font-black text-slate-900 shadow-lg">
                    0{index + 1}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-[200px]">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
