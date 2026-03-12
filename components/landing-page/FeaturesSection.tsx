'use client'

import { motion } from 'framer-motion'
import { Calendar, Bell, Shield, Smartphone, Zap, Code, Heart, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    name: 'Sinkronisasi Moodle',
    description: 'Sinkronisasi instan dengan kalender Moodle ITERA. Satu klik, tanpa ribet.',
    icon: Calendar,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    name: 'Notifikasi WA',
    description: 'Pesan pengingat langsung ke WhatsApp pribadimu. Cara tercepat tetap update.',
    icon: Bell,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    name: 'Keamanan Data',
    description: 'Enkripsi tingkat tinggi untuk datamu. Privasi mahasiwa adalah prioritas kami.',
    icon: Shield,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    name: 'Akses Mobile',
    description: 'Dioptimalkan untuk mahasiswa ITERA yang sibuk. Pantau tugas lewat HP.',
    icon: Smartphone,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
]

const stats = [
  { label: 'Uptime', value: '99.9%', icon: Zap },
  { label: 'Latensi', value: '<50ms', icon: Code },
  { label: 'Mahasiswa', value: '5rb+', icon: Heart },
  { label: 'Mata Kuliah', value: '200+', icon: Layers },
]

export function FeaturesSection() {
  return (
    <section id="features" className="bg-slate-50/50 py-32 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mb-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-blue-600 mb-4">Kemampuan Utama</h2>
            <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
              Asisten studi terbaik <br /> untuk anak ITERA.
            </p>
            <p className="text-lg text-slate-500 max-w-xl leading-relaxed">
              Resisst bukan sekadar bot; ini adalah mesin produktivitas yang dirancang untuk menghilangkan stres akibat deadline tugas.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-8 rounded-[2rem] bg-white border border-slate-100 hover:border-blue-200 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all"
            >
              <div className={cn("size-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", feature.bg)}>
                <feature.icon className={cn("size-7", feature.color)} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{feature.name}</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-32 pt-16 border-t border-slate-200">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-3 text-blue-600 mb-2">
                  <stat.icon className="size-5" />
                  <span className="text-2xl font-black tracking-tighter text-slate-900">{stat.value}</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
