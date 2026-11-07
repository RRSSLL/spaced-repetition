import { useNav } from '../App'
import { useData } from '../store'
import { lastReviewed, liveCards, queueInfo } from '../srs'
import type { Deck } from '../types'
import { CardsIcon, CheckIcon, DueIcon, SparkIcon } from '../icons'
import { plural, shortDate } from '../util'

export default function DeckRow({ deck, now, mode }: { deck: Deck; now: Date; mode: 'today' | 'decks' }) {
  const data = useData()
  const { open } = useNav()
  const q = queueInfo(data, deck.id, now)
  const total = liveCards(data, deck.id).length
  const due = q.dueNow.length + q.learningSoon.length
  const last = lastReviewed(data, deck.id)

  let status: React.ReactNode
  if (due) status = <><DueIcon size={18} /> {due} due{q.fresh.length ? ` · ${q.fresh.length} new` : ''}</>
  else if (q.fresh.length) status = <><SparkIcon size={18} /> {q.fresh.length} new</>
  else if (total === 0) status = 'Empty'
  else status = <><CheckIcon size={18} /> Caught up</>

  const hasWork = due + q.fresh.length > 0
  const onClick = () =>
    mode === 'today' && hasWork ? open({ kind: 'review', deckId: deck.id }) : open({ kind: 'deck', deckId: deck.id })

  return (
    <li>
      <button className="row" onClick={onClick}>
        <span className={`badge ${hasWork ? '' : 'is-quiet'}`}>
          <CardsIcon size={30} />
        </span>
        <span className="row-main">
          <span className="row-title">{deck.name}</span>
          <span className={`row-sub ${due ? 'is-due' : ''}`}>{status}</span>
        </span>
        <span className="row-meta">
          <span>{last ? shortDate(last, now) : 'Never'}</span>
          <span>{plural(total, 'card')}</span>
        </span>
      </button>
    </li>
  )
}
