import axios from 'axios'

// WIB is UTC+7
const WIB_OFFSET_HOURS = 7

export interface CalendarEvent {
  title: string
  course: string
  start: Date
  end: Date
  description?: string
}

export interface ParsedEvent {
  title: string
  course: string
  deadline: Date
}

export async function fetchICSFile(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch ICS file: ${error.message}`)
    }
    throw new Error('Failed to fetch ICS file: Unknown error')
  }
}

// Convert UTC date to WIB (UTC+7)
function toWIB(date: Date): Date {
  return new Date(date.getTime() + (WIB_OFFSET_HOURS * 60 * 60 * 1000))
}

export function parseICS(icsData: string): CalendarEvent[] {
  try {
    const events: CalendarEvent[] = []
    const lines = icsData.split(/\r\n|\n|\r/)
    
    let currentEvent: Partial<CalendarEvent> | null = null
    let inEvent = false
    let descriptionLines: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Handle folded lines (lines starting with space)
      if (line.startsWith(' ') && descriptionLines.length > 0) {
        descriptionLines[descriptionLines.length - 1] += line.substring(1)
        continue
      }
      
      if (line === 'BEGIN:VEVENT') {
        inEvent = true
        currentEvent = {}
        descriptionLines = []
      } else if (line === 'END:VEVENT') {
        if (currentEvent && currentEvent.title) {
          events.push({
            title: currentEvent.title,
            course: currentEvent.course || 'Umum',
            start: currentEvent.start || new Date(),
            end: currentEvent.end || currentEvent.start || new Date(),
            description: currentEvent.description,
          })
        }
        inEvent = false
        currentEvent = null
      } else if (inEvent && currentEvent) {
        if (line.startsWith('SUMMARY:')) {
          currentEvent.title = line.substring(8).replace(/\\,/g, ',').replace(/\\n/g, '\n')
        } else if (line.startsWith('CATEGORIES:')) {
          currentEvent.course = line.substring(11).replace(/\\,/g, ',').trim()
        } else if (line.startsWith('DTSTART')) {
          const dateStr = line.split(':')[1]
          const utcDate = parseICalDate(dateStr)
          currentEvent.start = utcDate
        } else if (line.startsWith('DTEND')) {
          const dateStr = line.split(':')[1]
          const utcDate = parseICalDate(dateStr)
          currentEvent.end = utcDate
        } else if (line.startsWith('DESCRIPTION:')) {
          descriptionLines.push(line.substring(12).replace(/\\,/g, ',').replace(/\\n/g, '\n'))
          currentEvent.description = descriptionLines.join('')
        }
      }
    }
    
    return events.sort((a, b) => a.start.getTime() - b.start.getTime())
  } catch (error) {
    throw new Error(`Failed to parse ICS data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function parseICalDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  
  // Handle UTC format (ends with Z)
  if (dateStr.endsWith('Z')) {
    return new Date(Date.UTC(
      parseInt(dateStr.substring(0, 4)),
      parseInt(dateStr.substring(4, 6)) - 1,
      parseInt(dateStr.substring(6, 8)),
      parseInt(dateStr.substring(9, 11)),
      parseInt(dateStr.substring(11, 13)),
      parseInt(dateStr.substring(13, 15))
    ))
  }
  
  // Handle local format
  if (dateStr.length >= 15 && dateStr.includes('T')) {
    return new Date(
      parseInt(dateStr.substring(0, 4)),
      parseInt(dateStr.substring(4, 6)) - 1,
      parseInt(dateStr.substring(6, 8)),
      parseInt(dateStr.substring(9, 11)),
      parseInt(dateStr.substring(11, 13)),
      parseInt(dateStr.substring(13, 15))
    )
  }
  
  // Handle date-only format (YYYYMMDD)
  if (dateStr.length === 8) {
    return new Date(
      parseInt(dateStr.substring(0, 4)),
      parseInt(dateStr.substring(4, 6)) - 1,
      parseInt(dateStr.substring(6, 8))
    )
  }
  
  return new Date(dateStr)
}

export function getUpcomingEvents(events: CalendarEvent[], hoursAhead: number = 168): ParsedEvent[] {
  // Use WIB timezone for "now"
  const now = new Date()
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)

  return events
    .filter(event => {
      const eventTime = event.end || event.start
      return eventTime > now && eventTime <= cutoff
    })
    .map(event => ({
      title: event.title,
      course: event.course,
      deadline: event.end || event.start
    }))
}

export function formatTimeRemaining(deadline: Date): string {
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  const remainingHours = diffHours % 24

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `${diffMinutes} menit`
  }

  if (diffHours < 24) {
    return `${diffHours} jam`
  }

  if (diffDays === 1 && remainingHours === 0) {
    return 'besok'
  }

  if (remainingHours > 0) {
    return `${diffDays} hari ${remainingHours} jam`
  }

  return `${diffDays} hari`
}

// Format deadline in WIB timezone with Indonesian format
export function formatDeadlineWIB(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }
  return date.toLocaleString('id-ID', options) + ' WIB'
}

export async function fetchAndParseMoodleCalendar(url: string): Promise<{
  events: CalendarEvent[]
  upcoming: ParsedEvent[]
}> {
  const icsData = await fetchICSFile(url)
  const events = parseICS(icsData)
  const upcoming = getUpcomingEvents(events, 1440) // 60 days ahead

  return { events, upcoming }
}
