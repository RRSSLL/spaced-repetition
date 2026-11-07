import { useSyncExternalStore } from 'react'
import { get, set } from 'idb-keyval'
import type { Grade } from 'ts-fsrs'
import type { AppData, Card, Deck, Settings } from './types'
import { newSrs, rate } from './srs'

const DB_KEY = 'data'

export function emptyData(): AppData {
  return { version: 1, decks: {}, cards: {}, settings: { name: 'Me', newPerDay: 10, updatedAt: 0 } }
}

// ---------- tiny external store ----------

let state: AppData = emptyData()
const listeners = new Set<() => void>()
let changeListener: (() => void) | null = null

export const getState = () => state
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useData = () => useSyncExternalStore(subscribe, getState)

/** Called by sync to learn about local edits. */
export function onLocalChange(fn: () => void) {
  changeListener = fn
}

export function setState(next: AppData, opts: { fromSync?: boolean } = {}) {
  state = next
  set(DB_KEY, state).catch((e) => console.error('Saving failed', e))
  listeners.forEach((l) => l())
  if (!opts.fromSync) changeListener?.()
}

export async function loadState() {
  try {
    const saved = await get<AppData>(DB_KEY)
    if (saved?.version === 1) state = { ...emptyData(), ...saved }
  } catch (e) {
    console.error('Loading failed', e)
  }
  // Ask the browser not to evict our data under storage pressure.
  navigator.storage?.persist?.().catch(() => {})
}

// ---------- merging (used by sync and import) ----------

type Stamped = { updatedAt: number }

/**
 * Combine two copies of the data, keeping the newer version of each record.
 * Ties go to `remote`. `changed` is true when the result differs from `remote`
 * (i.e. remote needs to be updated).
 */
export function mergeData(local: AppData, remote: AppData): { data: AppData; changed: boolean } {
  let changed = false
  const pick = <T extends Stamped>(l: T | undefined, r: T | undefined): T => {
    if (!r) {
      changed = true
      return l!
    }
    if (l && l.updatedAt > r.updatedAt) {
      changed = true
      return l
    }
    return r
  }
  const mergeRecord = <T extends Stamped>(l: Record<string, T>, r: Record<string, T>) => {
    const out: Record<string, T> = {}
    for (const id of new Set([...Object.keys(r), ...Object.keys(l)])) out[id] = pick(l[id], r[id])
    return out
  }
  const data: AppData = {
    version: 1,
    decks: mergeRecord(local.decks, remote.decks ?? {}),
    cards: mergeRecord(local.cards, remote.cards ?? {}),
    settings: pick(local.settings, remote.settings),
  }
  return { data, changed }
}

// ---------- actions ----------

export function uid(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

const update = (fn: (d: AppData) => AppData) => setState(fn(state))

export function addDeck(name: string): string {
  const id = uid()
  const now = Date.now()
  update((d) => ({ ...d, decks: { ...d.decks, [id]: { id, name, createdAt: now, updatedAt: now } } }))
  return id
}

export function updateDeck(id: string, patch: Partial<Pick<Deck, 'name' | 'deleted'>>) {
  update((d) => ({ ...d, decks: { ...d.decks, [id]: { ...d.decks[id], ...patch, updatedAt: Date.now() } } }))
}

export function deleteDeck(id: string) {
  const now = Date.now()
  update((d) => {
    const cards = { ...d.cards }
    for (const c of Object.values(cards)) if (c.deckId === id && !c.deleted) cards[c.id] = { ...c, deleted: true, updatedAt: now }
    return { ...d, cards, decks: { ...d.decks, [id]: { ...d.decks[id], deleted: true, updatedAt: now } } }
  })
}

export function addCard(deckId: string, front: string, back: string): string {
  const id = uid()
  const now = Date.now()
  const card: Card = { id, deckId, front, back, createdAt: now, updatedAt: now, srs: newSrs() }
  update((d) => ({ ...d, cards: { ...d.cards, [id]: card } }))
  return id
}

export function updateCard(id: string, patch: Partial<Pick<Card, 'front' | 'back' | 'deckId' | 'deleted'>>) {
  update((d) => ({ ...d, cards: { ...d.cards, [id]: { ...d.cards[id], ...patch, updatedAt: Date.now() } } }))
}

/** Records a review and returns the card as it was, for undo. */
export function reviewCard(id: string, grade: Grade): Card {
  const before = state.cards[id]
  const now = new Date()
  update((d) => ({
    ...d,
    cards: {
      ...d.cards,
      [id]: {
        ...before,
        srs: rate(before.srs, grade, now),
        firstReviewedAt: before.firstReviewedAt ?? now.getTime(),
        updatedAt: now.getTime(),
      },
    },
  }))
  return before
}

export function restoreCard(card: Card) {
  update((d) => ({ ...d, cards: { ...d.cards, [card.id]: { ...card, updatedAt: Date.now() } } }))
}

export function updateSettings(patch: Partial<Omit<Settings, 'updatedAt'>>) {
  update((d) => ({ ...d, settings: { ...d.settings, ...patch, updatedAt: Date.now() } }))
}

export function importData(incoming: AppData) {
  update((d) => mergeData(d, incoming).data)
}

export const liveDecks = (d: AppData) =>
  Object.values(d.decks)
    .filter((x) => !x.deleted)
    .sort((a, b) => a.name.localeCompare(b.name))
