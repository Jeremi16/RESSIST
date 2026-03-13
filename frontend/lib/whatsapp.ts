// WhatsApp service with dynamic import to avoid bundling issues
let whatsappModule: typeof import('@whiskeysockets/baileys') | null = null
let boomModule: typeof import('@hapi/boom') | null = null

async function getModules() {
  if (!whatsappModule) {
    whatsappModule = await import('@whiskeysockets/baileys')
  }
  if (!boomModule) {
    boomModule = await import('@hapi/boom')
  }
  return { whatsappModule, boomModule }
}

import * as path from 'path'

let whatsappSocket: any = (globalThis as any)._whatsappSocket || null
let isConnected = (globalThis as any)._isConnected || false
let qrGenerated = (globalThis as any)._qrGenerated || false
let isInitializing = (globalThis as any)._isInitializing || false
let currentQR: string | null = (globalThis as any)._currentQR || null
let qrCallback: ((qr: string) => void) | null = null

function updateState(updates: any) {
  if (updates.whatsappSocket !== undefined) {
    whatsappSocket = updates.whatsappSocket
    ;(globalThis as any)._whatsappSocket = updates.whatsappSocket
  }
  if (updates.isConnected !== undefined) {
    isConnected = updates.isConnected
    ;(globalThis as any)._isConnected = updates.isConnected
  }
  if (updates.qrGenerated !== undefined) {
    qrGenerated = updates.qrGenerated
    ;(globalThis as any)._qrGenerated = updates.qrGenerated
  }
  if (updates.isInitializing !== undefined) {
    isInitializing = updates.isInitializing
    ;(globalThis as any)._isInitializing = updates.isInitializing
  }
  if (updates.currentQR !== undefined) {
    currentQR = updates.currentQR
    ;(globalThis as any)._currentQR = updates.currentQR
  }
}

const AUTH_DIR = path.join(process.cwd(), 'whatsapp-auth')

export function getCurrentQR(): string | null {
  return currentQR
}

export function clearQR(): void {
  updateState({ currentQR: null })
}

export function onQRGenerated(callback: (qr: string) => void) {
  qrCallback = callback
  // If QR already exists, call immediately
  if (currentQR) {
    callback(currentQR)
  }
}

export function removeQRListener() {
  qrCallback = null
}

export async function initializeWhatsApp(): Promise<any> {
  if (whatsappSocket && isConnected) {
    return whatsappSocket
  }

  if (isInitializing) {
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (whatsappSocket && isConnected) {
      return whatsappSocket
    }
  }

  updateState({ isInitializing: true })
  console.log('Initializing WhatsApp...')

  try {
    const { whatsappModule, boomModule } = await getModules()
    const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = whatsappModule

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

    const sock = makeWASocket({
      version,
      auth: state,
      browser: ['Mac OS', 'Safari', '10.15.7'],
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
    })

    updateState({ whatsappSocket: sock })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log('QR Code received!')
        
        // Store raw QR first
        updateState({ qrGenerated: true, currentQR: qr })
        
        // Call callback if exists
        if (qrCallback) {
          qrCallback(qr)
        }
      }

      if (connection === 'close') {
        updateState({ isConnected: false, qrGenerated: false, currentQR: null })
        
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !==
          DisconnectReason.loggedOut

        console.log('WhatsApp disconnected. Reconnecting:', shouldReconnect)

        if (shouldReconnect) {
          setTimeout(() => initializeWhatsApp(), 5000)
        }
      } else if (connection === 'open') {
        updateState({ isConnected: true, qrGenerated: false, currentQR: null })
        console.log('✅ WhatsApp connected!')
      }
    })

    await new Promise(resolve => setTimeout(resolve, 2000))
    return sock
  } finally {
    updateState({ isInitializing: false })
  }
}

export function getWhatsAppStatus(): {
  connected: boolean
  socket: any
  qr: string | null
} {
  return {
    connected: isConnected,
    socket: whatsappSocket,
    qr: currentQR,
  }
}

export function formatPhoneNumber(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  if (!cleaned.startsWith('62') && cleaned.length > 0) {
    cleaned = '62' + cleaned
  }
  return cleaned
}

export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  try {
    const sock = whatsappSocket || await initializeWhatsApp()

    if (!sock || !isConnected) {
      console.error('WhatsApp not connected')
      return false
    }

    const formattedNumber = formatPhoneNumber(phoneNumber)
    const jid = `${formattedNumber}@s.whatsapp.net`

    await sock.sendMessage(jid, { text: message })
    console.log(`✅ Message sent to ${phoneNumber}`)
    return true
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error)
    return false
  }
}

function formatDeadlineWIB(deadline: Date): string {
  return deadline.toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }) + ' WIB'
}

export function createReminderMessage(
  assignmentTitle: string,
  course: string,
  deadline: Date,
  timeRemaining: string
): string {
  const formattedDate = formatDeadlineWIB(deadline)

  return `⚠️ *Pengingat Deadline Tugas*

📚 *Mata Kuliah:* ${course}
📝 *Tugas:* ${assignmentTitle}
📅 *Deadline:* ${formattedDate}
⏰ *Sisa waktu:* ${timeRemaining}

Jangan lupa kumpulkan tugas tepat waktu! Semangat! 💪`
}
