"use client";

import { motion } from "framer-motion";
import { Calendar, Bell, GraduationCap, Send } from "lucide-react";

const features = [
  {
    name: "Sinkronisasi Moodle",
    description: "Sinkronisasi instan dengan kalender Moodle ITERA.",
    icon: Calendar,
  },
  {
    name: "Sinkronisasi Classroom",
    description: "Integrasi otomatis dengan Google Classroom.",
    icon: GraduationCap,
  },
  {
    name: "Bot Telegram",
    description: "Dapatkan notifikasi tugas langsung via Bot Telegram.",
    icon: Send,
  },
  {
    name: "Bot WhatsApp",
    description:
      "Pesan pengingat langsung ke WhatsApp pribadimu. Cara tercepat tetap update.",
    icon: Bell,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-[#F5F0EB] px-4 lg:px-8 pb-8">
      <div className="mx-auto max-w-[1280px] bg-white rounded-[24px] border border-black/5 px-6 lg:px-10 py-12 lg:py-16">
        <div className="max-w-2xl mb-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-black leading-tight mb-4 text-balance">
              Asisten studi terbaik untuk anak ITERA.
            </h2>
            <p className="text-sm lg:text-base text-black/60 leading-relaxed">
              Ressist bukan sekadar Website, Ressist adalah sistem produktivitas
              yang dirancang untuk membantu deadliners mengelola deadline tugas.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="p-6 rounded-2xl bg-white border border-black/5 hover:border-black/10 transition-colors"
            >
              <div className="size-10 rounded-xl bg-black text-white flex items-center justify-center mb-5">
                <feature.icon className="size-5" />
              </div>
              <h3 className="text-[15px] font-semibold text-black tracking-tight mb-2">
                {feature.name}
              </h3>
              <p className="text-sm text-black/60 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
