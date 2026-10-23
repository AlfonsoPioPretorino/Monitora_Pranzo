import { useCallback, useEffect, useState } from 'react'
import { sanitizeLunches } from './storage'

/** Percorso del file dati nel repository, sul branch main: è l'unica fonte dei dati pubblicati */
export const DATA_PATH = 'public/data/lunches.json'
const REPO = import.meta.env.VITE_GITHUB_REPO

// Online i dati si leggono direttamente da main: un pranzo pubblicato dall'admin è visibile
// senza ricompilare il sito, e un deploy non può sovrascriverlo con una copia locale vecchia.
// In sviluppo (nessun repository configurato) si usa il file locale.
const DATA_URLS = [
  REPO && `https://raw.githubusercontent.com/${REPO}/main/${DATA_PATH}`,
  `${import.meta.env.BASE_URL}data/lunches.json`,
].filter(Boolean)

/** JSON canonico (date in ordine decrescente): stesso contenuto ⇒ stessa stringa, diff puliti su GitHub */
export function serializeLunches(lunches) {
  const sorted = Object.fromEntries(Object.keys(lunches).sort().reverse().map((d) => [d, lunches[d]]))
  return JSON.stringify({ version: 1, lunches: sorted }, null, 2) + '\n'
}

/** Pranzi pubblicati sul sito, letti dal file statico */
export function usePublishedLunches() {
  const [state, setState] = useState({ status: 'loading', lunches: null })

  const reload = useCallback(async () => {
    for (const url of DATA_URLS) {
      try {
        const res = await fetch(url, { cache: 'no-cache' })
        if (!res.ok) continue
        return setState({ status: 'ready', lunches: sanitizeLunches(await res.json()) })
      } catch {
        /* prova la fonte successiva */
      }
    }
    setState({ status: 'error', lunches: null })
  }, [])

  useEffect(() => { reload() }, [reload])

  // Dopo una pubblicazione il sito impiega qualche minuto ad aggiornarsi: intanto usiamo i dati appena inviati
  const setPublished = useCallback((lunches) => setState({ status: 'ready', lunches }), [])

  return { ...state, reload, setPublished }
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** Scrive il file dati nel repository tramite l'API di GitHub (richiede un token con permesso Contents: write) */
export async function publishToGitHub({ token, repo, branch, lunches }) {
  const api = `https://api.github.com/repos/${repo}/contents/${DATA_PATH}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const cur = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers, cache: 'no-store' })
  if (!cur.ok && cur.status !== 404) throw new Error(githubError(cur.status))
  const sha = cur.ok ? (await cur.json()).sha : undefined

  const res = await fetch(api, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `Aggiorna pranzi (${Object.keys(lunches).length})`,
      content: toBase64(serializeLunches(lunches)),
      branch,
      ...(sha && { sha }),
    }),
  })
  if (!res.ok) throw new Error(githubError(res.status))
}

function githubError(status) {
  if (status === 401) return 'Token non valido o scaduto.'
  if (status === 403) return 'Il token non ha il permesso di scrivere nel repository.'
  if (status === 404) return 'Repository o branch non trovato (o token senza accesso).'
  if (status === 409) return 'Conflitto: il file è cambiato nel frattempo, riprova.'
  return `Errore GitHub (${status}).`
}
