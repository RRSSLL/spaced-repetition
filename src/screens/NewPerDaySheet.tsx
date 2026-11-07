import { useNav } from '../App'
import { updateSettings, useData } from '../store'
import { newLeftToday } from '../srs'

const CHOICES = [0, 5, 10, 15, 20, 30, 50]

export default function NewPerDaySheet() {
  const data = useData()
  const { close } = useNav()
  const current = data.settings.newPerDay
  const left = newLeftToday(data)

  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="New cards per day">
        <h2 className="sheet-title">New cards per day</h2>
        <p className="muted small">
          How many never-seen cards to introduce each day. Reviews of cards you've already seen are never capped.
        </p>
        <div className="chips">
          {CHOICES.map((n) => (
            <button
              key={n}
              className={`chip ${n === current ? 'is-active' : ''}`}
              onClick={() => {
                updateSettings({ newPerDay: n })
                close()
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="muted small">{left} new left today.</p>
      </div>
    </div>
  )
}
