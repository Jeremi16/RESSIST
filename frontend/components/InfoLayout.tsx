"use client";

import { motion } from "framer-motion";
import { ChevronLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface InfoLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  category: string;
}

export function InfoLayout({
  children,
  title,
  subtitle,
  category,
}: InfoLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] size-[500px] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] size-[500px] bg-indigo-500/5 blur-[120px] rounded-full" />
      </div>

      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-black rotate-3 shadow-lg shadow-blue-600/20">
              R
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                Ressist by <span className="font-brand">NODRYX</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                v0.1.0 Beta
              </span>
            </div>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 group text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            Kembali
          </Link>
        </div>
      </nav>

      <main className="relative pt-40 pb-24">
        <div className="container mx-auto px-6 max-w-4xl">
          <header className="mb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-6"
            >
              <Sparkles className="size-3 text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                {category}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-none mb-6"
            >
              {title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-500 font-medium leading-relaxed max-w-2xl"
            >
              {subtitle}
            </motion.p>
          </header>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/[0.02] prose prose-slate max-w-none"
          >
            {children}
          </motion.div>

          <footer className="mt-16 pt-16 border-t border-slate-200">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-900 rounded-[2rem] p-8 md:p-12 text-white">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-2xl font-black tracking-tight">
                  Siap untuk mulai?
                </h3>
                <p className="text-slate-400 font-medium">
                  Gabung bersama ribuan mahasiswa ITERA lainnya.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <Link
                  href="/register"
                  className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center"
                >
                  Daftar Sekarang
                </Link>
                <Link
                  href="/login"
                  className="h-14 px-8 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center"
                >
                  Masuk
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
