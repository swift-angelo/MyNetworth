/** "just now", "5 min ago", "3 h ago", "2 d ago", then a plain date for anything older than a week. */
export function timeAgo(when: string | number | Date, now: number = Date.now()): string {
  const t = new Date(when).getTime()
  if (!Number.isFinite(t)) return ''
  const sec = Math.max(0, Math.round((now - t) / 1000))
  if (sec < 45) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} d ago`
  return new Date(t).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })
}
