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
      "Biarkan Ressist yang memantau deadline sementara kamu fokus belajar.",
    icon: Coffee,
  },
];

export function StepsSection() {
  return (
    <section id="how-it-works" className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-[#0059D0] leading-tight text-balance">
              Dari Deadliners jadi non-chalant.
            </h2>
          </motion.div>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-6 left-[12%] right-[12%] h-px bg-black/5" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-5">
                  <div className="size-12 rounded-xl bg-white border border-black/5 flex items-center justify-center">
                    <step.icon className="size-5 text-black/70" />
                  </div>
                  <div className="absolute -top-2 -right-2 size-6 bg-[#0059D0] rounded-full flex items-center justify-center text-[10px] font-semibold text-white">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-[15px] font-semibold text-black tracking-tight mb-1.5">
                  {step.title}
                </h3>
                <p className="text-sm text-black/60 leading-relaxed max-w-[200px] text-balance">
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
