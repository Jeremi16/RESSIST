"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ShieldCheck, RefreshCw, Smartphone, Globe, CheckCircle2, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";

interface WhatsNewPopupProps { isOpen?: boolean; onClose?: () => void; showTrigger?: boolean; }

// WAJIB sinkron dengan RELEASES[0] di frontend/app/change-log/page.tsx
// (single source of truth rilis APK Android). Rilis baru = update versi +
// highlights di bawah mengikuti entry terbaru di change-log.
const WHATS_NEW_VERSION = "v0.3.5";
const WHATS_NEW_STORAGE_KEY = `whats-new-${WHATS_NEW_VERSION}-seen`;
const APK_SIZE = "3.44 MB";
const APK_RELEASED = "25 September 2026";
const APK_MIN_ANDROID = "Android 8.0 atau lebih tinggi";

const NEW_FEATURES = [
  { icon: RefreshCw, title: "Update dari Aplikasi", description: "Tombol update di aplikasi kini memunculkan dialog pemasangan dengan benar." },
  { icon: ShieldCheck, title: "Pesan Gagal yang Jelas", description: "Jika pemasangan gagal, aplikasi memberi tahu alasannya dan mencoba cara lain." },
  { icon: Globe, title: "Sekali Pasang Manual", description: "Dari v0.3.4 atau lebih lama, pasang versi ini dari halaman download; berikutnya cukup lewat aplikasi." },
  { icon: Smartphone, title: "Ringan & Timpa Langsung", description: `Hanya sekitar ${APK_SIZE}. Update langsung timpa versi lama, tidak perlu uninstall.` },
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
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.97 }} onClick={handleOpen} className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-[#0059D0] text-white rounded-full text-sm font-medium shadow-lg hover:bg-[#60A8F8] transition-colors">
          <Smartphone className="size-4" /> Update Android
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && isHomePage && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} onClick={handleClose} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-white rounded-2xl border border-black/5 shadow-xl">
                <div className="sticky top-0 bg-[#0059D0] p-6 text-white flex items-start justify-between">
                  <div>
                    <p className="inline-flex px-2.5 py-1 rounded-full bg-white text-black text-xs font-medium mb-3">Update APK Android</p>
                    <h2 className="text-xl font-semibold tracking-tight">Ressist Android {WHATS_NEW_VERSION}</h2>
                    <p className="text-sm text-white/60 mt-1">{WHATS_NEW_VERSION} • {APK_SIZE} • {APK_MIN_ANDROID}</p>
                  </div>
                  <button onClick={handleClose} className="size-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center shrink-0"><X className="size-4" /></button>
                </div>

                <div className="p-6 space-y-6">
                  <p className="text-sm text-black/60 leading-relaxed"><strong className="text-black font-medium">Ressist {WHATS_NEW_VERSION}</strong> — Sesi Anti-Logout. Perbaikan sesi login di HP, web, dan backend sekaligus.</p>

                  <div className="space-y-3">
                    <h3 className="text-xs font-medium tracking-wide text-black/40">Yang baru di versi ini</h3>
                    <div className="space-y-2">
                      {NEW_FEATURES.map((feature, index) => (
                        <motion.div key={feature.title} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * index }} className="flex items-start gap-3 p-3 rounded-2xl bg-[#60A8F8]/10 border border-black/5">
                          <div className="size-8 rounded-xl bg-[#0059D0] text-white flex items-center justify-center shrink-0"><feature.icon className="size-4" /></div>
                          <div><h4 className="text-sm font-medium text-black">{feature.title}</h4><p className="text-xs text-black/50 leading-relaxed">{feature.description}</p></div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-medium tracking-wide text-black/40">Info file</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {HIGHLIGHTS.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-black/60"><CheckCircle2 className="size-3.5 text-black/20 shrink-0" />{item}</div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Link to="/app" onClick={handleClose} className="flex-1 h-10 bg-[#0059D0] text-white rounded-full text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:bg-[#60A8F8] transition-colors">Download APK <Download className="size-3.5" /></Link>
                    <Link to="/change-log" onClick={handleClose} className="flex-1 h-10 bg-[#60A8F8]/10 border border-black/5 rounded-full text-sm font-medium text-black inline-flex items-center justify-center gap-1.5 hover:bg-[#60A8F8]/20 transition-colors">Changelog <ScrollText className="size-3.5" /></Link>
                  </div>
                  <button onClick={handleClose} className="w-full text-center text-xs font-medium text-black/40 hover:text-black transition-colors">Nanti saja</button>
                  <p className="text-center text-xs text-black/30 leading-relaxed">Hanya untuk Android — kalau Play Protect muncul, pilih Selengkapnya lalu Tetap install.</p>
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
