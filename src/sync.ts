// Syncs the whole data set to a single JSON file in a GitHub repository,
// using GitHub's REST "contents" API straight from the browser.
// Every sync that changes something becomes a commit, so the repo's history
// doubles as a backup.

import { useSyncExternalStore } from 'react'
import type { AppData } from './types'
import { getState, mergeData, onLocalChange, setState } from './store'

export interface SyncConfig {
  repo: string // "owner/name"
  token: string // fine-grained personal access token
  path: string // file inside the repo, e.g. "cards.json"
}

export type SyncStatus =
  | { kind: 'off' }
  | { kind: 'idle'; lastSynced?: number; pending: boolean }
  | { kind: 'syncing'; lastSynced?: number }
  | { kind: 'error'; message: string; lastSynced?: number }

const CONFIG_KEY = 'sr.sync.config'
const LAST_KEY = 'sr.sync.last'
const DIRTY_KEY = 'sr.sync.dirty'
const DEBOUNCE_MS = 8000

// ---------- config (stays on this device only) ----------

export function getConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? (JSON.parse(raw) as SyncConfig) : null
  } catch {
    return null
  }
}

export function setConfig(cfg: SyncConfig | null) {
  if (cfg) localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
  else localStorage.removeItem(CONFIG_KEY)
  refreshStatus()
}

// ---------- status store ----------

const lsNum = (k: string) => {
  const v = Number(localStorage.getItem(k))
  return v > 0 ? v : undefined
}
const isDirty = () => localStorage.getItem(DIRTY_KEY) === '1'

let status: SyncStatus = { kind: 'off' }
const listeners = new Set<() => void>()
function setStatus(s: SyncStatus) {
  status = s
  listeners.forEach((l) => l())
}
function refreshStatus() {
  if (!getConfig()) setStatus({ kind: 'off' })
  else if (status.kind !== 'syncing') setStatus({ kind: 'idle', lastSynced: lsNum(LAST_KEY), pending: isDirty() })
}
export const useSyncStatus = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )

// ---------- GitHub API ----------

function b64encode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function b64decode(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

class SyncError extends Error {}

async function gh(cfg: SyncConfig, path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`https://api.github.com/repos/${cfg.repo}/${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
  } catch {
    throw new SyncError(navigator.onLine ? "Couldn't reach GitHub" : "You're offline")
  }
}

async function failure(cfg: SyncConfig, res: Response): Promise<SyncError> {
  if (res.status === 401) return new SyncError('GitHub rejected the token (expired or mistyped?)')
  if (res.status === 403) {
    if (res.headers.get('x-ratelimit-remaining') === '0') return new SyncError('GitHub rate limit hit; try again later')
    return new SyncError('Token lacks permission. It needs Contents: Read and write on this repo')
  }
  if (res.status === 404) {
    const repo = await gh(cfg, '')
    if (repo.status === 404) return new SyncError(`Can't see repo "${cfg.repo}". Check the name and the token's repo access`)
  }
  let msg = ''
  try {
    msg = (await res.json()).message
  } catch {
    /* ignore */
  }
  return new SyncError(`GitHub error ${res.status}${msg ? `: ${msg}` : ''}`)
}

const contentsPath = (cfg: SyncConfig) => `contents/${cfg.path.split('/').map(encodeURIComponent).join('/')}`

async function readRemote(cfg: SyncConfig): Promise<{ sha: string | null; data: AppData | null }> {
  const res = await gh(cfg, contentsPath(cfg))
  if (res.status === 404) {
    const repo = await gh(cfg, '')
    if (repo.ok) return { sha: null, data: null } // repo fine, file not created yet
  }
  if (!res.ok) throw await failure(cfg, res)
  const file = await res.json()
  if (Array.isArray(file)) throw new SyncError(`"${cfg.path}" is a folder, not a file`)
  if (!file.size) return { sha: file.sha, data: null }
  let text: string
  if (file.encoding === 'base64' && file.content) {
    text = b64decode(file.content)
  } else {
    // Files over 1 MB come back without content; fetch the blob instead.
    const blob = await gh(cfg, `git/blobs/${file.sha}`)
    if (!blob.ok) throw await failure(cfg, blob)
    text = b64decode((await blob.json()).content)
  }
  let data: AppData
  try {
    data = JSON.parse(text)
  } catch {
    throw new SyncError(`"${cfg.path}" isn't valid JSON. Fix or delete it on GitHub`)
  }
  if (data?.version !== 1) throw new SyncError(`"${cfg.path}" doesn't look like flashcard data`)
  return { sha: file.sha, data }
}

