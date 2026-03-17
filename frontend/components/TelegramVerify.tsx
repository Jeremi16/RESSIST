'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, RefreshCw } from 'lucide-react'

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

  const generateCode = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/user/telegram/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to generate code')
      }

      const data = await response.json()
      setVerifyCode(data.code)
      setExpiresAt(data.expires_at)
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
        clearInterval(interval)
      } else {
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt])

  if (chatId) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-600 text-2xl">✅</span>
          <h4 className="font-semibold text-green-900">Telegram Terhubung</h4>
        </div>
        <p className="text-sm text-green-700">
          Telegram sudah terhubung. Siap mengirim pengingat!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center mb-4">
        <h4 className="font-semibold text-blue-900 mb-2 text-lg">
          📱 Hubungkan Telegram
        </h4>
        <p className="text-sm text-blue-700 mb-4">
          Dapatkan notifikasi tugas langsung di Telegram Anda
        </p>
      </div>

      {!verifyCode ? (
        <div className="text-center">
          <button
            onClick={generateCode}
            disabled={isGenerating}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Kode Verifikasi'
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border-2 border-blue-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Kode Verifikasi:</span>
              <span className="text-xs text-blue-600">
                {timeRemaining === 'Kadaluarsa' ? (
                  <span className="text-red-600 font-semibold">{timeRemaining}</span>
                ) : (
                  `Berlaku: ${timeRemaining}`
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-2xl font-bold text-blue-900 tracking-wider text-center py-2 bg-blue-50 rounded">
                {verifyCode}
              </code>
              <button
                onClick={copyCode}
                className="p-2 hover:bg-blue-100 rounded transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-blue-600" />
                )}
              </button>
            </div>
          </div>

          <div className="bg-blue-100 p-4 rounded-lg">
            <p className="text-sm text-blue-900 font-semibold mb-2">Langkah-langkah:</p>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Buka Telegram dan cari bot <strong>@{botUsername}</strong></li>
              <li>Klik <strong>Start</strong> atau kirim <code>/start</code></li>
              <li>Kirim kode verifikasi di atas ke bot</li>
              <li>Tunggu konfirmasi dari bot</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <a
              href={`https://t.me/${botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
            >
              Buka Bot Telegram
            </a>
            <button
              onClick={generateCode}
              disabled={isGenerating}
              className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-blue-600 mt-4 text-center">
        Kode verifikasi berlaku selama 10 menit
      </p>
    </div>
  )
}
