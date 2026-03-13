import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { initializeTelegram, sendTelegramMessage, createTelegramReminderMessage, getTelegramStatus } from '@/lib/telegram'
import { fetchAndParseMoodleCalendar, formatTimeRemaining } from '@/lib/moodle'
import { verifySession } from '@/lib/session'

// Make sure Telegram is initialized when API is called
let initialized = false

async function ensureInitialized() {
  if (!initialized) {
    try {
      await initializeTelegram()
      initialized = true
    } catch (error) {
      console.log('Telegram init failed...', error)
    }
  }
}

export async function POST(request: NextRequest) {
  await ensureInitialized()
  
  try {
    const { chatId, message: customMessage } = await request.json()

    // Check Telegram connection status
    const { connected } = getTelegramStatus()
    
    if (!connected) {
      return NextResponse.json(
        { 
          error: 'Telegram bot not connected or token not configured. Please check TELEGRAM_BOT_TOKEN.',
          status: 'disconnected'
        },
        { status: 500 }
      )
    }

    const session = await verifySession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use provided chatId or get from user
    let targetChatId = chatId
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })
    
    if (!targetChatId) {
      if (!(user as any)?.telegram_chat_id) {
        return NextResponse.json(
          { error: 'No Telegram Chat ID provided. Please provide chatId or save config first.' },
          { status: 400 }
        )
      }
      targetChatId = (user as any).telegram_chat_id
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

      message = createTelegramReminderMessage(
        title,
        course,
        sampleDeadline,
        timeRemainingText
      )
    }

    const sent = await sendTelegramMessage(targetChatId.toString(), message)

    if (sent) {
      return NextResponse.json({
        success: true,
        message: 'Message sent successfully',
        to: targetChatId,
        content: message
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Test Telegram error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  await ensureInitialized()
  
  const { connected, botUsername } = getTelegramStatus()
  
  return NextResponse.json({
    connected,
    botUsername,
    status: connected 
      ? `Telegram bot connected as @${botUsername || 'configured'}` 
      : 'Initializing Telegram bot or token missing'
  })
}
