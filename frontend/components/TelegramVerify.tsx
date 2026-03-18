'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, RefreshCw, ExternalLink, Shield, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TelegramVerifyProps {
  chatId?: string | null
  botUsername?: string
  onConnect?: () => void
}

export function TelegramVerify({ chatId, botUsername = 'resisst_bot', onConnect }: TelegramVerifyProps) {
  const [verifyCode, setVerifyCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [progress, setProgress] = useState(100)

  const EXPIRE_SECONDS = 10 * 60

  const generateCode = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/user/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to generate code')
      const data = await response.json()
      setVerifyCode(data.code)
      setExpiresAt(data.expires_at)
      setProgress(100)
    } catch (error) {
      console.error('Error generating code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyCode = () => {
    if (verifyCode) {
      navigator.clipboard.writeText(verifyCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    if (!expiresAt) return

    const interval = setInterval(() => {
      const now = new Date().getTime()
      const expiry = new Date(expiresAt).getTime()
      const diff = expiry - now

      if (diff <= 0) {
        setTimeRemaining('Kadaluarsa')
        setVerifyCode(null)
        setProgress(0)
        clearInterval(interval)
      } else {
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
        setProgress((diff / (EXPIRE_SECONDS * 1000)) * 100)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  // — CONNECTED STATE —
  if (chatId) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-xl shadow-emerald-500/20">
        {/* Background decoration */}
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 size-28 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shadow-inner">
              <Check className="size-7 text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-0.5">Status Koneksi</p>
              <h4 className="text-xl font-black tracking-tight">Telegram Terhubung</h4>
            </div>
          </div>

          <p className="text-sm text-emerald-100 leading-relaxed">
            Bot siap mengirimkan notifikasi tugas langsung ke akunmu 🚀
          </p>

          <div className="mt-5 flex items-center gap-2">
            <div className="size-2.5 rounded-full bg-emerald-200 shadow-[0_0_10px_rgba(167,243,208,1)] animate-pulse" />
            <span className="text-xs font-black uppercase tracking-widest text-emerald-100">Live • Aktif</span>
          </div>
        </div>
      </div>
    )
  }

  // — DISCONNECTED / CONNECT STATE —
  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-500/20">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 size-28 rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="size-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Zap className="size-7 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-0.5">Langkah Pertama</p>
              <h4 className="text-xl font-black tracking-tight">Hubungkan Telegram</h4>
            </div>
          </div>
          <p className="text-sm text-blue-100 leading-relaxed">
            Generate kode verifikasi unik, lalu kirimkan ke bot Telegram kami untuk mulai menerima notifikasi.
          </p>
        </div>
      </div>

      {/* Code Area */}
      {!verifyCode ? (
        <button
          onClick={generateCode}
          disabled={isGenerating}
          className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-base tracking-wide hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="size-5 animate-spin" />
              Membuat Kode...
            </>
          ) : (
            <>
              <Shield className="size-5" />
              Generate Kode Verifikasi
            </>
          )}
        </button>
      ) : (
        <div className="space-y-4">
          {/* Code Display */}
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kode Verifikasi</span>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                timeRemaining === 'Kadaluarsa'
                  ? "bg-red-100 text-red-600"
                  : "bg-blue-50 text-blue-600"
              )}>
                {timeRemaining === 'Kadaluarsa' ? '⚠ Kadaluarsa' : `⏱ ${timeRemaining}`}
              </span>
            </div>

            {/* Timer Bar */}
            <div className="h-1 w-full bg-slate-100 rounded-full mb-4 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  progress > 50 ? "bg-blue-500" : progress > 20 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center gap-3">
              <code className="flex-1 text-3xl font-black text-slate-900 tracking-[0.3em] text-center py-3 bg-slate-50 rounded-2xl border border-slate-100">
                {verifyCode}
              </code>
              <button
                onClick={copyCode}
                className={cn(
                  "size-14 rounded-2xl flex items-center justify-center transition-all border-2 shrink-0",
                  copied
                    ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30"
                    : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                )}
                title="Salin kode"
              >
                {copied ? <Check className="size-5" strokeWidth={3} /> : <Copy className="size-5" />}
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Cara Menghubungkan</p>
            <ol className="space-y-3">
              {[
                { step: 1, text: <>Buka Telegram dan cari bot <span className="font-black text-slate-900">@{botUsername}</span></> },
                { step: 2, text: <>Klik <span className="font-black text-slate-900">Start</span> atau kirim <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">/start</code></> },
                { step: 3, text: <>Kirimkan kode verifikasi di atas ke bot</> },
                { step: 4, text: <>Tunggu konfirmasi berhasil dari bot 🎉</> },
              ].map(({ step, text }) => (
                <li key={step} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="size-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
                    {step}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <ExternalLink className="size-4" />
              Buka Bot
            </a>
            <button
              onClick={generateCode}
              disabled={isGenerating}
              className="h-12 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:border-slate-300 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <RefreshCw className={cn("size-4", isGenerating && "animate-spin")} />
              Perbarui Kode
            </button>
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-slate-400 font-medium">
        🔒 Kode verifikasi berlaku selama 10 menit dan hanya bisa digunakan sekali
      </p>
    </div>
  )
}
