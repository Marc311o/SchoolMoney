const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function timeAgo(isoDateTime: string, now = new Date()): string {
  const seconds = (new Date(isoDateTime).getTime() - now.getTime()) / 1000
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) {
      return relative.format(Math.round(seconds / size), unit)
    }
  }
  return 'just now'
}

export function formatDate(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatFullDate(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Whole calendar days between the date and today: 0 = today, 1 = yesterday */
function daysAgo(isoDateTime: string, now: Date): number {
  const DAY = 24 * 3600 * 1000
  return Math.round((startOfDay(now) - startOfDay(new Date(isoDateTime))) / DAY)
}

/** "09:15" */
export function formatTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Next to a conversation in a list: "09:15", "Yesterday", "Mon", "28 Oct" */
export function shortTimestamp(isoDateTime: string, now = new Date()): string {
  const days = daysAgo(isoDateTime, now)
  if (days === 0) return formatTime(isoDateTime)
  if (days === 1) return 'Yesterday'
  if (days < 7) {
    return new Date(isoDateTime).toLocaleDateString('en-GB', {
      weekday: 'short',
    })
  }
  return formatDate(isoDateTime)
}

/** Divider between days of messages: "Today", "Yesterday", "Mon 26 Oct" */
export function dayLabel(isoDateTime: string, now = new Date()): string {
  const days = daysAgo(isoDateTime, now)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  const date = new Date(isoDateTime)
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  })
}

export function isSameDay(a: string, b: string): boolean {
  return startOfDay(new Date(a)) === startOfDay(new Date(b))
}
