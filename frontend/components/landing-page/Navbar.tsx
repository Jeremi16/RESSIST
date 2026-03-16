"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3"
        >
          <div className="size-10 sm:size-12 bg-blue-600 rounded-xl rotate-3 shadow-lg flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
            R
          </div>
          <div className="flex flex-col leading-tight">
            <span>
              Ressist by <span className="font-brand">NODRYX</span>
            </span>
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-blue-600">
              v0.3.4
            </span>
          </div>
        </Link>
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList className="gap-2">
            <NavigationMenuItem>
              <Link
                href="#features"
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
                href="#how-it-works"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "bg-transparent hover:bg-slate-100/50 rounded-full transition-all",
                )}
              >
                Cara Kerja
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link
                href="/version"
                className={cn(
                  navigationMenuTriggerStyle(),
                  "bg-transparent hover:bg-slate-100/50 rounded-full transition-all",
                )}
              >
                Versi
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-slate-800 shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
          >
            Mulai Gratis
          </Link>
        </div>
      </div>
    </header>
  );
}
