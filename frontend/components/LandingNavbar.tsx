"use client";

import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import { useAuthStatus } from "@/src/hooks/use-auth-status";
import { Logo } from "@/components/Logo";

interface LandingNavbarProps {
  showBackButton?: boolean;
  backHref?: string;
  className?: string;
}

const navLinks = [
  { name: "Fitur", href: "/features" },
  { name: "Panduan", href: "/guide" },
  { name: "FAQ", href: "/faq/general" },
  { name: "Unduh App", href: "/app" },
];

export function LandingNavbar({
  showBackButton = false,
  backHref = "/",
  className,
}: LandingNavbarProps) {
  // Hook selalu dipanggil (aturan hooks), hasilnya hanya dipakai varian default.
  const authStatus = useAuthStatus();
  return (
    <header className={cn("sticky top-0 z-50 bg-white/95 backdrop-blur-sm", className)}>
      <div className="mx-auto max-w-[1120px] px-6 h-20 flex items-center justify-between gap-6">
        <Logo size={30} />

        <nav className="flex items-center gap-6 sm:gap-8 font-display text-[13px] text-black/70">
          {showBackButton ? (
            <Link
              to={backHref}
              className="flex items-center gap-1 hover:text-black transition-colors"
            >
              <ChevronLeft className="size-4" />
              Kembali
            </Link>
          ) : (
            navLinks.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="hidden md:inline hover:text-[#0059D0] transition-colors"
              >
                {l.name}
              </Link>
            ))
          )}
          {authStatus === "checking" ? (
            <span aria-hidden className="h-4 w-20 bg-black/5 animate-pulse" />
          ) : (
            <Link
              to={authStatus === "authed" ? "/dashboard" : "/login"}
              className="font-bold text-black hover:text-[#0059D0] transition-colors"
            >
              {authStatus === "authed" ? "Dashboard" : "Masuk"}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