/** Returns false if someone else wrote first (caller should re-read and retry). */
async function writeRemote(cfg: SyncConfig, data: AppData, sha: string | null): Promise<boolean> {
  const res = await gh(cfg, contentsPath(cfg), {
    method: 'PUT',
    body: JSON.stringify({
      message: `Sync from ${deviceName()}`,
      content: b64encode(JSON.stringify(data, null, 1) + '\n'),
      ...(sha ? { sha } : {}),
    }),
  })
  if (res.status === 409 || res.status === 422) return false
  if (!res.ok) throw await failure(cfg, res)
  return true
}

function deviceName(): string {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) return 'Android'
  if (/Mac/.test(ua)) return navigator.maxTouchPoints > 1 ? 'iPad' : 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'browser'
}

// ---------- sync loop ----------

let localVersion = 0
let inflight: Promise<void> | null = null
let again = false
let timer: number | undefined

async function runSync(cfg: SyncConfig) {
  const startVersion = localVersion
  for (let attempt = 0; attempt < 4; attempt++) {
    const remote = await readRemote(cfg)
    const { data, changed } = remote.data ? mergeData(getState(), remote.data) : { data: getState(), changed: true }
    if (changed && !(await writeRemote(cfg, data, remote.sha))) continue
    // Fold in anything edited while we were talking to GitHub.
    setState(mergeData(getState(), data).data, { fromSync: true })
    if (localVersion === startVersion) localStorage.removeItem(DIRTY_KEY)
    else again = true
    localStorage.setItem(LAST_KEY, String(Date.now()))
    return
  }
  throw new SyncError('Kept colliding with another device; will retry')
}

export function syncNow(): Promise<void> {
  clearTimeout(timer)
  const cfg = getConfig()
  if (!cfg) return Promise.resolve()
  if (inflight) {
    again = true
    return inflight
  }
  setStatus({ kind: 'syncing', lastSynced: lsNum(LAST_KEY) })
  inflight = runSync(cfg)
    .then(() => setStatus({ kind: 'idle', lastSynced: lsNum(LAST_KEY), pending: isDirty() }))
    .catch((e) => {
      console.error(e)
      setStatus({
        kind: 'error',
        message: e instanceof SyncError ? e.message : 'Sync failed',
        lastSynced: lsNum(LAST_KEY),
      })
    })
    .finally(() => {
      inflight = null
      if (again) {
        again = false
        scheduleSync(1000)
      }
    })
  return inflight
}

function scheduleSync(delay = DEBOUNCE_MS) {
  clearTimeout(timer)
  if (getConfig()) timer = window.setTimeout(syncNow, delay)
}

/** Tests a config without saving it. Returns an error message, or null if OK. */
export async function testConfig(cfg: SyncConfig): Promise<string | null> {
  try {
    await readRemote(cfg)
    return null
  } catch (e) {
    return e instanceof SyncError ? e.message : 'Something went wrong'
  }
}

export function startSync() {
  onLocalChange(() => {
    localVersion++
    localStorage.setItem(DIRTY_KEY, '1')
    refreshStatus()
    scheduleSync()
  })
  refreshStatus()
  syncNow()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const last = lsNum(LAST_KEY) ?? 0
      if (Date.now() - last > 5_000 || isDirty()) syncNow()
    } else if (isDirty()) {
      syncNow() // best effort before the app is backgrounded
    }
  })
  window.addEventListener('online', () => syncNow())
}
