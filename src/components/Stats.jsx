import { useMemo, useState } from 'react'
import { computeStats, longestStreak } from '../lib/stats'
import { WEEKDAYS, WEEKDAYS_SHORT, addDays, todayISO, weekdayIndex } from '../lib/dates'
import TrendChart from './TrendChart'

const PERIODS = [
  { id: 'all', label: 'Sempre' },
  { id: '30', label: 'Ultimi 30 giorni' },
  { id: '90', label: 'Ultimi 90 giorni' },
  { id: 'year', label: "Quest'anno" },
]

function filterByPeriod(list, period) {
  const today = todayISO()
  if (period === 'all') return list
  if (period === 'year') return list.filter((l) => l.date.startsWith(today.slice(0, 4)))
  const from = addDays(today, -Number(period) + 1)
  return list.filter((l) => l.date >= from)
}

function Bars({ items, max, unit = '' }) {
  return (
    <ul className="bars">
      {items.map((it) => (
        <li key={it.label}>
          <span className="bar-label" title={it.label}>{it.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${max ? (it.value / max) * 100 : 0}%` }} />
          </span>
          <span className="bar-value">{it.value}{unit}{it.extra && <small className="muted"> {it.extra}</small>}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Stats({ lunches }) {
  const [period, setPeriod] = useState('all')
  const [weekday, setWeekday] = useState(() => weekdayIndex(todayISO()))

  const list = useMemo(() => filterByPeriod(Object.values(lunches), period), [lunches, period])
  const s = useMemo(() => computeStats(list), [list])
  const streak = useMemo(() => longestStreak(list.map((l) => l.date)), [list])

  if (!Object.keys(lunches).length) {
    return <section className="card"><p className="muted">Registra qualche pranzo per vedere le statistiche.</p></section>
  }

  const wd = s.weekdays[weekday]
  const maxWeekday = Math.max(...s.weekdays.map((w) => w.lunches))
  const topForMatrix = s.topDishes.slice(0, 10)
  const matrixMax = Math.max(1, ...topForMatrix.flatMap((d) => s.weekdays.map((w) => w.dishes.find((x) => x.key === d.key)?.count ?? 0)))

  return (
    <div className="stack">
      <div className="segmented" role="tablist" aria-label="Periodo">
        {PERIODS.map((p) => (
          <button key={p.id} className={period === p.id ? 'active' : ''} onClick={() => setPeriod(p.id)}>{p.label}</button>
        ))}
      </div>

      {s.total === 0 ? (
        <section className="card"><p className="muted">Nessun pranzo nel periodo selezionato.</p></section>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi"><span className="kpi-value">{s.total}</span><span className="kpi-label">Pranzi registrati</span></div>
            <div className="kpi"><span className="kpi-value">{s.distinctDishes}</span><span className="kpi-label">Piatti diversi</span></div>
            <div className="kpi"><span className="kpi-value">{s.avgDishes.toFixed(1)}</span><span className="kpi-label">Piatti per pranzo</span></div>
            <div className="kpi"><span className="kpi-value">{streak}</span><span className="kpi-label">Giorni consecutivi (record)</span></div>
          </div>

          <section className="card">
            <h2>Piatti più frequenti</h2>
            <Bars
              max={s.topDishes[0]?.count}
              items={s.topDishes.slice(0, 12).map((d) => ({
                label: d.name,
                value: d.count,
                extra: `(${Math.round((d.count / s.total) * 100)}% dei pranzi)`,
              }))}
            />
          </section>

          <section className="card">
            <h2>Andamento dei piatti più mangiati</h2>
            <TrendChart list={list} topDishes={s.topDishes} />
          </section>

          <section className="card">
            <h2>Piatti comuni per giorno della settimana</h2>
            <div className="weekday-picker" role="tablist">
              {WEEKDAYS_SHORT.map((w, i) => (
                <button key={w} className={weekday === i ? 'active' : ''} onClick={() => setWeekday(i)}>
                  {w}<small>{s.weekdays[i].lunches}</small>
                </button>
              ))}
            </div>
            {wd.lunches === 0 ? (
              <p className="muted">Nessun pranzo registrato di {WEEKDAYS[weekday].toLowerCase()}.</p>
            ) : (
              <>
                <p className="muted">{wd.lunches} pranzi di {WEEKDAYS[weekday].toLowerCase()} — percentuale dei {WEEKDAYS[weekday].toLowerCase()} in cui compare il piatto:</p>
                <Bars
                  max={wd.lunches}
                  items={wd.dishes.slice(0, 10).map((d) => ({
                    label: d.name,
                    value: Math.round((d.count / wd.lunches) * 100),
                    extra: `(${d.count}×)`,
                  }))}
                  unit="%"
                />
              </>
            )}
          </section>

          {topForMatrix.length > 0 && (
            <section className="card">
              <h2>Mappa piatti × giorni</h2>
              <div className="matrix-wrap">
                <table className="matrix">
                  <thead>
                    <tr><th />{WEEKDAYS_SHORT.map((w) => <th key={w}>{w}</th>)}</tr>
                  </thead>
                  <tbody>
                    {topForMatrix.map((d) => (
                      <tr key={d.key}>
                        <th scope="row" title={d.name}>{d.name}</th>
                        {s.weekdays.map((w, i) => {
                          const c = w.dishes.find((x) => x.key === d.key)?.count ?? 0
                          return (
                            <td key={i} style={{ '--a': c / matrixMax }} title={`${d.name} — ${WEEKDAYS[i]}: ${c}`}>
                              {c || ''}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <div className="grid-2">
            <section className="card">
              <h2>Pranzi per giorno</h2>
              <Bars max={maxWeekday} items={WEEKDAYS.map((w, i) => ({ label: w, value: s.weekdays[i].lunches }))} />
            </section>
            <section className="card">
              <h2>Categorie</h2>
              <Bars max={s.categories[0]?.count} items={s.categories.map((c) => ({ label: c.name, value: c.count }))} />
            </section>
          </div>
        </>
      )}
    </div>
  )
}
