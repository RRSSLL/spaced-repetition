import { useState } from 'react'
import { addDeck, liveDecks, useData } from '../store'
import { useNow } from '../util'
import DeckRow from './DeckRow'

export default function Decks() {
  const data = useData()
  const now = useNow()
  const decks = liveDecks(data)
  const [name, setName] = useState('')

  const create = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    addDeck(name.trim())
    setName('')
  }

  return (
    <div className="screen">
      <h1 className="title">Decks</h1>
      <form className="inline-form" onSubmit={create}>
        <input
          className="input"
          placeholder="New deck name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="New deck name"
        />
        <button className="btn btn-primary" disabled={!name.trim()}>
          Add
        </button>
      </form>
      {decks.length === 0 ? (
        <p className="empty-note">No decks yet. Name one above, or just tap + Card and make one there.</p>
      ) : (
        <ul className="list">
          {decks.map((d) => (
            <DeckRow key={d.id} deck={d} now={now} mode="decks" />
          ))}
        </ul>
      )}
    </div>
  )
}
