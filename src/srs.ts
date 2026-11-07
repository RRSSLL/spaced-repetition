import { createEmptyCard, fsrs, Rating, State, type Card as FsrsCard, type Grade } from 'ts-fsrs'
import type { AppData, Card, SrsState } from './types'

const scheduler = fsrs({ enable_fuzz: true })

/** Cards in (re)learning that come due within this window are shown early instead of ending the session. */
const LEARN_AHEAD_MS = 20 * 60 * 1000

export const GRADES: { grade: Grade; label: string; key: string }[] = [
  { grade: Rating.Again, label: 'Again', key: '1' },
  { grade: Rating.Hard, label: 'Hard', key: '2' },
  { grade: Rating.Good, label: 'Good', key: '3' },
  { grade: Rating.Easy, label: 'Easy', key: '4' },
]

function toSrs(c: FsrsCard): SrsState {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    ...(c.last_review ? { last_review: c.last_review.toISOString() } : {}),
  }
}

function fromSrs(s: SrsState): FsrsCard {
  return {
    ...s,
    due: new Date(s.due),
    state: s.state as State,
    last_review: s.last_review ? new Date(s.last_review) : undefined,
  }
}

export function newSrs(now = new Date()): SrsState {
  return toSrs(createEmptyCard(now))
}

export function rate(srs: SrsState, grade: Grade, now = new Date()): SrsState {
  return toSrs(scheduler.next(fromSrs(srs), now, grade).card)
}

/** What each button would do, e.g. { 1: '<1m', 2: '6m', 3: '10m', 4: '4d' }. */
export function previewLabels(srs: SrsState, now = new Date()): Record<Grade, string> {
  const preview = scheduler.repeat(fromSrs(srs), now)
  const out = {} as Record<Grade, string>
  for (const { grade } of GRADES) out[grade] = formatInterval(preview[grade].card.due.getTime() - now.getTime())
  return out
}

export function formatInterval(ms: number): string {
  const min = ms / 60000
  if (min < 1) return '<1m'
  if (min < 60) return `${Math.round(min)}m`
  const hr = min / 60
  if (hr < 24) return `${Math.round(hr)}h`
  const day = hr / 24
  if (day < 30) return `${Math.round(day)}d`
  if (day < 365) return `${trim(day / 30)}mo`
  return `${trim(day / 365)}y`
}

const trim = (n: number) => (n < 10 ? n.toFixed(1).replace(/\.0$/, '') : String(Math.round(n)))

// ---------- queues ----------

export const isNew = (c: Card) => c.srs.state === State.New
const dueAt = (c: Card) => Date.parse(c.srs.due)

export function startOfDay(now = new Date()): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function liveCards(data: AppData, deckId?: string): Card[] {
  return Object.values(data.cards).filter(
    (c) => !c.deleted && !data.decks[c.deckId]?.deleted && (!deckId || c.deckId === deckId),
  )
}

/** How many more new cards may be introduced today (shared across decks). */
export function newLeftToday(data: AppData, now = new Date()): number {
  const sod = startOfDay(now)
  const introduced = Object.values(data.cards).filter((c) => (c.firstReviewedAt ?? 0) >= sod).length
  return Math.max(0, data.settings.newPerDay - introduced)
}

export interface QueueInfo {
  dueNow: Card[] // reviews whose time has come
  fresh: Card[] // new cards allowed today
  learningSoon: Card[] // learning cards due within the learn-ahead window
  newTotal: number
  nextDue?: number // earliest future due time (ms)
}

export function queueInfo(data: AppData, deckId?: string, now = new Date()): QueueInfo {
  const t = now.getTime()
  const cards = liveCards(data, deckId)
  const seen = cards.filter((c) => !isNew(c)).sort((a, b) => dueAt(a) - dueAt(b))
  const dueNow = seen.filter((c) => dueAt(c) <= t)
  const later = seen.filter((c) => dueAt(c) > t)
  const learningSoon = later.filter(
    (c) => (c.srs.state === State.Learning || c.srs.state === State.Relearning) && dueAt(c) <= t + LEARN_AHEAD_MS,
  )
  const newCards = cards.filter(isNew).sort((a, b) => a.createdAt - b.createdAt)
  return {
    dueNow,
    fresh: newCards.slice(0, newLeftToday(data, now)),
    learningSoon,
    newTotal: newCards.length,
    nextDue: later[0] ? dueAt(later[0]) : undefined,
  }
}

export function nextCard(q: QueueInfo): Card | undefined {
  return q.dueNow[0] ?? q.fresh[0] ?? q.learningSoon[0]
}

export const remaining = (q: QueueInfo) => q.dueNow.length + q.fresh.length + q.learningSoon.length

export function lastReviewed(data: AppData, deckId: string): number | undefined {
  let max: number | undefined
  for (const c of liveCards(data, deckId)) {
    if (c.srs.last_review) {
      const t = Date.parse(c.srs.last_review)
      if (max === undefined || t > max) max = t
    }
  }
  return max
}
