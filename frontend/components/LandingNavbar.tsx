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

export function LandingNavbar({
  showBackButton = false,
  backHref = "/",
  className,
}: LandingNavbarProps) {
  // Hook selalu dipanggil (aturan hooks), hasilnya hanya dipakai varian default.
  const authStatus = useAuthStatus();
  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-black/5",
        className,
      )}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Logo size={32} />

        {showBackButton ? (
          <Link
            to={backHref}
            className="flex items-center gap-1.5 text-sm font-medium text-black/60 hover:text-black transition-colors"
          >
            <ChevronLeft className="size-4" />
            Kembali
          </Link>
        ) : authStatus === "authed" ? (
          <Link
            to="/dashboard"
            className="bg-[#0059D0] text-white h-9 px-5 rounded-full text-sm font-medium hover:bg-[#60A8F8] transition-colors inline-flex items-center justify-center"
          >
            Dashboard
          </Link>
        ) : authStatus === "checking" ? (
          <span
            aria-hidden
            className="h-9 w-[104px] rounded-full bg-black/10 animate-pulse"
          />
        ) : (
          <Link
            to="/login"
            className="bg-[#0059D0] text-white h-9 px-5 rounded-full text-sm font-medium hover:bg-[#60A8F8] transition-colors inline-flex items-center justify-center"
          >
            Masuk
          </Link>
        )}
      </div>
    </header>
  );
}
