// Shape of everything that gets saved locally and synced to GitHub.
// Every record carries `updatedAt` (ms since epoch); when two devices disagree
// the newer record wins. Deletions are kept as tombstones (`deleted: true`)
// so they sync too.

export interface SrsState {
  due: string // ISO date
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number // 0 New, 1 Learning, 2 Review, 3 Relearning
  last_review?: string // ISO date
}

export interface Deck {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  deleted?: boolean
}

export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  createdAt: number
  updatedAt: number
  firstReviewedAt?: number
  deleted?: boolean
  srs: SrsState
}

export interface Settings {
  name: string
  newPerDay: number
  updatedAt: number
}

export interface AppData {
  version: 1
  decks: Record<string, Deck>
  cards: Record<string, Card>
  settings: Settings
}
