export function formatDate(d: Date | string | null | undefined, tz?: string) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    ...(tz ? { timeZone: tz } : {}),
  }).format(date)
}

export function formatDateTime(d: Date | string | null | undefined, tz?: string) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    ...(tz ? { timeZone: tz } : {}),
  }).format(date)
}

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}
