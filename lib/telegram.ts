import { Telegraf } from 'telegraf'

// Store bot instance globally to prevent re-instantiation in Next.js development
let telegramBot: Telegraf | null = (globalThis as any)._telegramBot || null
let isPolling = (globalThis as any)._isPolling || false

export function getTelegramBot(): Telegraf | null {
  return telegramBot
}

export async function initializeTelegram(): Promise<Telegraf | null> {
  if (telegramBot) {
    return telegramBot
  }

  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not defined in environment variables')
    return null
  }

  try {
    const bot = new Telegraf(token)

    // Setup basic commands
    bot.start((ctx) => {
      ctx.reply('Halo! Saya adalah E-Learning Reminder Bot. ID Chat kamu adalah: ' + ctx.chat.id + '\n\nSilakan salin ID ini dan simpan di pengaturan dashboard kamu agar saya bisa mengirimkan pengingat tugas.')
    })

    bot.command('id', (ctx) => {
      ctx.reply('ID Chat kamu adalah: ' + ctx.chat.id)
    })

    bot.help((ctx) => {
      ctx.reply('Kirim /start untuk memulai dan melihat ID Chat kamu.\nKirim /id untuk melihat ID chat kamu.')
    })

    // Store globally
    telegramBot = bot
    ;(globalThis as any)._telegramBot = bot

    // Start polling only if not already polling
    if (!isPolling) {
      bot.launch().catch(err => {
        console.error('Failed to launch the Telegram bot:', err)
      })
      isPolling = true
      ;(globalThis as any)._isPolling = true
      console.log('✅ Telegram Bot is running')
    }

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))

    return bot
  } catch (error) {
    console.error('Failed to initialize Telegram:', error)
    return null
  }
}

export function getTelegramStatus(): {
  connected: boolean
  botUsername: string | null
} {
  return {
    connected: !!telegramBot && isPolling,
    botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
  }
}

export async function sendTelegramMessage(
  chatId: string,
  message: string
): Promise<boolean> {
  try {
    const bot = telegramBot || await initializeTelegram()

    if (!bot) {
      console.error('Telegram bot not initialized')
      return false
    }

    await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    console.log(`✅ Message sent to Telegram chat ${chatId}`)
    return true
  } catch (error: any) {
    console.error('Failed to send Telegram message:', error)
    throw error
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

export function createTelegramReminderMessage(
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
