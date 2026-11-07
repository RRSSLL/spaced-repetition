import { useEffect, useState } from 'react'

/** Re-renders every `ms` so time-based counts (cards coming due) stay fresh. */
export function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms)
    const onVis = () => document.visibilityState === 'visible' && setNow(new Date())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [ms])
  return now
}

export function shortDate(ms: number, now = new Date()): string {
  const d = new Date(ms)
  if (d.toDateString() === now.toDateString()) return 'Today'
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

export function shortTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** "in 5 min", "at 4:30 PM", "tomorrow", "Nov 12" */
export function whenLabel(ms: number, now = new Date()): string {
  const diff = ms - now.getTime()
  if (diff < 60_000) return 'now'
  if (diff < 60 * 60_000) return `in ${Math.round(diff / 60_000)} min`
  const d = new Date(ms)
  if (d.toDateString() === now.toDateString()) return `at ${shortTime(ms)}`
  const t = new Date(now)
  t.setDate(t.getDate() + 1)
  if (d.toDateString() === t.toDateString()) return 'tomorrow'
  return shortDate(ms, now)
}

export const plural = (n: number, word: string, many = word + 's') => `${n} ${n === 1 ? word : many}`
