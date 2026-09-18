"use client";

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

type ToastVariant = "info" | "success" | "warning" | "error";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function nextToastId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getVariantStyles(variant: ToastVariant): string {
  switch (variant) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-100/80";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900 shadow-amber-100/80";
    case "error":
      return "border-red-200 bg-red-50 text-red-900 shadow-red-100/80";
    default:
      return "border-[#60A8F8]/40 bg-[#60A8F8]/10 text-[#0043A5] shadow-[#60A8F8]/20";
  }
}

function getVariantIcon(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />;
    case "warning":
      return <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />;
    case "error":
      return <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />;
    default:
      return <Info className="mt-0.5 size-5 shrink-0 text-[#0059D0]" />;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutIds = useRef<Record<string, number>>({});

  const dismissToast = (id: string) => {
    const timeoutId = timeoutIds.current[id];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete timeoutIds.current[id];
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showToast = (options: ToastOptions) => {
    const id = nextToastId();
    const toast: ToastItem = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || "info",
      durationMs: options.durationMs,
    };

    setToasts((prev) => [...prev, toast]);

    const durationMs = options.durationMs ?? 4000;
    timeoutIds.current[id] = window.setTimeout(() => {
      dismissToast(id);
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      Object.values(timeoutIds.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutIds.current = {};
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="pointer-events-none fixed right-6 top-20 z-[70] flex w-full max-w-sm flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg ${getVariantStyles(toast.variant)}`}
            >
              <div className="flex items-start gap-3">
                {getVariantIcon(toast.variant)}
                <div>
                  <p className="text-sm font-bold">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-sm text-current/90">{toast.description}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
