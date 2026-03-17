'use client'

import { TelegramVerify } from '@/components/TelegramVerify'
import { Send } from 'lucide-react'

interface TelegramConfigProps {
  chatId: string | null
  enabled: boolean
  botUsername: string
  onSave: (data: { telegram_enabled: boolean }) => Promise<void>
  isLoading: boolean
}

export function TelegramConfig({
  chatId,
  enabled,
  botUsername,
  onSave,
  isLoading,
}: TelegramConfigProps) {
  const handleToggle = async () => {
    await onSave({ telegram_enabled: !enabled })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <Send className="size-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Telegram Bot</h3>
            <p className="text-sm text-slate-500">
              Terima notifikasi tugas via Telegram
            </p>
          </div>
        </div>
        {chatId && (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggle}
              disabled={isLoading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        )}
      </div>

      <TelegramVerify
        chatId={chatId}
        botUsername={botUsername}
        onConnect={() => {
          // Refresh user data after connection
          window.location.reload()
        }}
      />

      {chatId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Status:</strong> {enabled ? 'Aktif' : 'Nonaktif'}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            {enabled
              ? 'Kamu akan menerima notifikasi tugas di Telegram'
              : 'Notifikasi Telegram dinonaktifkan'}
          </p>
        </div>
      )}
    </div>
  )
}
