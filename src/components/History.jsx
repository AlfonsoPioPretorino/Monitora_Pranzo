import { useMemo, useState } from 'react'
import { formatShort, monthLabel } from '../lib/dates'
import { dishKey } from '../lib/storage'

export default function History({ lunches, onEdit }) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = dishKey(query)
    const list = Object.values(lunches)
      .filter((l) => !q || l.dishes.some((d) => dishKey(d.name).includes(q)) || dishKey(l.note ?? '').includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
    const out = []
    for (const l of list) {
      const label = monthLabel(l.date)
      if (out.at(-1)?.label !== label) out.push({ label, items: [] })
      out.at(-1).items.push(l)
    }
    return out
  }, [lunches, query])

  const total = Object.keys(lunches).length

  return (
    <section className="card">
      <div className="history-head">
        <h2>Storico pranzi <span className="muted">({total})</span></h2>
        <input type="search" placeholder="Cerca un piatto…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {groups.length === 0 && <p className="muted">{total ? 'Nessun pranzo corrisponde alla ricerca.' : 'Non hai ancora registrato pranzi.'}</p>}
      {groups.map((g) => (
        <div key={g.label} className="month">
          <h3>{g.label}</h3>
          <ul className="history-list">
            {g.items.map((l) => (
              <li key={l.date}>
                <button className="history-item" onClick={() => onEdit(l.date)} title="Modifica">
                  <span className="h-date">{formatShort(l.date)}</span>
                  <span className="h-dishes">
                    {l.dishes.map((d) => d.name).join(' · ')}
                    {l.note && <small className="muted"> — {l.note}</small>}
                  </span>
                  <span className="h-edit">Modifica</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
