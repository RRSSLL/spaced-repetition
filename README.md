# Flashcards

A spaced-repetition flashcard app for phone and computer. It's an installable
web app (PWA): it works offline and keeps your cards on the device. It can
also sync them to a JSON file in a private GitHub repo that you own.

- **Scheduling:** [FSRS](https://github.com/open-spaced-repetition/ts-fsrs), via `ts-fsrs`
- **Storage:** IndexedDB on each device
- **Sync:** GitHub's REST API, called straight from the browser. Each sync that
  changes something is a commit, so the repo history doubles as a backup.
  With no server in between, the app talks only to `api.github.com`.

## Run it locally

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Put it online (GitHub Pages)

1. Merge to `main`. The workflow in `.github/workflows/deploy.yml` builds and deploys.
2. Once, in this repo's **Settings → Pages**, set *Source* to **GitHub Actions**.
3. The app appears at `https://<your-username>.github.io/spaced-repetition/`.

GitHub Pages needs this repo to be public (or a paid plan). That's fine: only
the app's code lives here. Your cards live in a separate **private** repo.

## Install on your phone

Open the Pages URL in Safari, tap **Share → Add to Home Screen**. On a computer,
Chrome/Edge show an install icon in the address bar, or just bookmark it.

## Set up sync

1. Create a **private** repo for your data, e.g. `flashcards-data` (tick "Add a README").
2. Create a [fine-grained token](https://github.com/settings/personal-access-tokens/new):
   - Repository access → *Only select repositories* → `flashcards-data`
   - Permissions → Repository → **Contents: Read and write**
3. In the app: **Settings → Sync with GitHub**, enter `your-name/flashcards-data`
   and the token. Do this on each device.

The app syncs when it opens, when you come back to it, a few seconds after
you edit, and when you finish a review session. If two devices change things at
the same time, each card keeps its most recent version.

## Keyboard shortcuts (review)

`Space`/`Enter` show the answer · `1`–`4` Again/Hard/Good/Easy · `Space` again = Good · `Z` undo · `Esc` close

## Code map

| File | What it does |
|---|---|
| `src/types.ts` | Data shape (decks, cards, settings) |
| `src/srs.ts` | FSRS wrapper, due queues, interval labels |
| `src/store.ts` | Local state, IndexedDB persistence, merge logic, actions |
| `src/sync.ts` | GitHub sync |
| `src/screens/*` | Today, Decks, Deck detail, Card editor, Review, Settings |
| `src/index.css` | All styling (colors are CSS variables at the top) |
