import { useRef, useState } from 'react'
import { useNav } from '../App'
import { getState, importData, updateSettings, useData } from '../store'
import { getConfig, setConfig, syncNow, testConfig, useSyncStatus } from '../sync'
import type { AppData } from '../types'
import { shortDate, shortTime } from '../util'

export default function Settings() {
  const data = useData()
  const { open } = useNav()
  const [name, setName] = useState(data.settings.name)

  return (
    <div className="screen">
      <h1 className="title">Settings</h1>

      <section className="panel">
        <h2 className="panel-title">You</h2>
        <label className="field">
          <span className="field-label">Name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name.trim() !== data.settings.name && updateSettings({ name: name.trim() })}
          />
        </label>
        <button className="setting-row" onClick={() => open({ kind: 'newPerDay' })}>
          <span>New cards per day</span>
          <strong>{data.settings.newPerDay}</strong>
        </button>
      </section>

      <SyncPanel />
      <BackupPanel />

      <p className="muted small center">
        Scheduling uses FSRS. Your cards live on this device{getConfig() ? ' and in your GitHub repo' : ''}.
      </p>
    </div>
  )
}

function SyncPanel() {
  const status = useSyncStatus()
  const saved = getConfig()
  const [editing, setEditing] = useState(!saved)
  const [repo, setRepo] = useState(saved?.repo ?? '')
  const [token, setToken] = useState('')
  const [path, setPath] = useState(saved?.path ?? 'cards.json')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async (e: React.FormEvent) => {
    e.preventDefault()
    const cfg = {
      repo: repo
        .trim()
        .replace(/^https?:\/\/github\.com\//, '')
        .replace(/\.git$/, '')
        .replace(/\/$/, ''),
      token: token.trim() || saved?.token || '',
      path: path.trim().replace(/^\//, '') || 'cards.json',
    }
    if (!/^[\w.-]+\/[\w.-]+$/.test(cfg.repo)) return setError('Repository should look like your-name/flashcards-data')
    if (!cfg.token) return setError('Paste your token')
    setBusy(true)
    setError(null)
    const err = await testConfig(cfg)
    setBusy(false)
    if (err) return setError(err)
    setConfig(cfg)
    setToken('')
    setEditing(false)
    syncNow()
  }

  const disconnect = () => {
    if (confirm('Stop syncing on this device? Your cards stay here and on GitHub.')) {
      setConfig(null)
      setEditing(true)
    }
  }

  let statusText = ''
  if (status.kind === 'syncing') statusText = 'Syncing…'
  else if (status.kind === 'error') statusText = status.message
  else if (status.kind === 'idle')
    statusText = status.lastSynced
      ? `Last synced ${shortDate(status.lastSynced)} at ${shortTime(status.lastSynced)}${status.pending ? ' · changes waiting' : ''}`
      : 'Not synced yet'

  return (
    <section className="panel">
      <h2 className="panel-title">Sync with GitHub</h2>
      {saved && !editing ? (
        <>
          <p className="small">
            Syncing to <strong>{saved.repo}</strong> / {saved.path}
          </p>
          <p className={`small ${status.kind === 'error' ? 'error' : 'muted'}`}>{statusText}</p>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => syncNow()} disabled={status.kind === 'syncing'}>
              Sync now
            </button>
            <button className="btn" onClick={() => setEditing(true)}>
              Change
            </button>
            <button className="btn btn-ghost" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={connect}>
          <ol className="steps small">
            <li>
              <a href="https://github.com/new" target="_blank" rel="noreferrer">
                Create a private repo
              </a>{' '}
              to hold your cards, e.g. <code>flashcards-data</code>. Tick “Add a README” so it isn't empty.
            </li>
            <li>
              <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
                Make a fine-grained token
              </a>
              : under Repository access pick <em>Only select repositories</em> → that repo; under Permissions →
              Repository → <em>Contents</em>, choose <em>Read and write</em>. Pick a long expiry.
            </li>
            <li>Paste both below. Do this once on each device.</li>
          </ol>
          <label className="field">
            <span className="field-label">Repository</span>
            <input
              className="input"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="your-name/flashcards-data"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span className="field-label">Token</span>
            <input
              className="input"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={saved ? 'Leave blank to keep current token' : 'github_pat_…'}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span className="field-label">File in repo</span>
            <input
              className="input"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          {error && <p className="small error">{error}</p>}
          <div className="btn-row">
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Checking…' : 'Connect & sync'}
            </button>
            {saved && (
              <button type="button" className="btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
          </div>
          <p className="muted small">
            The token is stored only on this device and is sent only to api.github.com.
          </p>
        </form>
      )}
    </section>
  )
}

function BackupPanel() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `flashcards-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppData
      if (parsed?.version !== 1 || typeof parsed.cards !== 'object') throw new Error()
      importData(parsed)
      setMsg(`Imported ${Object.keys(parsed.cards).length} cards (merged with what's here).`)
    } catch {
      setMsg("That file doesn't look like a flashcards export.")
    }
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Backup</h2>
      <div className="btn-row">
        <button className="btn" onClick={exportJson}>
          Export JSON
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) importJson(f)
            e.target.value = ''
          }}
        />
      </div>
      {msg && <p className="muted small">{msg}</p>}
    </section>
  )
}
