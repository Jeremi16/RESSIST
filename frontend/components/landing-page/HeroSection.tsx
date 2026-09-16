"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useAuthStatus } from "@/src/hooks/use-auth-status";

export function HeroSection() {
  const authStatus = useAuthStatus();
  const ctaClass = cn(
    buttonVariants({ size: "lg" }),
    "bg-black text-white rounded-full h-11 px-7 text-sm font-medium hover:bg-black/90 transition-colors inline-flex items-center justify-center gap-2",
  );
  return (
    <section className="bg-[#F5F0EB] py-20 lg:py-28 overflow-hidden">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <h1 className="text-[40px] sm:text-5xl lg:text-[56px] font-semibold leading-[0.95] tracking-tight text-black mb-6 text-balance">
              Taklukkan semestermu dengan{" "}
              <span className="text-blue-600">Ressist</span>
            </h1>

            <p className="text-base lg:text-lg text-black/60 leading-relaxed max-w-xl mb-8 text-balance">
              Sinkronkan dengan MOODLE (kuliah2.itera.ac.id) & Google Classroom
              dalam hitungan detik. Dapatkan pengingat otomatis sebelum deadline.
              Dibuat atas keresahan mahasiswa pejuang IPK.
            </p>

            {authStatus === "authed" ? (
              <Link to="/dashboard" className={ctaClass}>
                Buka Dashboard
                <ArrowRight className="size-4" />
              </Link>
            ) : authStatus === "checking" ? (
              <span
                aria-hidden
                className="h-11 w-[180px] rounded-full bg-black/10 animate-pulse inline-flex"
              />
            ) : (
              <Link to="/register" className={ctaClass}>
                Mulai Sekarang
                <ArrowRight className="size-4" />
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
