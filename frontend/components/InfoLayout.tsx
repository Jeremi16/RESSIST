"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { LandingNavbar } from "./LandingNavbar";
import { Footer } from "./landing-page/Footer";

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

      <LandingNavbar showBackButton />

      <main className="relative pt-28 sm:pt-36 pb-16 sm:pb-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <header className="mb-10 sm:mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight sm:leading-none mb-4 sm:mb-6"
            >
              {title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-base sm:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl"
            >
              {subtitle}
            </motion.p>
          </header>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-5 sm:p-8 md:p-12 rounded-[1.75rem] sm:rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/[0.02] prose prose-slate max-w-none"
          >
            {children}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
