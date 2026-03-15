"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

interface LandingNavbarProps {
  /** When true, shows "Kembali" button instead of nav links (for sub-pages like /version, /tentang) */
  showBackButton?: boolean;
  /** Custom href for back button, defaults to "/" */
  backHref?: string;
  /** Additional className for the navbar */
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
        "fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20",
        className,
      )}
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <div className="size-8 sm:size-10 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-black rotate-3 shadow-lg shadow-blue-600/20">
            R
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm sm:text-lg font-black tracking-tight text-slate-900">
              Resisst
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-blue-600">
              v0.3.0
            </span>
          </div>
        </Link>

        {/* Navigation or Back Button */}
        {showBackButton ? (
          <Link
            href={backHref}
            className="flex items-center gap-2 group text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
            Kembali
          </Link>
        ) : (
          <>
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList className="gap-2">
                <NavigationMenuItem>
                  <Link
                    href="/#features"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent hover:bg-slate-100/50 rounded-full transition-all",
                    )}
                  >
                    Fitur
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link
                    href="/#how-it-works"
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent hover:bg-slate-100/50 rounded-full transition-all",
                    )}
                  >
                    Cara Kerja
                  </Link>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Auth Button */}
            <Link
              href="/login"
              className="bg-slate-900 text-white px-6 sm:px-6 py-3 sm:py-2.5 rounded-full font-bold text-sm sm:text-sm hover:bg-slate-800 shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
            >
              Masuk
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
