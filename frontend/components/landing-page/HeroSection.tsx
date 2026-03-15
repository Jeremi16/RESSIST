"use client";

import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-5rem)] lg:min-h-[90vh] flex items-center justify-center overflow-hidden bg-white pt-20 lg:pt-20">
      <div className="container relative z-10 mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-24">
          {/* Content - Full width on mobile */}
          <div className="flex-1 w-full text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              {/* Logo Badge - Mobile Only */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="lg:hidden mb-6"
              >
                <div className="size-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white rotate-3 shadow-xl shadow-blue-500/30">
                  <span className="text-3xl font-black">R</span>
                </div>
              </motion.div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest mb-4"
              >
                Dari Informatika untuk ITERA
              </motion.p>

              {/* Heading */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight mb-4 sm:mb-6">
                {/* Mobile: Satu baris */}
                <span className="block lg:hidden">
                  Taklukkan Semestermu dengan{" "}
                  <span className="relative inline-block text-blue-600">
                    Resisst
                    <svg
                      className="absolute -bottom-1 left-0 w-full"
                      height="5"
                      viewBox="0 0 100 8"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0 5C30 2 70 8 100 5"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </span>
                {/* Desktop: Dua baris */}
                <span className="hidden lg:block">
                  <span className="block">Taklukkan Semestermu dengan</span>
                  <span className="block text-blue-600 text-8xl mt-2">
                    <span className="relative inline-block">
                      Resisst
                      <svg
                        className="absolute -bottom-1 left-0 w-full h-3"
                        viewBox="0 0 180 10"
                        preserveAspectRatio="none"
                      >
                        <path
                          d="M5 5C45 2 135 8 175 5"
                          stroke="currentColor"
                          strokeWidth="5"
                          fill="transparent"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </span>
                </span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 mb-6 sm:mb-8 max-w-md lg:max-w-xl leading-relaxed px-4 sm:px-0">
                Sinkronkan dengan MOODLE (kuliah2.itera.ac.id) & Google
                Classroom dalam hitungan detik. Dapatkan pengingat WhatsApp
                otomatis sebelum deadline tugas. Dibuat atas keresahan mahasiswa
                pejuang IPK.
              </p>

              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full sm:w-auto"
              >
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full sm:w-auto px-8 py-6 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 hover:scale-[1.02] shadow-2xl shadow-slate-900/20 transition-all group inline-flex items-center justify-center",
                  )}
                >
                  Mulai Sekarang
                  <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
