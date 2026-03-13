/**
 * Date Utilities - WIB (Western Indonesian Time) Helpers
 * 
 * WIB is UTC+7
 */

// WIB offset in milliseconds (7 hours)
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

/**
 * Convert a UTC Date to WIB timezone string
 */
export function formatDateTimeWIB(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return d.toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta', // WIB
  }) + ' WIB'
}

/**
 * Format date only in WIB
 */
export function formatDateWIB(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

/**
 * Format time only in WIB
 */
export function formatTimeWIB(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }) + ' WIB'
}

/**
 * Convert WIB date components to UTC Date
 * 
 * Use this when you have a date/time in WIB and want to store it as UTC
 * Example: 23:59 WIB on March 15 → stores as 16:59 UTC on March 15
 */
export function wibToUTC(year: number, month: number, day: number, hours: number, minutes: number): Date {
  // Create UTC timestamp as if the numbers were already in UTC
  const utcTimestamp = Date.UTC(year, month - 1, day, hours, minutes, 0, 0)
  
  // Subtract 7 hours to convert from WIB to UTC
  // (WIB is ahead of UTC by 7 hours)
  return new Date(utcTimestamp - WIB_OFFSET_MS)
}

/**
 * Convert UTC Date to WIB date components
 */
export function utcToWIB(date: Date): {
  year: number
  month: number
  day: number
  hours: number
  minutes: number
} {
  const wibString = date.toLocaleString('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  
  const [datePart, timePart] = wibString.split(', ')
  const [month, day, year] = datePart.split('/').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  
  return { year, month, day, hours, minutes }
}

/**
 * Check if a date is in the future (in WIB timezone)
 */
export function isUpcoming(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  return d > now
}

/**
 * Calculate time remaining until deadline
 * Returns human readable string in Indonesian
 */
export function formatTimeRemaining(deadline: Date | string): string {
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  
  if (diffMs <= 0) {
    return 'Sudah lewat'
  }
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  const remainingHours = diffHours % 24
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (diffHours < 1) {
    return `${diffMinutes} menit`
  }
  
  if (diffHours < 24) {
    return `${diffHours} jam`
  }
  
  if (remainingHours === 0) {
    return `${diffDays} hari`
  }
  
  return `${diffDays} hari ${remainingHours} jam`
}
