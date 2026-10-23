import { useState } from 'react'
import { publishToGitHub } from '../lib/published'

const SETTINGS_KEY = 'monitora-pranzo:github'

function loadSettings() {
  const defaults = { repo: import.meta.env.VITE_GITHUB_REPO ?? '', branch: 'main', token: '' }
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
  } catch {
    return defaults
  }
}

/** Date aggiunte, modificate o rimosse rispetto ai dati pubblicati */
function countChanges(local, published) {
  const dates = new Set([...Object.keys(local), ...Object.keys(published)])
  let n = 0
  for (const d of dates) if (JSON.stringify(local[d]) !== JSON.stringify(published[d])) n++
  return n
}

export default function PublishPanel({ lunches, published, onPublished, onDiscard }) {
  const [settings, setSettings] = useState(loadSettings)
  const [showSettings, setShowSettings] = useState(() => !loadSettings().token)
  const [status, setStatus] = useState({ busy: false, msg: '' })

  const changes = published.lunches ? countChanges(lunches, published.lunches) : 0
  const ready = settings.repo.includes('/') && settings.token

  function update(field, value) {
    const next = { ...settings, [field]: value.trim() }
    setSettings(next)
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* solo per questa sessione */ }
  }

  async function publish() {
    setStatus({ busy: true, msg: 'Pubblicazione in corso…' })
    try {
      await publishToGitHub({ ...settings, lunches })
      onPublished(lunches)
      setStatus({ busy: false, msg: 'Pubblicato ✓ Il sito mostra i nuovi dati entro qualche minuto.' })
    } catch (e) {
      setStatus({ busy: false, msg: e.message })
    }
  }

  return (
    <section className="card">
      <h2>Pubblicazione</h2>
      {published.status === 'error' && <p className="badge info">Impossibile leggere i dati pubblicati: la prima pubblicazione creerà il file.</p>}
      <p className="muted">
        Le modifiche restano in questo browser finché non le pubblichi.{' '}
        {changes > 0
          ? <strong>{changes === 1 ? '1 giorno modificato' : `${changes} giorni modificati`} non ancora pubblicati.</strong>
          : 'Nessuna modifica da pubblicare.'}
      </p>
      <div className="actions left">
        <button className="btn primary" onClick={publish} disabled={!ready || status.busy || (changes === 0 && published.status === 'ready')}>Pubblica sul sito</button>
        <button className="btn ghost" onClick={onDiscard} disabled={!published.lunches || changes === 0 || status.busy}>Annulla modifiche</button>
        <button className="btn ghost" onClick={() => setShowSettings((s) => !s)}>{showSettings ? 'Nascondi impostazioni' : 'Impostazioni GitHub'}</button>
        <span className="flash" role="status">{status.msg}</span>
      </div>

      {showSettings && (
        <div className="settings">
          <div className="field">
            <label className="label" htmlFor="gh-repo">Repository (utente/nome)</label>
            <input id="gh-repo" placeholder="utente/monitora-pranzo" value={settings.repo} onChange={(e) => update('repo', e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="gh-branch">Branch</label>
            <input id="gh-branch" value={settings.branch} onChange={(e) => update('branch', e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="gh-token">Token GitHub</label>
            <input id="gh-token" type="password" autoComplete="off" value={settings.token} onChange={(e) => update('token', e.target.value)} />
          </div>
          <p className="muted small">
            Crea un <em>fine-grained token</em> su GitHub → Settings → Developer settings, limitato a questo repository
            con il solo permesso <strong>Contents: Read and write</strong>. Resta salvato solo in questo browser.
          </p>
        </div>
      )}
    </section>
  )
}
