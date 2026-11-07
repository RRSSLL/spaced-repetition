import { useRef, useState } from 'react'
import { useNav } from '../App'
import { addCard, addDeck, liveDecks, updateCard, useData } from '../store'
import { CloseIcon } from '../icons'

const NEW_DECK = '__new__'

export default function CardEditor({ cardId, deckId }: { cardId?: string; deckId?: string }) {
  const data = useData()
  const { close } = useNav()
  const existing = cardId ? data.cards[cardId] : undefined
  const decks = liveDecks(data)

  const [deck, setDeck] = useState(
    existing?.deckId ?? deckId ?? localStorage.getItem('sr.lastDeck') ?? decks[0]?.id ?? NEW_DECK,
  )
  const validDeck = deck === NEW_DECK || decks.some((d) => d.id === deck) ? deck : (decks[0]?.id ?? NEW_DECK)
  const [newDeckName, setNewDeckName] = useState('')
  const [front, setFront] = useState(existing?.front ?? '')
  const [back, setBack] = useState(existing?.back ?? '')
  const [savedCount, setSavedCount] = useState(0)
  const frontRef = useRef<HTMLTextAreaElement>(null)

  const canSave = front.trim() && back.trim() && (validDeck !== NEW_DECK || newDeckName.trim())

  const save = (another: boolean) => {
    if (!canSave) return
    let targetDeck = validDeck
    if (targetDeck === NEW_DECK) {
      targetDeck = addDeck(newDeckName.trim())
      setDeck(targetDeck)
      setNewDeckName('')
    }
    localStorage.setItem('sr.lastDeck', targetDeck)
    if (existing) updateCard(existing.id, { front: front.trim(), back: back.trim(), deckId: targetDeck })
    else addCard(targetDeck, front.trim(), back.trim())
    if (another) {
      setFront('')
      setBack('')
      setSavedCount((n) => n + 1)
      frontRef.current?.focus()
    } else close()
  }

  const remove = () => {
    if (existing && confirm('Delete this card?')) {
      updateCard(existing.id, { deleted: true })
      close()
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      save(!existing)
    }
    if (e.key === 'Escape') close()
  }

  return (
    <div className="overlay" onKeyDown={onKey}>
      <div className="overlay-bar">
        <button className="icon-btn" onClick={close} aria-label="Close">
          <CloseIcon />
        </button>
        <span className="overlay-bar-title">{existing ? 'Edit card' : 'New card'}</span>
        <button className="text-btn" disabled={!canSave} onClick={() => save(false)}>
          {existing ? 'Save' : 'Done'}
        </button>
      </div>
      <div className="overlay-body">
        <label className="field">
          <span className="field-label">Deck</span>
          <select className="input" value={validDeck} onChange={(e) => setDeck(e.target.value)}>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
            <option value={NEW_DECK}>+ New deck…</option>
          </select>
        </label>
        {validDeck === NEW_DECK && (
          <label className="field">
            <span className="field-label">New deck name</span>
            <input
              className="input"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="e.g. Spanish verbs"
            />
          </label>
        )}
        <label className="field">
          <span className="field-label">Front</span>
          <textarea
            ref={frontRef}
            className="input textarea"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Question or prompt"
            autoFocus={!existing}
            rows={3}
          />
        </label>
        <label className="field">
          <span className="field-label">Back</span>
          <textarea
            className="input textarea"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Answer"
            rows={3}
          />
        </label>

        {existing ? (
          <div className="btn-row">
            <button className="btn btn-primary" disabled={!canSave} onClick={() => save(false)}>
              Save
            </button>
            <button className="btn btn-danger" onClick={remove}>
              Delete
            </button>
          </div>
        ) : (
          <>
            <div className="btn-row">
              <button className="btn btn-primary" disabled={!canSave} onClick={() => save(true)}>
                Save &amp; add another
              </button>
            </div>
            <p className="muted small">
              {savedCount > 0 ? `${savedCount} added. ` : ''}Tip: on a computer, ⌘/Ctrl + Enter saves.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
