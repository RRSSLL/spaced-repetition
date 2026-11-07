import { useState } from 'react'
import { useNav } from '../App'
import { deleteDeck, updateDeck, useData } from '../store'
import { isNew, liveCards, queueInfo } from '../srs'
import { BackIcon, PencilIcon, PlayIcon, PlusIcon } from '../icons'
import { plural, useNow, whenLabel } from '../util'

export default function DeckDetail({ deckId }: { deckId: string }) {
  const data = useData()
  const now = useNow()
  const { open, close } = useNav()
  const deck = data.decks[deckId]
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(deck?.name ?? '')

  if (!deck || deck.deleted) {
    return (
      <div className="overlay">
        <div className="overlay-bar">
          <button className="icon-btn" onClick={close} aria-label="Back">
            <BackIcon />
          </button>
        </div>
        <p className="empty-note pad">This deck was deleted.</p>
      </div>
    )
  }

  const cards = liveCards(data, deckId).sort((a, b) => b.createdAt - a.createdAt)
  const q = queueInfo(data, deckId, now)
  const todo = q.dueNow.length + q.fresh.length + q.learningSoon.length

  const saveName = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) updateDeck(deckId, { name: name.trim() })
    setRenaming(false)
  }

  const remove = () => {
    if (confirm(`Delete "${deck.name}" and its ${plural(cards.length, 'card')}?`)) {
      deleteDeck(deckId)
      close()
    }
  }

  return (
    <div className="overlay">
      <div className="overlay-bar">
        <button className="icon-btn" onClick={close} aria-label="Back">
          <BackIcon />
        </button>
        <span className="overlay-bar-title">Deck</span>
        <span className="icon-btn-spacer" />
      </div>
      <div className="overlay-body">
        {renaming ? (
          <form className="inline-form" onSubmit={saveName}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button className="btn btn-primary">Save</button>
          </form>
        ) : (
          <div className="deck-head">
            <h1 className="title title-sm">{deck.name}</h1>
            <button className="icon-btn" onClick={() => setRenaming(true)} aria-label="Rename deck">
              <PencilIcon />
            </button>
          </div>
        )}
        <p className="muted deck-stats">
          {plural(cards.length, 'card')} · {q.dueNow.length} due · {q.newTotal} new
        </p>

        <div className="btn-row">
          <button className="btn btn-primary" disabled={!todo} onClick={() => open({ kind: 'review', deckId })}>
            <PlayIcon size={18} /> {todo ? `Review ${todo}` : 'Nothing due'}
          </button>
          <button className="btn" onClick={() => open({ kind: 'editor', deckId })}>
            <PlusIcon size={18} /> Add card
          </button>
        </div>

        <h2 className="section-label">Cards</h2>
        {cards.length === 0 ? (
          <p className="empty-note">No cards in this deck yet.</p>
        ) : (
          <ul className="list">
            {cards.map((c) => {
              const due = Date.parse(c.srs.due)
              const label = isNew(c) ? 'New' : due <= now.getTime() ? 'Due' : whenLabel(due, now)
              return (
                <li key={c.id}>
                  <button className="row row-card" onClick={() => open({ kind: 'editor', cardId: c.id })}>
                    <span className="row-main">
                      <span className="row-title clamp">{c.front}</span>
                      <span className="row-sub clamp">{c.back}</span>
                    </span>
                    <span className="row-meta">
                      <span>{label}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <button className="btn btn-danger" onClick={remove}>
          Delete deck
        </button>
      </div>
    </div>
  )
}
