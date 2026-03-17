"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Filter,
  Bell,
  Tag,
  CheckCircle2,
  ExternalLink,
  PartyPopper,
  ArrowRightLeft,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface WhatsNewPopupProps {
  isOpen?: boolean;
  onClose?: () => void;
  showTrigger?: boolean;
}

const WHATS_NEW_VERSION = "v0.5.1";
const WHATS_NEW_STORAGE_KEY = `whats-new-${WHATS_NEW_VERSION}-seen`;

const NEW_FEATURES = [
  {
    icon: Sparkles,
    title: "Smart Google Login",
    description:
      "Login lebih cepat tanpa halaman persetujuan (consent) untuk pengguna lama.",
  },
  {
    icon: ExternalLink,
    title: "Quick Task Link",
    description:
      "Buka tautan tugas (MOODLE/Classroom) langsung dari timeline tanpa ribet.",
  },
  {
    icon: ArrowRightLeft,
    title: "Multi-device Stability",
    description:
      "Perbaikan login di berbagai perangkat agar tidak saling terpental.",
  },
  {
    icon: ExternalLink,
    title: "Session Auto-Logout Fix",
    description:
      "Perbaikan fitur logout otomatis yang lebih stabil saat sesi berakhir.",
  },
  {
    icon: Sparkles,
    title: "Tab Mata Kuliah Baru",
    description:
      "Tampilan baru untuk manajemen mata kuliah yang lebih rapi dan intuitif.",
  },
  {
    icon: ArrowRightLeft,
    title: "Rekomposisi Fitur",
    description:
      "Penataan ulang fitur Alias dan Filter untuk akses yang lebih cepat.",
  },
  {
    icon: Filter,
    title: "Filter Kelas",
    description:
      "Filter tugas berdasarkan kode kelas (RA, RB, RC). Auto-detect dari judul tugas [XX].",
  },
  {
    icon: Tag,
    title: "Course Alias",
    description:
      "Ganti nama mata kuliah panjang dengan alias singkat favoritmu.",
  },
  {
    icon: ArrowRightLeft,
    title: "Sorting Tugas",
    description:
      "Urutkan tugas berdasarkan deadline terdekat atau terjauh.",
  },
  {
    icon: Bell,
    title: "Notifikasi Tugas Baru",
    description:
      "Dapatkan notifikasi toast saat ada tugas baru saat sinkronisasi.",
  },
  {
    icon: Sparkles,
    title: "Smart Update",
    description:
      "Sinkronisasi lebih cepat dengan hanya mengupdate data yang berubah.",
  },
];

const HIGHLIGHTS = [
  "Smart Google Login (No Consent)",
  "Multi-device Authentication Fix",
  "Tombol Cepat 'Buka Tugas'",
  "Optimasi UI Mobile & Timeline",
  "Perbaikan Skeleton Loading HP",
  "Fix Auto-logout session",
  "Update tab Mata Kuliah baru",
  "Sorting: Deadline Terarah",
  "Notifikasi tugas baru",
];

export function WhatsNewPopup({
  isOpen: controlledIsOpen,
  onClose,
  showTrigger = true,
}: WhatsNewPopupProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [isOpen, setIsOpen] = useState(controlledIsOpen ?? false);

  // Auto-show only on first visit to home page (uncontrolled mode)
  useEffect(() => {
    if (controlledIsOpen !== undefined) return;
    if (!isHomePage) return;

    const hasSeen = localStorage.getItem(WHATS_NEW_STORAGE_KEY);
    if (hasSeen) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [controlledIsOpen, isHomePage]);

  // Sync with controlled state
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (isHomePage) {
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, "true");
    }
    onClose?.();
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  return (
    <>
      {/* Trigger Button */}
      {showTrigger && isHomePage && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-shadow"
        >
          <span className="font-bold text-sm">What&apos;s New?</span>
        </motion.button>
      )}

      {/* Popup Modal */}
      <AnimatePresence>
        {isOpen && isHomePage && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={handleClose}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto"
            >
              <div
                onClick={(event) => event.stopPropagation()}
                className="relative w-full max-w-md sm:max-w-lg max-h-[82dvh] sm:max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] shadow-2xl pointer-events-auto scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {/* Header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 p-6 sm:p-8 text-white">
                  {/* Decorative elements */}
                  <div className="pointer-events-none absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                  <div className="pointer-events-none absolute bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="absolute z-20 top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="size-5" />
                  </button>

                  {/* Content */}
                  <div className="relative">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring" }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 mb-4"
                    >
                      <PartyPopper className="size-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Update Baru
                      </span>
                    </motion.div>

                    <h2 className="text-2xl sm:text-3xl font-black mb-2">
                      What&apos;s New?
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="px-3 py-1 rounded-lg bg-white/20 text-sm font-bold">
                        {WHATS_NEW_VERSION}
                      </span>
                      <span className="text-blue-100 text-sm">
                        Manajemen Tugas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
                  {/* Welcome Message */}
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Ressist {WHATS_NEW_VERSION}</strong> hadir dengan
                    fitur pengelolaan tugas yang lebih fleksibel. Filter, sort,
                    dan notifikasi tugas baru kini tersedia!
                  </p>

                  {/* Feature Cards */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
                      Fitur Utama
                    </h3>
                    <div className="space-y-3">
                      {NEW_FEATURES.map((feature, index) => (
                        <motion.div
                          key={feature.title}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
                          className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors group"
                        >
                          <div className="size-9 sm:size-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <feature.icon className="size-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 mb-1 text-sm sm:text-base">
                              {feature.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-500">
                              {feature.description}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Highlights List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
                      Yang Baru
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {HIGHLIGHTS.map((item, index) => (
                        <motion.div
                          key={item}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                          className="flex items-center gap-2.5 text-sm text-slate-600"
                        >
                          <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                          <span className="leading-snug">{item}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Link
                      href="/version"
                      onClick={handleClose}
                      className="flex-1 min-w-0 flex items-center justify-center gap-2 h-12 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-semibold whitespace-nowrap transition-colors"
                    >
                      <span>Lihat Detail</span>
                      <ExternalLink className="size-4 shrink-0" />
                    </Link>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 min-w-0 h-12 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-base font-semibold whitespace-nowrap transition-colors"
                    >
                      Tutup
                    </button>
                  </div>

                  {/* Footer */}
                  <p className="text-center text-xs text-slate-400">
                    Terima kasih telah menggunakan Ressist!
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook untuk menggunakan popup
export function useWhatsNewPopup() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return { isOpen, open, close, toggle };
}
