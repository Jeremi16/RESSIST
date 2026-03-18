'use client'

import { useState } from 'react'
import { Send, Bell, BellOff, Loader2 } from 'lucide-react'
import { TelegramVerify } from '@/components/TelegramVerify'
import { cn } from '@/lib/utils'

interface TelegramConfigProps {
  chatId: string | null
  enabled: boolean
  botUsername: string
  onSave: (data: { telegram_enabled: boolean }) => Promise<void>
  isLoading: boolean
}

export function TelegramConfig({ chatId, enabled, botUsername, onSave, isLoading }: TelegramConfigProps) {
  const [optimisticEnabled, setOptimisticEnabled] = useState(enabled)
  const [toggling, setToggling] = useState(false)

  const handleToggle = async () => {
    const next = !optimisticEnabled
    setOptimisticEnabled(next)
    setToggling(true)
    try {
      await onSave({ telegram_enabled: next })
    } catch {
      setOptimisticEnabled(!next) // rollback
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="size-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
          <Send className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Telegram Bot</h3>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Terima notifikasi tugas real-time via Telegram</p>
        </div>

        {/* Toggle – only show when connected */}
        {chatId && (
          <button
            onClick={handleToggle}
            disabled={toggling || isLoading}
            className={cn(
              "relative shrink-0 h-8 w-14 rounded-full transition-all duration-300 disabled:opacity-60",
              optimisticEnabled
                ? "bg-blue-600 shadow-lg shadow-blue-500/30"
                : "bg-slate-200"
            )}
            aria-label={optimisticEnabled ? "Nonaktifkan Telegram" : "Aktifkan Telegram"}
          >
            <span className={cn(
              "absolute top-1 size-6 bg-white rounded-full shadow-sm transition-all duration-300 flex items-center justify-center",
              optimisticEnabled ? "left-7" : "left-1"
            )}>
              {toggling ? (
                <Loader2 className="size-3 animate-spin text-slate-400" />
              ) : optimisticEnabled ? (
                <Bell className="size-3 text-blue-500" />
              ) : (
                <BellOff className="size-3 text-slate-400" />
              )}
            </span>
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* Verify / Connection section */}
      <TelegramVerify
        chatId={chatId}
        botUsername={botUsername}
        onConnect={() => window.location.reload()}
      />

      {/* Active notification status badge – only when connected */}
      {chatId && (
        <div className={cn(
          "rounded-2xl border-2 px-5 py-4 transition-all",
          optimisticEnabled
            ? "bg-blue-50 border-blue-200"
            : "bg-slate-50 border-slate-200"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "size-2.5 rounded-full shrink-0",
              optimisticEnabled
                ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"
                : "bg-slate-300"
            )} />
            <div>
              <p className={cn(
                "text-sm font-black",
                optimisticEnabled ? "text-blue-900" : "text-slate-500"
              )}>
                {optimisticEnabled ? "Notifikasi Aktif" : "Notifikasi Nonaktif"}
              </p>
              <p className={cn(
                "text-xs font-medium mt-0.5",
                optimisticEnabled ? "text-blue-600" : "text-slate-400"
              )}>
                {optimisticEnabled
                  ? "Kamu akan menerima notifikasi tugas di Telegram"
                  : "Aktifkan toggle di atas untuk mulai menerima notifikasi"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
