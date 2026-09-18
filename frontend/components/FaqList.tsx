"use client";

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export interface FaqItem {
  id: string;
  /** Label pendek untuk sidebar "Di halaman ini". */
  nav: string;
  q: string;
  a: ReactNode;
}

/** Daftar FAQ accordion ala /app — tiap item punya id anchor. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <details
          key={item.id}
          id={item.id}
          className="group scroll-mt-24 bg-white rounded-2xl border border-black/5 px-5 py-4 open:shadow-sm"
        >
          <summary className="text-sm font-medium text-black cursor-pointer list-none flex items-center justify-between gap-3">
            {item.q}
            <ArrowRight className="size-4 text-black/30 shrink-0 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-2.5 text-sm text-black/60 leading-relaxed">
            {item.a}
          </div>
        </details>
      ))}
    </div>
  );
}
