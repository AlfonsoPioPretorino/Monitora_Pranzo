import { useEffect, useState } from 'react'
import { hasLocalDraft, useLunches } from './lib/storage'
import { usePublishedLunches } from './lib/published'
import { useAdminSession } from './lib/auth'
import { todayISO } from './lib/dates'
import { useTheme } from './lib/theme'
import EntryForm from './components/EntryForm'
import History from './components/History'
import Stats from './components/Stats'
import DataPanel from './components/DataPanel'
import Login from './components/Login'
import PublishPanel from './components/PublishPanel'

const BASE = import.meta.env.BASE_URL

const TABS = [
  { id: 'entry', label: 'Inserisci' },
  { id: 'history', label: 'Storico' },
  { id: 'stats', label: 'Statistiche' },
]

const THEME_OPTIONS = [
  { id: 'auto', icon: '◐', label: 'Automatico (come il sistema)' },
  { id: 'light', icon: '☀', label: 'Tema chiaro' },
  { id: 'dark', icon: '☾', label: 'Tema scuro' },
]

// Su GitHub Pages /admin non esiste come file: viene servito 404.html (copia di index.html)
const isAdminPath = () => window.location.pathname.slice(BASE.length - 1).replace(/\/+$/, '') === '/admin'

function Topbar({ children }) {
  const [theme, setTheme] = useTheme()
  return (
    <header className="topbar">
      <h1><a href={BASE}><span aria-hidden>🍝</span> Monitora Pranzo</a></h1>
      <div className="topbar-right">
        {children}
        <div className="theme-switch" role="radiogroup" aria-label="Tema">
          {THEME_OPTIONS.map((o) => (
            <button
              key={o.id}
              role="radio"
              aria-checked={theme === o.id}
              aria-label={o.label}
              title={o.label}
              className={theme === o.id ? 'active' : ''}
              onClick={() => setTheme(o.id)}
            >
              {o.icon}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

function PublicView({ published }) {
  return (
    <>
      <Topbar />
      <main>
        {published.status === 'loading' && <section className="card"><p className="muted">Caricamento…</p></section>}
        {published.status === 'error' && <section className="card"><p className="muted">Impossibile caricare i dati. Riprova più tardi.</p></section>}
        {published.status === 'ready' && <Stats lunches={published.lunches} />}
      </main>
    </>
  )
}

function AdminView({ published, onLogout }) {
  const { lunches, saveLunch, deleteLunch, replaceAll, mergeAll } = useLunches()
  const [tab, setTab] = useState('entry')
  const [date, setDate] = useState(todayISO)

  // Primo accesso su questo dispositivo: la bozza parte dai dati pubblicati
  useEffect(() => {
    if (published.lunches && !hasLocalDraft()) replaceAll(published.lunches)
  }, [published.lunches, replaceAll])

  function editDate(d) {
    setDate(d)
    setTab('entry')
  }

  return (
    <>
      <Topbar>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <button className="btn ghost" onClick={onLogout}>Esci</button>
      </Topbar>

      <main className="stack">
        <PublishPanel
          lunches={lunches}
          published={published}
          onPublished={published.setPublished}
          onDiscard={() => replaceAll(published.lunches)}
        />
        {tab === 'entry' && (
          <EntryForm key={date} lunches={lunches} date={date} onDateChange={setDate} onSave={saveLunch} onDelete={deleteLunch} />
        )}
        {tab === 'history' && (
          <div className="stack">
            <History lunches={lunches} onEdit={editDate} />
            <DataPanel lunches={lunches} onReplace={replaceAll} onMerge={mergeAll} />
          </div>
        )}
        {tab === 'stats' && <Stats lunches={lunches} />}
      </main>
    </>
  )
}

export default function App() {
  const published = usePublishedLunches()
  const { authed, login, logout } = useAdminSession()

  let content
  if (!isAdminPath()) content = <PublicView published={published} />
  else if (!authed) content = <><Topbar /><main><Login onLogin={login} /></main></>
  else content = <AdminView published={published} onLogout={logout} />

  return <div className="app">{content}</div>
}
