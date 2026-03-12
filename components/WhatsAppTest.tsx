'use client'

import { useState } from 'react'

export function WhatsAppTest({ phoneNumber }: { phoneNumber?: string | null }) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null)

  const handleTest = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber || undefined
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: `Pesan terkirim ke ${data.to}` })
      } else {
        setResult({ success: false, error: data.error || 'Gagal mengirim pesan' })
      }
    } catch (error) {
      setResult({ success: false, error: 'Terjadi kesalahan' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6">
      <h4 className="font-semibold text-green-900 mb-2">
        📱 Test Kirim WhatsApp
      </h4>
      <p className="text-sm text-green-700 mb-4">
        Kirim pesan test ke nomor: <strong>{phoneNumber || 'Belum diset'}</strong>
      </p>
      
      <button
        onClick={handleTest}
        disabled={isLoading || !phoneNumber}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isLoading ? 'Mengirim...' : 'Kirim Pesan Test'}
      </button>

      {result && (
        <div className={`mt-4 p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {result.success ? result.message : result.error}
        </div>
      )}
    </div>
  )
}
