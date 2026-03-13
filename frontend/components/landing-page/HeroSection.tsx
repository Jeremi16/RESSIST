'use client'

import { motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-white pt-20">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-indigo-400/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-[10%] left-[20%] w-[35%] h-[35%] bg-purple-400/20 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 mb-6 group hover:border-blue-200 transition-colors cursor-default">
                <div className="size-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <Sparkles className="size-3 text-white" />
                </div>
                <span className="text-xs font-bold text-slate-600 tracking-tightest uppercase letter spacing-widest">
                  Copilot Akademik Cerdas ITERA
                </span>
              </div>

              <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
                Taklukkan Semestermu dengan{' '}
                <span className="relative inline-block text-blue-600">
                  Resisst
                  <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 100 8" preserveAspectRatio="none">
                    <path d="M0 5C30 2 70 8 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="text-xl text-slate-600 mb-10 max-w-xl leading-relaxed">
                Sinkronkan kalender Moodle ITERA dalam hitungan detik. Dapatkan pengingat WhatsApp otomatis sebelum deadline tugas. Dibuat khusus mahasiswa pejuang IPK.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
                <Link 
                  href="/register" 
                  className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto px-8 py-7 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 hover:scale-[1.02] shadow-2xl shadow-slate-900/20 transition-all group")}
                >
                  Mulai Sekarang Gratis
                  <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <CheckCircle2 className="size-4 text-green-500" />
                  Tanpa biaya pendaftaran
                </div>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-8 opacity-75 grayscale hover:grayscale-0 transition-all duration-500">
                <div className="flex items-center gap-2 group">
                  <div className="size-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <span className="font-bold text-slate-400 group-hover:text-blue-500">M</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">Support Moodle ITERA</span>
                </div>
                <div className="flex items-center gap-2 group">
                  <div className="size-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-green-50 transition-colors">
                    <span className="font-bold text-slate-400 group-hover:text-green-500">W</span>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">WA Terverifikasi</span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex-1 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative z-20 group"
            >
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative glass-card border-white/40 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden rounded-[2.5rem]">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10" />
                <div className="h-[500px] w-full bg-slate-50/50 backdrop-blur-sm flex items-center justify-center border-b border-white/20">
                   <div className="flex flex-col items-center gap-6 p-12 text-center">
                     <div className="size-20 bg-white rounded-3xl shadow-xl flex items-center justify-center animate-bounce">
                        <Sparkles className="size-10 text-blue-600" />
                     </div>
                     <h3 className="text-2xl font-black text-slate-900 tracking-tight">Preview Interaktif Segera Hadir</h3>
                     <p className="text-slate-500 max-w-xs">Status akademikmu dalam sekejap, divisualisasikan dengan indah.</p>
                     
                     {/* Mock UI Elements */}
                     <div className="w-full space-y-3 mt-4">
                        <div className="h-12 w-full bg-white/80 rounded-xl border border-white/50 flex items-center px-4 gap-3 shadow-sm">
                           <div className="size-6 bg-blue-100 rounded-lg" />
                           <div className="h-2 w-24 bg-slate-100 rounded-full" />
                           <div className="ml-auto h-2 w-12 bg-green-100 rounded-full" />
                        </div>
                        <div className="h-12 w-full bg-white/60 rounded-xl border border-white/50 flex items-center px-4 gap-3 shadow-sm">
                           <div className="size-6 bg-purple-100 rounded-lg" />
                           <div className="h-2 w-32 bg-slate-100 rounded-full" />
                           <div className="ml-auto h-2 w-12 bg-blue-100 rounded-full" />
                        </div>
                     </div>
                   </div>
                </div>
              </div>
              
              {/* Floating Badge */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-8 top-1/4 z-30 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4"
              >
                <div className="size-10 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                  <p className="text-sm font-bold text-slate-900 tracking-tight">Tugas Tersinkronisasi</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
