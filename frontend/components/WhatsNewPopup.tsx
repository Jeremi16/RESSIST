"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Filter, Bell, Tag, CheckCircle2, ExternalLink, ArrowRightLeft, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";

interface WhatsNewPopupProps { isOpen?: boolean; onClose?: () => void; showTrigger?: boolean; }

const WHATS_NEW_VERSION = "v0.5.1";
const WHATS_NEW_STORAGE_KEY = `whats-new-${WHATS_NEW_VERSION}-seen`;

const NEW_FEATURES = [
  { icon: Sparkles, title: "Smart Google Login", description: "Login lebih cepat tanpa consent untuk pengguna lama." },
  { icon: ExternalLink, title: "Quick Task Link", description: "Buka tautan tugas langsung dari timeline." },
  { icon: ArrowRightLeft, title: "Multi-device Stability", description: "Perbaikan login di berbagai perangkat." },
  { icon: ExternalLink, title: "Session Auto-Logout Fix", description: "Logout otomatis lebih stabil saat sesi berakhir." },
  { icon: Sparkles, title: "Tab Mata Kuliah Baru", description: "Tampilan baru manajemen mata kuliah lebih rapi." },
  { icon: ArrowRightLeft, title: "Rekomposisi Fitur", description: "Penataan ulang Alias dan Filter." },
  { icon: Filter, title: "Filter Kelas", description: "Filter tugas berdasarkan kode kelas [XX]." },
  { icon: Tag, title: "Course Alias", description: "Ganti nama mata kuliah dengan alias singkat." },
  { icon: ArrowRightLeft, title: "Sorting Tugas", description: "Urutkan tugas berdasarkan deadline." },
  { icon: Bell, title: "Notifikasi Tugas Baru", description: "Toast saat ada tugas baru." },
  { icon: Sparkles, title: "Smart Update", description: "Sinkronisasi hanya update data yang berubah." },
];

const HIGHLIGHTS = ["Smart Google Login", "Multi-device Fix", "Tombol Buka Tugas", "Optimasi UI Mobile", "Fix Auto-logout", "Update Mata Kuliah", "Sorting Deadline", "Notifikasi tugas baru"];

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
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.97 }} onClick={handleOpen} className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-full text-sm font-medium shadow-lg">
          What's New?
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && isHomePage && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} onClick={handleClose} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-white rounded-2xl border border-black/5 shadow-xl">
                <div className="sticky top-0 bg-black p-6 text-white flex items-start justify-between">
                  <div>
                    <p className="inline-flex px-2.5 py-1 rounded-full bg-white text-black text-xs font-medium mb-3">Update Baru</p>
                    <h2 className="text-xl font-semibold tracking-tight">What's New?</h2>
                    <p className="text-sm text-white/60 mt-1">{WHATS_NEW_VERSION} • Manajemen Tugas</p>
                  </div>
                  <button onClick={handleClose} className="size-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center shrink-0"><X className="size-4" /></button>
                </div>

                <div className="p-6 space-y-6">
                  <p className="text-sm text-black/60 leading-relaxed"><strong className="text-black font-medium">Ressist {WHATS_NEW_VERSION}</strong> — filter, sort, dan notifikasi tugas baru kini tersedia.</p>

                  <div className="space-y-3">
                    <h3 className="text-xs font-medium tracking-wide text-black/40">Fitur Utama</h3>
                    <div className="space-y-2">
                      {NEW_FEATURES.slice(0, 6).map((feature, index) => (
                        <motion.div key={feature.title} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * index }} className="flex items-start gap-3 p-3 rounded-2xl bg-[#F5F0EB] border border-black/5">
                          <div className="size-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0"><feature.icon className="size-4" /></div>
                          <div><h4 className="text-sm font-medium text-black">{feature.title}</h4><p className="text-xs text-black/50 leading-relaxed">{feature.description}</p></div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-medium tracking-wide text-black/40">Yang Baru</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {HIGHLIGHTS.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-black/60"><CheckCircle2 className="size-3.5 text-black/20 shrink-0" />{item}</div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Link to="/version" onClick={handleClose} className="flex-1 h-10 bg-black text-white rounded-full text-sm font-medium inline-flex items-center justify-center gap-1.5">Lihat Detail <ExternalLink className="size-3.5" /></Link>
                    <button onClick={handleClose} className="flex-1 h-10 bg-[#F5F0EB] border border-black/5 rounded-full text-sm font-medium text-black">Tutup</button>
                  </div>
                  <p className="text-center text-xs text-black/30">Terima kasih telah menggunakan Ressist!</p>
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
