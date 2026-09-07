'use client'

import { useState } from 'react'
import { Send, Bell, BellOff, Loader2 } from 'lucide-react'
import { TelegramVerify } from '@/components/TelegramVerify'
import { cn } from '@/lib/utils'

interface TelegramConfigProps { chatId: string | null; enabled: boolean; botUsername: string; onSave: (data: { telegram_enabled: boolean }) => Promise<void>; isLoading: boolean }

export function TelegramConfig({ chatId, enabled, botUsername, onSave, isLoading }: TelegramConfigProps) {
  const [optimisticEnabled, setOptimisticEnabled] = useState(enabled)
  const [toggling, setToggling] = useState(false)
  const handleToggle = async () => {
    const next = !optimisticEnabled; setOptimisticEnabled(next); setToggling(true)
    try { await onSave({ telegram_enabled: next }) } catch { setOptimisticEnabled(!next) } finally { setToggling(false) }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-10 bg-black text-white rounded-xl flex items-center justify-center shrink-0"><Send className="size-5" /></div>
        <div className="flex-1 min-w-0"><h3 className="text-sm font-semibold text-black">Telegram Bot</h3><p className="text-xs text-black/40 mt-0.5">Notifikasi tugas real-time via Telegram</p></div>
        {chatId && (
          <button onClick={handleToggle} disabled={toggling || isLoading} className={cn("relative shrink-0 h-7 w-12 rounded-full transition-colors disabled:opacity-60", optimisticEnabled ? "bg-black" : "bg-black/10")} aria-label={optimisticEnabled ? "Nonaktifkan Telegram" : "Aktifkan Telegram"}>
            <span className={cn("absolute top-1 size-5 bg-white rounded-full shadow-sm transition-all flex items-center justify-center", optimisticEnabled ? "left-6" : "left-1")}>
              {toggling ? <Loader2 className="size-3 animate-spin text-black/40" /> : optimisticEnabled ? <Bell className="size-3 text-black" /> : <BellOff className="size-3 text-black/40" />}
            </span>
          </button>
        )}
      </div>
      <div className="h-px bg-black/5" />
      <TelegramVerify chatId={chatId} botUsername={botUsername} onConnect={() => window.location.reload()} />
      {chatId && (
        <div className={cn("rounded-2xl border px-4 py-3 flex items-center gap-3", optimisticEnabled ? "bg-black text-white border-black" : "bg-[#F5F0EB] border-black/5 text-black")}>
          <div className={cn("size-2 rounded-full shrink-0", optimisticEnabled ? "bg-emerald-500" : "bg-black/20")} />
          <div><p className="text-sm font-medium">{optimisticEnabled ? "Notifikasi Aktif" : "Notifikasi Nonaktif"}</p><p className={cn("text-xs mt-0.5", optimisticEnabled ? "text-white/60" : "text-black/40")}>{optimisticEnabled ? "Kamu akan menerima notifikasi di Telegram" : "Aktifkan toggle untuk menerima notifikasi"}</p></div>
        </div>
      )}
    </div>
  )
}
