import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initializeWhatsApp, getWhatsAppStatus, sendWhatsAppMessage, createReminderMessage } from '@/lib/whatsapp'
import { fetchAndParseMoodleCalendar, formatTimeRemaining } from '@/lib/moodle'
import { verifySession } from '@/lib/session'

// Make sure WhatsApp is initialized when API is called
let initialized = false

async function ensureInitialized() {
  if (!initialized) {
    try {
      await initializeWhatsApp()
      initialized = true
    } catch (error) {
      console.log('WhatsApp init in progress...')
    }
  }
}

export async function POST(request: NextRequest) {
  await ensureInitialized()
  
  try {
    const { phoneNumber, message: customMessage } = await request.json()

    // Check WhatsApp connection status
    const { connected, qr } = getWhatsAppStatus()
    
    // If QR code is available, return it
    if (!connected && qr) {
      return NextResponse.json({
        success: false,
        needsAuth: true,
        qr: qr,
        message: 'Scan QR code to connect WhatsApp'
      }, { status: 400 })
    }
    
    if (!connected) {
      return NextResponse.json(
        { 
          error: 'WhatsApp not connected. QR code will appear shortly.',
          needsAuth: true,
          status: 'disconnected'
        },
        { status: 400 }
      )
    }

    const session = await verifySession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use provided phone number or get from user
    let targetNumber = phoneNumber
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })

    if (!targetNumber) {
      if (!user?.whatsapp_number) {
        return NextResponse.json(
          { error: 'No phone number provided. Please provide phoneNumber or save config first.' },
          { status: 400 }
        )
      }
      targetNumber = user.whatsapp_number
    }

    // Send message
    let message = customMessage
    if (!message) {
      let sampleDeadline = new Date()
      sampleDeadline.setDate(sampleDeadline.getDate() + 1)
      let title = 'Tugas Contoh'
      let course = 'Sistem Cerdas'
      let timeRemainingText = '24 jam'

      // Try to get real first upcoming event for realistic test
      if (user?.moodle_calendar_url) {
        try {
          const { upcoming } = await fetchAndParseMoodleCalendar(user.moodle_calendar_url)
          if (upcoming.length > 0) {
            const firstEvent = upcoming[0]
            title = firstEvent.title
            course = firstEvent.course
            sampleDeadline = firstEvent.deadline
            timeRemainingText = formatTimeRemaining(firstEvent.deadline)
          }
        } catch (e) {
          console.error('Failed to fetch calendar for test message', e)
        }
      }

      message = createReminderMessage(
        title,
        course,
        sampleDeadline,
        timeRemainingText
      )
    }

    const sent = await sendWhatsAppMessage(targetNumber, message)

    if (sent) {
      return NextResponse.json({
        success: true,
        message: 'Message sent successfully',
        to: targetNumber,
        content: message
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Test WhatsApp error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  await ensureInitialized()
  
  const { connected, qr } = getWhatsAppStatus()
  
  return NextResponse.json({
    connected,
    needsAuth: !connected && !!qr,
    qr: qr,
    status: connected 
      ? 'WhatsApp is connected' 
      : qr 
        ? 'Please scan QR code below'
        : 'Initializing WhatsApp...'
  })
}
