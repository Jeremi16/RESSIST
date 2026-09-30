"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Smartphone, WifiOff, CheckCircle2, LayoutTemplate, Feather } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";

interface WhatsNewPopupProps { isOpen?: boolean; onClose?: () => void; showTrigger?: boolean; }

// WAJIB sinkron dengan RELEASES[0] di frontend/app/change-log/page.tsx
// (single source of truth rilis APK Android). Rilis baru = update versi +
// highlights di bawah mengikuti entry terbaru di change-log.
const WHATS_NEW_VERSION = "v0.4.0";
const WHATS_NEW_STORAGE_KEY = `whats-new-${WHATS_NEW_VERSION}-seen`;
const APK_SIZE = "3.44 MB";
const APK_RELEASED = "29 September 2026";
const APK_MIN_ANDROID = "Android 8.0 atau lebih tinggi";

const NEW_FEATURES = [
  { icon: LayoutTemplate, title: "Tampilan Login Baru", description: "Halaman login didesain ulang dengan kolase ikon, judul besar, dan tombol Google yang lebih mantap." },
  { icon: CheckCircle2, title: "Login & Logout Lancar", description: "Keluar langsung kembali ke halaman login, dan dialog \"Anda login kembali\" tidak lagi berulang." },
  { icon: WifiOff, title: "Mode Offline", description: "Tugas, kelas, dan kalender tetap tampil walau tanpa internet." },
  { icon: RefreshCw, title: "Update dari Aplikasi", description: "Cukup tekan update di Lainnya → Tentang, tidak perlu unduh manual lagi." },
  { icon: Feather, title: "Ringan & Timpa Langsung", description: `Hanya sekitar ${APK_SIZE}. Update langsung timpa versi lama, tidak perlu uninstall.` },
];

const HIGHLIGHTS = [APK_SIZE, APK_MIN_ANDROID, APK_RELEASED, "Timpa tanpa uninstall"];

export function WhatsNewPopup({ isOpen: controlledIsOpen, onClose, showTrigger = true }: WhatsNewPopupProps) {
  const { pathname } = useLocation();
  const isHomePage = pathname === "/";
  const [isOpen, setIsOpen] = useState(controlledIsOpen ?? false);

  useEffect(() => {
    if (controlledIsOpen !== undefined) return;
    if (!isHomePage) return;
    const hasSeen = localStorage.getItem(WHATS_NEW_STORAGE_KEY);
    if (hasSeen) return;
    const timer = setTimeout(() => setIsOpen(true), 500);
    return () => clearTimeout(timer);
  }, [controlledIsOpen, isHomePage]);

  useEffect(() => { if (controlledIsOpen !== undefined) setIsOpen(controlledIsOpen); }, [controlledIsOpen]);

  const handleClose = () => {
    setIsOpen(false);
    if (isHomePage) localStorage.setItem(WHATS_NEW_STORAGE_KEY, "true");
    onClose?.();
  };
  const handleOpen = () => setIsOpen(true);

  return (
    <>
      {showTrigger && isHomePage && (
        <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={handleOpen} className="fixed bottom-6 right-6 z-40 flex items-center gap-2 h-11 px-5 bg-[#0059D0] text-white font-display text-xs font-medium uppercase tracking-wider shadow-[0_12px_30px_-12px_rgba(0,89,208,0.6)] hover:bg-[#0043A5] transition-colors">
          <Smartphone className="size-4" strokeWidth={1.75} /> Update {WHATS_NEW_VERSION}
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && isHomePage && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} onClick={handleClose} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.4)]">
                <button onClick={handleClose} aria-label="Tutup" className="absolute top-5 right-5 size-9 flex items-center justify-center text-black/50 hover:text-black transition-colors"><X className="size-5" /></button>

                <div className="px-8 pt-10 pb-8 border-b border-black/10">
                  <p className="font-display text-[11px] font-medium uppercase tracking-wider text-[#0059D0] mb-4">Yang baru &middot; Android</p>
                  <h2 className="font-display text-4xl font-bold tracking-tight leading-none mb-4">Ressist {WHATS_NEW_VERSION}</h2>
                  <p className="font-serif text-black/70 leading-relaxed">Tampilan login baru, login &amp; logout yang lebih lancar, dan aplikasi tetap bisa dipakai tanpa internet.</p>
                </div>

                <ul className="px-8 divide-y divide-black/10">
                  {NEW_FEATURES.map((feature, index) => (
                    <motion.li key={feature.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * index }} className="flex items-start gap-4 py-5">
                      <feature.icon className="size-6 text-[#0059D0] shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div>
                        <h3 className="font-display text-sm font-bold mb-1">{feature.title}</h3>
                        <p className="font-serif text-sm text-black/60 leading-relaxed">{feature.description}</p>
                      </div>
                    </motion.li>
                  ))}
                </ul>

                <div className="bg-[#F5F5F5] px-8 py-8 space-y-6">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {HIGHLIGHTS.map((item) => (
                      <div key={item} className="flex items-center gap-2 font-display text-xs text-black/60"><CheckCircle2 className="size-3.5 text-[#0059D0] shrink-0" />{item}</div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <Link to="/app" onClick={handleClose} className="inline-flex items-center justify-center h-12 px-7 bg-[#0059D0] text-white font-display text-xs font-medium uppercase tracking-wider hover:bg-[#0043A5] transition-colors">Download APK</Link>
                    <Link to="/change-log" onClick={handleClose} className="font-display text-xs uppercase tracking-wider text-black/60 underline underline-offset-4 hover:text-[#0059D0] transition-colors">Changelog &rarr;</Link>
                    <button onClick={handleClose} className="ml-auto font-display text-xs uppercase tracking-wider text-black/40 hover:text-black transition-colors">Nanti saja</button>
                  </div>

                  <p className="font-serif text-xs text-black/50 leading-relaxed">Hanya untuk Android. Kalau Play Protect muncul, pilih Selengkapnya lalu Tetap install.</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function useWhatsNewPopup() {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), toggle: () => setIsOpen((p) => !p) };
}
