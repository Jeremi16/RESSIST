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
    <div className="min-h-screen bg-[#F5F0EB]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] size-[500px] bg-black/[0.03] blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] size-[500px] bg-black/[0.03] blur-[100px] rounded-full" />
      </div>

      <LandingNavbar showBackButton />

      <main className="relative pt-10 pb-16 sm:pb-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <header className="mb-10">
            <p className="text-xs font-semibold tracking-wide text-black/40 mb-3">
              {category}
            </p>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl font-semibold text-black tracking-tight leading-tight mb-4 text-balance"
            >
              {title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-base text-black/60 leading-relaxed max-w-2xl"
            >
              {subtitle}
            </motion.p>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 sm:p-8 lg:p-10 rounded-2xl border border-black/5 shadow-sm prose prose-neutral max-w-none"
          >
            {children}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
