import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, dishKey, normalizeName } from '../lib/storage'
import { buildCatalog, distinctMeals } from '../lib/stats'
import { addDays, formatLong, formatShort, todayISO } from '../lib/dates'

export default function EntryForm({ lunches, date, onDateChange, onSave, onDelete }) {
  const existing = lunches[date]
  const [dishes, setDishes] = useState(existing?.dishes ?? [])
  const [note, setNote] = useState(existing?.note ?? '')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Primo')
  const [flash, setFlash] = useState('')
  const inputRef = useRef(null)

  const catalog = useMemo(() => buildCatalog(lunches), [lunches])
  const catalogByKey = useMemo(() => new Map(catalog.map((c) => [dishKey(c.name), c])), [catalog])
  const meals = useMemo(
    () => distinctMeals(lunches).filter((m) => m.lunch.date !== date),
    [lunches, date],
  )

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(''), 2200)
    return () => clearTimeout(t)
  }, [flash])

  const selectedKeys = new Set(dishes.map((d) => dishKey(d.name)))

  const suggestions = useMemo(() => {
    const q = dishKey(name)
    if (!q) return []
    return catalog
      .filter((c) => dishKey(c.name).includes(q) && !selectedKeys.has(dishKey(c.name)))
      .slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, catalog, dishes])

  const frequent = catalog.filter((c) => !selectedKeys.has(dishKey(c.name))).slice(0, 14)

  function addDish(dishName, cat) {
    const n = normalizeName(dishName)
    if (!n || selectedKeys.has(dishKey(n))) return
    const known = catalogByKey.get(dishKey(n))
    setDishes((prev) => [...prev, { name: known?.name ?? n, category: cat ?? known?.category ?? category }])
    setName('')
    inputRef.current?.focus()
  }

  function onNameChange(v) {
    setName(v)
    const known = catalogByKey.get(dishKey(v))
    if (known) setCategory(known.category)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length && !catalogByKey.has(dishKey(name))) {
        const s = suggestions[0]
        addDish(s.name, s.category)
      } else {
        addDish(name)
      }
    }
  }

  function applyMeal(sigIndex) {
    const m = meals[sigIndex]
    if (!m) return
    setDishes(m.lunch.dishes.map((d) => ({ ...d })))
  }

  function save() {
    if (!dishes.length) return
    onSave({ date, dishes, note: note.trim() })
    setFlash(existing ? 'Pranzo aggiornato ✓' : 'Pranzo salvato ✓')
  }

  const dirty =
    JSON.stringify(dishes) !== JSON.stringify(existing?.dishes ?? []) ||
    note.trim() !== (existing?.note ?? '')

  return (
    <section className="card">
      <div className="date-row">
        <button className="btn ghost icon" onClick={() => onDateChange(addDays(date, -1))} aria-label="Giorno precedente">‹</button>
        <div className="date-center">
          <input type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && onDateChange(e.target.value)} />
          <span className="date-long">{formatLong(date)}</span>
        </div>
        <button className="btn ghost icon" onClick={() => onDateChange(addDays(date, 1))} aria-label="Giorno successivo" disabled={date >= todayISO()}>›</button>
      </div>
      {existing && <p className="badge info">Pranzo già registrato per questo giorno: le modifiche lo aggiorneranno.</p>}

      {meals.length > 0 && (
        <div className="field">
          <label htmlFor="repeat">Ripeti un pranzo già inserito</label>
          <select id="repeat" value="" onChange={(e) => applyMeal(Number(e.target.value))}>
            <option value="" disabled>Scegli un pranzo precedente…</option>
            {meals.slice(0, 50).map((m, i) => (
              <option key={m.lunch.date} value={i}>
                {formatShort(m.lunch.date)} — {m.lunch.dishes.map((d) => d.name).join(', ')}
                {m.count > 1 ? ` (×${m.count})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="dish">Aggiungi piatto</label>
        <div className="add-row">
          <div className="autocomplete">
            <input
              id="dish"
              ref={inputRef}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Es. Pasta al pomodoro"
              autoComplete="off"
            />
            {suggestions.length > 0 && (
              <ul className="suggestions">
                {suggestions.map((s) => (
                  <li key={s.name}>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); addDish(s.name, s.category) }}>
                      <span>{s.name}</span>
                      <small>{s.category} · {s.count}×</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button className="btn" onClick={() => addDish(name)} disabled={!name.trim()}>Aggiungi</button>
        </div>
      </div>

      {frequent.length > 0 && (
        <div className="field">
          <span className="label">Piatti frequenti — tocca per aggiungere</span>
          <div className="chips">
            {frequent.map((c) => (
              <button key={c.name} className="chip" onClick={() => addDish(c.name, c.category)}>
                + {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <span className="label">Piatti del pranzo</span>
        {dishes.length === 0 ? (
          <p className="muted">Nessun piatto ancora. Scrivi un nome, usa i suggerimenti o ripeti un pranzo precedente.</p>
        ) : (
          <ul className="dish-list">
            {dishes.map((d, i) => (
              <li key={d.name}>
                <span className={`cat cat-${dishKey(d.category).replace(' ', '-')}`}>{d.category}</span>
                <span className="dish-name">{d.name}</span>
                <button className="btn ghost icon" aria-label={`Rimuovi ${d.name}`} onClick={() => setDishes(dishes.filter((_, j) => j !== i))}>×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="field">
        <label htmlFor="note">Note (facoltative)</label>
        <textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. al ristorante, porzione abbondante…" />
      </div>

      <div className="actions">
        {existing && (
          <button className="btn danger ghost" onClick={() => { if (confirm('Eliminare il pranzo di questo giorno?')) onDelete(date) }}>
            Elimina
          </button>
        )}
        <span className="flash">{flash}</span>
        <button className="btn primary" onClick={save} disabled={!dishes.length || !dirty}>
          {existing ? 'Aggiorna pranzo' : 'Salva pranzo'}
        </button>
      </div>
    </section>
  )
}
