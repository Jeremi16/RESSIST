'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

export function WhatsAppQR() {
  const [status, setStatus] = useState<{
    connected: boolean
    needsAuth: boolean
    qr: string | null
    qrDataUrl: string | null
    message: string
  }>({
    connected: false,
    needsAuth: false,
    qr: null,
    qrDataUrl: null,
    message: 'Memeriksa status WhatsApp...'
  })
  const [isLoading, setIsLoading] = useState(true)

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/test-whatsapp')
      const data = await response.json()
      
      let qrDataUrl = null
      if (data.qr) {
        try {
          qrDataUrl = await QRCode.toDataURL(data.qr, { 
            width: 300, 
            margin: 2,
            errorCorrectionLevel: 'M'
          })
        } catch (err) {
          console.error('Failed to generate QR:', err)
        }
      }
      
      setStatus({
        connected: data.connected,
        needsAuth: data.needsAuth,
        qr: data.qr,
        qrDataUrl: qrDataUrl,
        message: data.status
      })
    } catch (error) {
      console.error('Error checking status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
    
    // Poll every 2 seconds
    const interval = setInterval(checkStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">Memeriksa status WhatsApp...</p>
      </div>
    )
  }

  if (status.connected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-600 text-2xl">✅</span>
          <h4 className="font-semibold text-green-900">WhatsApp Terhubung</h4>
        </div>
        <p className="text-sm text-green-700">
          WhatsApp sudah terhubung. Siap mengirim pengingat!
        </p>
      </div>
    )
  }

  if (status.needsAuth && status.qrDataUrl) {
    return (
      <div className="bg-[#60A8F8]/10 border border-[#60A8F8]/30 rounded-lg p-6">
        <div className="text-center mb-4">
          <h4 className="font-semibold text-[#0043A5] mb-2 text-lg">
            📱 Scan QR Code untuk Connect WhatsApp
          </h4>
          <p className="text-sm text-[#0059D0] mb-4">
            1. Buka WhatsApp di HP<br/>
            2. Menu (3 titik) → Perangkat Tertaut → Tautkan Perangkat<br/>
            3. Scan QR code di bawah ini
          </p>
        </div>
        
        <div className="flex justify-center mb-4">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <img 
              src={status.qrDataUrl} 
              alt="WhatsApp QR Code" 
              className="w-64 h-64"
            />
          </div>
        </div>
        
        <p className="text-center text-sm text-[#0059D0]">
          ⏳ Menunggu scan... Halaman akan otomatis update saat terhubung.
        </p>
        <p className="text-center text-xs text-[#60A8F8] mt-2">
          Jika QR tidak berfungsi, refresh halaman untuk mendapatkan QR baru.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
      <h4 className="font-semibold text-yellow-900 mb-2">
        ⏳ Menghubungkan ke WhatsApp...
      </h4>
      <p className="text-sm text-yellow-700 mb-4">
        QR code akan muncul dalam 5-10 detik.
      </p>
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
      </div>
      <button
        onClick={checkStatus}
        className="mt-4 w-full bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
      >
        Refresh Status
      </button>
    </div>
  )
}
