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
    // year: 'numeric',
  })
}
