"use client";

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuthStatus } from "@/src/hooks/use-auth-status";

const ctaClass =
  "inline-flex items-center justify-center h-12 px-7 bg-[#0059D0] text-white font-display text-xs font-medium uppercase tracking-wider hover:bg-[#0043A5] transition-colors";
const linkClass =
  "font-display text-xs uppercase tracking-wider text-black/60 underline underline-offset-4 hover:text-[#0059D0] transition-colors";

export function HeroSection() {
  const authStatus = useAuthStatus();
  return (
    <section className="bg-white pt-16 lg:pt-28 pb-24 lg:pb-32 overflow-hidden">
      <div className="mx-auto max-w-[1120px] px-6 grid lg:grid-cols-12 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-7"
        >
          <p className="font-display text-5xl sm:text-6xl font-light tracking-tight leading-none">
            Selamat datang di
          </p>
          <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.95] mt-2 mb-6">
            Ressist.
          </h1>
          <p className="font-serif text-lg text-black/80 leading-relaxed max-w-md mb-10">
            Pengingat tugas Moodle &amp; Google Classroom lewat WhatsApp dan
            Telegram, untuk mahasiswa ITERA.
          </p>

          <div className="flex flex-wrap items-center gap-6">
            {authStatus === "checking" ? (
              <span aria-hidden className="h-12 w-[190px] bg-black/10 animate-pulse" />
            ) : (
              <Link
                to={authStatus === "authed" ? "/dashboard" : "/login"}
                className={ctaClass}
              >
                {authStatus === "authed" ? "Buka Dashboard" : "Mulai Sekarang"}
              </Link>
            )}
            <Link to="/app" className={linkClass}>
              Unduh App &rarr;
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          aria-hidden
          className="lg:col-span-5 flex justify-center lg:justify-end"
        >
          <img src="/logo-mark.png" alt="" className="w-48 sm:w-64 lg:w-80 h-auto" />
        </motion.div>
      </div>
    </section>
  );
}
