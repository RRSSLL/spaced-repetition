import { createContext, useContext, useState } from 'react'
import { useData } from './store'
import { syncNow, useSyncStatus } from './sync'
import { BoxIcon, CardsIcon, GearIcon, PlusIcon, SyncIcon } from './icons'
import { shortDate, shortTime } from './util'
import Today from './screens/Today'
import Decks from './screens/Decks'
import DeckDetail from './screens/DeckDetail'
import CardEditor from './screens/CardEditor'
import Review from './screens/Review'
import Settings from './screens/Settings'
import NewPerDaySheet from './screens/NewPerDaySheet'

export type Tab = 'today' | 'decks' | 'settings'

export type Overlay =
  | { kind: 'review'; deckId?: string }
  | { kind: 'editor'; cardId?: string; deckId?: string }
  | { kind: 'deck'; deckId: string }
  | { kind: 'newPerDay' }

interface Nav {
  open: (o: Overlay) => void
  close: () => void
  setTab: (t: Tab) => void
}

const NavContext = createContext<Nav>(null!)
export const useNav = () => useContext(NavContext)

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [stack, setStack] = useState<Overlay[]>([])
  const nav: Nav = {
    open: (o) => setStack((s) => [...s, o]),
    close: () => setStack((s) => s.slice(0, -1)),
    setTab: (t) => {
      setStack([])
      setTab(t)
    },
  }

  return (
    <NavContext.Provider value={nav}>
      <div className="app">
        <Header />
        <main className="main">
          {tab === 'today' && <Today />}
          {tab === 'decks' && <Decks />}
          {tab === 'settings' && <Settings />}
        </main>
        <TabBar tab={tab} setTab={nav.setTab} />
        {stack.map((o, i) => (
          <OverlayView key={i} overlay={o} />
        ))}
      </div>
    </NavContext.Provider>
  )
}

function OverlayView({ overlay: o }: { overlay: Overlay }) {
  switch (o.kind) {
    case 'review':
      return <Review deckId={o.deckId} />
    case 'editor':
      return <CardEditor cardId={o.cardId} deckId={o.deckId} />
    case 'deck':
      return <DeckDetail deckId={o.deckId} />
    case 'newPerDay':
      return <NewPerDaySheet />
  }
}

function Header() {
  const data = useData()
  const { open, setTab } = useNav()
  const sync = useSyncStatus()

  let line: React.ReactNode
  if (sync.kind === 'off') line = 'Sync off · set up'
  else if (sync.kind === 'syncing') line = 'Syncing…'
  else if (sync.kind === 'error') line = 'Sync failed · tap to retry'
  else if (sync.lastSynced) {
    const now = new Date()
    const day = shortDate(sync.lastSynced, now)
    line = `Synced ${day === 'Today' ? shortTime(sync.lastSynced) : day}`
  } else line = 'Not synced yet'

  return (
    <header className="top">
      <div className="top-band" />
      <div className="top-row">
        <div className="who">
          <div className="who-name">{data.settings.name || 'Me'}</div>
          <button
            className={`who-sync ${sync.kind === 'error' ? 'is-error' : ''} ${sync.kind === 'syncing' ? 'is-busy' : ''}`}
            onClick={() => (sync.kind === 'off' ? setTab('settings') : syncNow())}
            title={sync.kind === 'error' ? sync.message : undefined}
          >
            {line}
            {sync.kind !== 'off' && <SyncIcon size={17} strokeWidth={2.4} />}
          </button>
        </div>
        <div className="tab-wrap">
          <button className="add-tab" onClick={() => open({ kind: 'editor' })}>
            <PlusIcon size={26} strokeWidth={2.4} />
            <span>Card</span>
          </button>
        </div>
      </div>
    </header>
  )
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const item = (t: Tab, label: string, icon: React.ReactNode) => (
    <button className={`tabbar-item ${tab === t ? 'is-active' : ''}`} onClick={() => setTab(t)}>
      {icon}
      <span>{label}</span>
    </button>
  )
  return (
    <nav className="tabbar">
      {item('today', 'Review', <CardsIcon size={34} />)}
      {item('decks', 'Decks', <BoxIcon size={34} />)}
      {item('settings', 'Settings', <GearIcon size={34} />)}
    </nav>
  )
}
