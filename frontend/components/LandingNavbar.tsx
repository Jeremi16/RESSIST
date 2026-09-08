"use client";

import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

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
  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-[#F5F0EB]/80 backdrop-blur-sm border-b border-black/5",
        className,
      )}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-black flex items-center justify-center text-white text-sm font-bold">
            R
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-black">
            Ressist
          </span>
        </Link>

        {showBackButton ? (
          <Link
            to={backHref}
            className="flex items-center gap-1.5 text-sm font-medium text-black/60 hover:text-black transition-colors"
          >
            <ChevronLeft className="size-4" />
            Kembali
          </Link>
        ) : (
          <Link
            to="/login"
            className="bg-black text-white h-9 px-5 rounded-full text-sm font-medium hover:bg-black/90 transition-colors inline-flex items-center justify-center"
          >
            Masuk
          </Link>
        )}
      </div>
    </header>
  );
}
