import { useEffect, useState } from 'react'
import type { Grade } from 'ts-fsrs'
import { useNav } from '../App'
import { restoreCard, reviewCard, useData } from '../store'
import { GRADES, nextCard, previewLabels, queueInfo, remaining } from '../srs'
import { syncNow } from '../sync'
import type { Card } from '../types'
import { CloseIcon, PencilIcon, UndoIcon } from '../icons'
import { plural, useNow, whenLabel } from '../util'

export default function Review({ deckId }: { deckId?: string }) {
  const data = useData()
  const now = useNow(15_000)
  const { open, close } = useNav()
  const q = queueInfo(data, deckId, now)
  const card = nextCard(q)
  const left = remaining(q)
  const cardKey = card ? `${card.id}:${card.updatedAt}` : ''

  const [shownKey, setShownKey] = useState('')
  const shown = shownKey === cardKey
  const [history, setHistory] = useState<Card[]>([])
  const [reviewed, setReviewed] = useState(0)

  const finish = () => {
    syncNow()
    close()
  }

  const answer = (grade: Grade) => {
    if (!card || !shown) return
    const before = reviewCard(card.id, grade)
    setHistory((h) => [...h.slice(-19), before])
    setReviewed((n) => n + 1)
  }

  const undo = () => {
    const last = history.at(-1)
    if (!last) return
    restoreCard(last)
    setHistory((h) => h.slice(0, -1))
    setReviewed((n) => n - 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') return finish()
      if ((e.key === ' ' || e.key === 'Enter') && card && !shown) {
        e.preventDefault()
        return setShownKey(cardKey)
      }
      if (e.key === ' ' && shown) {
        e.preventDefault()
        return answer(3 as Grade)
      }
      const g = GRADES.find((x) => x.key === e.key)
      if (g) return answer(g.grade)
      if (e.key === 'z' || e.key === 'u') undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const deckName = deckId ? data.decks[deckId]?.name : undefined
  const labels = card && shown ? previewLabels(card.srs, now) : null

  return (
    <div className="overlay review">
      <div className="overlay-bar">
        <button className="icon-btn" onClick={finish} aria-label="Close review">
          <CloseIcon />
        </button>
        <span className="overlay-bar-title">{deckName ?? 'Review'}</span>
        <span className="review-tools">
          {history.length > 0 && (
            <button className="icon-btn" onClick={undo} aria-label="Undo last answer" title="Undo (Z)">
              <UndoIcon />
            </button>
          )}
          {card && (
            <button
              className="icon-btn"
              onClick={() => open({ kind: 'editor', cardId: card.id })}
              aria-label="Edit this card"
            >
              <PencilIcon />
            </button>
          )}
        </span>
      </div>

      {card ? (
        <>
          <div className="review-progress">
            <span>{left} left</span>
            {!deckId && data.decks[card.deckId] && <span>{data.decks[card.deckId].name}</span>}
          </div>
          <button className="flashcard" onClick={() => !shown && setShownKey(cardKey)} disabled={shown}>
            <span className="flashcard-front">{card.front}</span>
            {shown && (
              <>
                <span className="flashcard-rule" />
                <span className="flashcard-back">{card.back}</span>
              </>
            )}
          </button>
          <div className="review-actions">
            {!shown ? (
              <button className="btn btn-primary btn-big" onClick={() => setShownKey(cardKey)}>
                Show answer
              </button>
            ) : (
              <div className="grades">
                {GRADES.map(({ grade, label, key }) => (
                  <button key={grade} className={`grade grade-${label.toLowerCase()}`} onClick={() => answer(grade)}>
                    <span className="grade-label">{label}</span>
                    <span className="grade-when">{labels?.[grade]}</span>
                    <kbd className="grade-key">{key}</kbd>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="review-done">
          <h1 className="title">All done</h1>
          <p className="muted">
            {reviewed ? `You reviewed ${plural(reviewed, 'card')}. ` : ''}
            {q.nextDue ? `Next card due ${whenLabel(q.nextDue, now)}.` : ''}
          </p>
          <button className="btn btn-primary btn-big" onClick={finish}>
            Back
          </button>
        </div>
      )}
    </div>
  )
}
