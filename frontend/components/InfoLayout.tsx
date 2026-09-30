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
    <div className="min-h-screen bg-white">
      <LandingNavbar showBackButton />

      <main className="pt-16 lg:pt-24 pb-16">
        <div className="mx-auto max-w-[1120px] px-6">
          <motion.header
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-16 max-w-3xl"
          >
            <p className="font-display text-[11px] font-medium uppercase tracking-wider text-black/50 mb-4">
              {category}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-black tracking-tight leading-[1.05] mb-6 text-balance">
              {title}
            </h1>
            <p className="font-serif text-lg text-black/70 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          </motion.header>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="max-w-[720px] font-serif text-black/80 leading-relaxed [&_h2]:font-display [&_h2]:tracking-tight [&_h3]:font-display [&_h3]:tracking-tight [&_p_a]:underline [&_p_a:hover]:text-[#0059D0]"
          >
            {children}
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
