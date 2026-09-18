'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, RefreshCw, ExternalLink, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/src/lib/api-client'

interface TelegramVerifyProps { chatId?: string | null; botUsername?: string; onConnect?: () => void }

export function TelegramVerify({ chatId, botUsername = 'ressist_bot', onConnect }: TelegramVerifyProps) {
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
      const response = await apiFetch('/api/user/telegram/verify-code', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (!response.ok) throw new Error('Failed')
      const data = await response.json()
      setVerifyCode(data.code); setExpiresAt(data.expires_at); setProgress(100)
    } catch (e) { console.error(e) } finally { setIsGenerating(false) }
  }
  const copyCode = () => { if (verifyCode) { navigator.clipboard.writeText(verifyCode); setCopied(true); setTimeout(() => setCopied(false), 2000) } }

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - new Date().getTime()
      if (diff <= 0) { setTimeRemaining('Kadaluarsa'); setVerifyCode(null); setProgress(0); clearInterval(interval) }
      else { const m = Math.floor(diff / 60000), s = Math.floor((diff % 60000) / 1000); setTimeRemaining(`${m}:${s.toString().padStart(2, '0')}`); setProgress((diff / (EXPIRE_SECONDS * 1000)) * 100) }
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (chatId) {
    return (
      <div className="bg-[#0059D0] text-white rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 bg-white text-black rounded-xl flex items-center justify-center"><Check className="size-5" strokeWidth={3} /></div>
          <div><p className="text-xs text-white/40">Status Koneksi</p><h4 className="text-base font-semibold">Telegram Terhubung</h4></div>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">Bot siap mengirimkan notifikasi tugas langsung ke akunmu.</p>
        <div className="mt-4 flex items-center gap-2"><div className="size-2 rounded-full bg-emerald-500" /><span className="text-xs text-white/60">Live • Aktif</span></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0059D0] text-white rounded-2xl p-5">
        <h4 className="text-sm font-semibold">Hubungkan Telegram</h4>
        <p className="text-xs text-white/60 leading-relaxed mt-1">Generate kode verifikasi unik, lalu kirimkan ke bot Telegram kami.</p>
      </div>

      {!verifyCode ? (
        <button onClick={generateCode} disabled={isGenerating} className="w-full h-11 bg-[#0059D0] text-white rounded-full text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#60A8F8] disabled:opacity-50 transition-colors">
          {isGenerating ? <><RefreshCw className="size-4 animate-spin" /> Membuat Kode...</> : <><Shield className="size-4" /> Generate Kode Verifikasi</>}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-white border border-black/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-black/40">Kode Verifikasi</span>
              <span className={cn("text-xs px-2 py-1 rounded-full", timeRemaining === 'Kadaluarsa' ? "bg-black/5 text-black/40" : "bg-black text-white")}>{timeRemaining === 'Kadaluarsa' ? 'Kadaluarsa' : timeRemaining}</span>
            </div>
            <div className="h-1 w-full bg-black/5 rounded-full mb-3 overflow-hidden"><div className={cn("h-full rounded-full transition-all duration-1000", progress > 20 ? "bg-black" : "bg-black/30")} style={{ width: `${progress}%` }} /></div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-2xl font-semibold tracking-widest text-center py-3 bg-[#60A8F8]/10 rounded-2xl border border-black/5">{verifyCode}</code>
              <button onClick={copyCode} className={cn("size-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors", copied ? "bg-black border-black text-white" : "bg-white border-black/10 text-black/40 hover:border-black/20")}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</button>
            </div>
          </div>

          <div className="bg-[#60A8F8]/10 border border-black/5 rounded-2xl p-4">
            <p className="text-xs font-medium text-black/40 mb-3">Cara Menghubungkan</p>
            <ol className="space-y-2">
              {[
                { step: 1, text: <>Buka Telegram dan cari bot <span className="font-medium text-black">@{botUsername}</span></> },
                { step: 2, text: <>Klik <span className="font-medium text-black">Start</span> atau kirim <code className="bg-white px-1.5 py-0.5 rounded text-xs border border-black/5">/start</code></> },
                { step: 3, text: <>Kirimkan kode verifikasi di atas ke bot</> },
                { step: 4, text: <>Tunggu konfirmasi berhasil dari bot</> },
              ].map(({ step, text }) => (
                <li key={step} className="flex items-center gap-3 text-xs text-black/60"><span className="size-5 bg-[#0059D0] text-white rounded-full flex items-center justify-center text-xs shrink-0">{step}</span>{text}</li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer" className="h-10 bg-[#0059D0] text-white rounded-full text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#60A8F8] transition-colors"><ExternalLink className="size-3.5" /> Buka Bot</a>
            <button onClick={generateCode} disabled={isGenerating} className="h-10 bg-white border border-black/10 text-black rounded-full text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#60A8F8]/10 transition-colors"><RefreshCw className={cn("size-3.5", isGenerating && "animate-spin")} /> Perbarui</button>
          </div>
        </div>
      )}
      <p className="text-center text-xs text-black/30">Kode berlaku 10 menit dan hanya bisa dipakai sekali.</p>
    </div>
  )
}
