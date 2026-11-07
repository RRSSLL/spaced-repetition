import { useNav } from '../App'
import { liveDecks, useData } from '../store'
import { liveCards, newLeftToday, queueInfo } from '../srs'
import { PlayIcon, PlusIcon } from '../icons'
import { plural, useNow, whenLabel } from '../util'
import DeckRow from './DeckRow'

export default function Today() {
  const data = useData()
  const now = useNow()
  const { open } = useNav()
  const q = queueInfo(data, undefined, now)
  const decks = liveDecks(data)
  const total = liveCards(data).length
  const count = q.dueNow.length + q.fresh.length + q.learningSoon.length

  let title: string
  let sub: string
  let tone: 'due' | 'done' | 'empty'
  if (total === 0) {
    tone = 'empty'
    title = 'No cards yet'
    sub = 'Tap + Card to write your first one'
  } else if (count > 0) {
    tone = 'due'
    title = `${count} due`
    const parts = []
    const reviews = q.dueNow.length + q.learningSoon.length
    if (reviews) parts.push(plural(reviews, 'review'))
    if (q.fresh.length) parts.push(`${q.fresh.length} new`)
    parts.push(`~${Math.max(1, Math.round((count * 8) / 60))} min`)
    sub = parts.join(' · ')
  } else {
    tone = 'done'
    title = 'All done'
    if (q.newTotal > 0 && newLeftToday(data, now) === 0)
      sub = `New-card limit reached${q.nextDue ? ` · next review ${whenLabel(q.nextDue, now)}` : ''}`
    else sub = q.nextDue ? `Next card due ${whenLabel(q.nextDue, now)}` : 'Add more cards anytime'
  }

  return (
    <div className="screen">
      <h1 className="title">Today</h1>

      <section className="status">
        <button
          className="status-main"
          onClick={() => (tone === 'due' ? open({ kind: 'review' }) : tone === 'empty' ? open({ kind: 'editor' }) : null)}
          disabled={tone === 'done'}
        >
          <span className={`status-bar tone-${tone}`} />
          <span className="status-text">
            <span className="status-title">{title}</span>
            <span className="status-sub">{sub}</span>
          </span>
          {tone === 'due' && <PlayIcon className="status-icon" size={30} />}
          {tone === 'empty' && <PlusIcon className="status-icon" size={30} />}
        </button>
        <button className="status-strip" onClick={() => open({ kind: 'newPerDay' })}>
          <span>New cards: {data.settings.newPerDay}/day</span>
          <span className="muted">Tap to change</span>
        </button>
      </section>

      <h2 className="section-label">Your decks</h2>
      {decks.length === 0 ? (
        <p className="empty-note">Decks you create will show up here.</p>
      ) : (
        <ul className="list">
          {decks.map((d) => (
            <DeckRow key={d.id} deck={d} now={now} mode="today" />
          ))}
        </ul>
      )}
    </div>
  )
}
