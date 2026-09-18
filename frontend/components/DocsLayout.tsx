"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

export interface DocsSidebarLink {
  label: string;
  /** Route ("/change-log") atau anchor dalam halaman ("#stabil"). */
  to: string;
  /** true = anchor <a href>, ikut scroll-spy. false = <Link> route. */
  anchor?: boolean;
}

export interface DocsSidebarGroup {
  title?: string;
  links: DocsSidebarLink[];
}

interface DocsLayoutProps {
  /**
   * Label versi untuk tombol topbar, mis. "v0.1.0".
   * Opsional — bila tidak diisi, tombol topbar disembunyikan.
   */
  versionLabel?: string;
  /** Target tombol topbar — anchor ("#stabil") atau URL file. */
  downloadHref?: string;
  sidebar: DocsSidebarGroup[];
  children: ReactNode;
}

/** Scroll-spy ringan: tandai anchor yang sedang terlihat di viewport. */
function useActiveAnchor(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);

  return active;
}

function SidebarNav({
  groups,
  activeAnchor,
  activePath,
  onNavigate,
}: {
  groups: DocsSidebarGroup[];
  activeAnchor: string | null;
  activePath: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-7">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.title && (
            <p className="px-3 mb-2 text-xs font-semibold tracking-wide text-black/40">
              {group.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.links.map((link) => {
              const isActive = link.anchor
                ? activeAnchor === link.to.slice(1)
                : activePath === link.to;
              const cls = cn(
                "block rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-[#0059D0]/10 text-[#0059D0] font-medium"
                  : "text-black/60 hover:text-black hover:bg-black/5",
              );
              return (
                <li key={link.to + link.label}>
                  {link.anchor ? (
                    <a href={link.to} className={cls} onClick={onNavigate}>
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.to} className={cls} onClick={onNavigate}>
                      {link.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Layout ala dokumentasi (sidebar + topbar) untuk halaman publik.
 * Tema terang mengikuti identitas Ressist. v1 dipakai halaman /app.
 */
export function DocsLayout({
  versionLabel,
  downloadHref,
  sidebar,
  children,
}: DocsLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  const anchorIds = sidebar
    .flatMap((g) => g.links)
    .filter((l) => l.anchor)
    .map((l) => l.to.slice(1));
  const activeAnchor = useActiveAnchor(anchorIds);

  // Tutup drawer pakai Esc + kunci scroll body saat terbuka.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-white flex items-stretch">
      {/* Sidebar desktop — full-height, mentok atas */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-black/5 flex-col sticky top-0 h-screen">
        <div className="flex h-16 items-center px-7 border-b border-black/5 shrink-0">
          <Logo size={30} />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <SidebarNav
            groups={sidebar}
            activeAnchor={activeAnchor}
            activePath={pathname}
          />
          <Link
            to="/"
            className="block mt-8 px-3 text-xs text-black/40 hover:text-black transition-colors"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </aside>

      {/* Kolom kanan: topbar + konten */}
      <div className="flex-1 flex flex-col min-w-0">
      {/* Topbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-black/5">
        <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu navigasi"
            aria-expanded={drawerOpen}
            className="lg:hidden size-10 rounded-xl flex items-center justify-center text-black/60 hover:bg-black/5 transition-colors"
          >
            <Menu className="size-5" />
          </button>

          <div className="lg:hidden">
            <Logo size={28} />
          </div>

          <div className="flex-1" />

          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link
              to="/api-docs"
              className="px-3 py-2 rounded-lg text-black/60 hover:text-black hover:bg-black/5 transition-colors"
            >
              API
            </Link>
            <Link
              to="/change-log"
              className="px-3 py-2 rounded-lg text-black/60 hover:text-black hover:bg-black/5 transition-colors"
            >
              Changelog
            </Link>
            <Link
              to="/dashboard"
              className="px-3 py-2 rounded-lg text-black/60 hover:text-black hover:bg-black/5 transition-colors"
            >
              Dashboard
            </Link>
          </nav>

          {downloadHref && (
            <a
              href={downloadHref}
              className="ml-1 inline-flex items-center gap-2 h-9 pl-4 pr-4 sm:pr-5 rounded-full bg-[#0059D0] text-white text-sm font-medium hover:bg-[#60A8F8] transition-colors"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">Get {versionLabel}</span>
              <span className="sm:hidden">{versionLabel}</span>
            </a>
          )}
        </div>
      </header>

        {/* Konten */}
        <main className="flex-1 min-w-0">
          <div className="w-full mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
            {children}
          </div>
        </main>
      </div>

      {/* Drawer mobile */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setDrawerOpen(false)}
                className="fixed inset-0 z-50 bg-black/40 lg:hidden"
                aria-hidden
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
                className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-xl lg:hidden flex flex-col"
                role="dialog"
                aria-label="Navigasi dokumentasi"
              >
                <div className="flex h-16 items-center justify-between px-4 border-b border-black/5">
                  <Logo size={28} />
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Tutup menu navigasi"
                    className="size-10 rounded-xl flex items-center justify-center text-black/60 hover:bg-black/5 transition-colors"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-6">
                  <SidebarNav
                    groups={sidebar}
                    activeAnchor={activeAnchor}
                    activePath={pathname}
                    onNavigate={() => setDrawerOpen(false)}
                  />
                  <Link
                    to="/"
                    onClick={() => setDrawerOpen(false)}
                    className="block mt-8 px-3 text-xs text-black/40"
                  >
                    ← Kembali ke Beranda
                  </Link>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
    </div>
  );
}
