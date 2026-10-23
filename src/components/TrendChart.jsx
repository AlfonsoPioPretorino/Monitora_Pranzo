import { useEffect, useMemo, useState } from 'react'
import { dishKey } from '../lib/storage'
import { addDays, parseISO, toISO, weekdayIndex } from '../lib/dates'

const MAX_SERIES = 8
const DEFAULT_VISIBLE = 4
const HEIGHT = 260

function bucketStart(iso, unit) {
  return unit === 'month' ? iso.slice(0, 7) + '-01' : addDays(iso, -weekdayIndex(iso))
}

function nextBucket(iso, unit) {
  if (unit === 'week') return addDays(iso, 7)
  const d = parseISO(iso)
  d.setMonth(d.getMonth() + 1)
  return toISO(d)
}

function tickLabel(iso, unit) {
  const d = parseISO(iso)
  return unit === 'month'
    ? d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' })
    : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function longLabel(iso, unit) {
  const d = parseISO(iso)
  if (unit === 'month') {
    const s = d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  return `Settimana dal ${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

/** Conteggi per settimana (o mese, se il periodo è lungo) dei piatti indicati */
function buildTrend(list, dishes) {
  const dates = list.map((l) => l.date).sort()
  const first = dates[0]
  const last = dates[dates.length - 1]
  const spanDays = (parseISO(last) - parseISO(first)) / 86400000
  const unit = spanDays > 120 ? 'month' : 'week'

  const buckets = []
  for (let b = bucketStart(first, unit); b <= last; b = nextBucket(b, unit)) buckets.push(b)
  const index = new Map(buckets.map((b, i) => [b, i]))

  const counts = new Map(dishes.map((d) => [d.key, new Array(buckets.length).fill(0)]))
  for (const l of list) {
    const i = index.get(bucketStart(l.date, unit))
    for (const d of l.dishes) {
      const c = counts.get(dishKey(d.name))
      if (c) c[i]++
    }
  }
  return { unit, buckets, counts }
}

/** Curva monotona (niente oscillazioni sotto lo zero o sopra i picchi) */
function smoothPath(pts) {
  const n = pts.length
  if (n < 2) return ''
  const dx = []
  const s = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x
    s[i] = (pts[i + 1].y - pts[i].y) / dx[i]
  }
  const m = [s[0]]
  for (let i = 1; i < n - 1; i++) {
    m[i] = s[i - 1] * s[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / s[i - 1] + (dx[i] + 2 * dx[i - 1]) / s[i])
  }
  m[n - 1] = s[n - 2]
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += `C${pts[i].x + h},${pts[i].y + m[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - m[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`
  }
  return d
}

/** Distanzia verticalmente le etichette a fine linea per evitare sovrapposizioni */
function spreadLabels(items, gap, min, max) {
  const sorted = [...items].sort((a, b) => a.y - b.y)
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].ly = Math.max(sorted[i].y, i ? sorted[i - 1].ly + gap : min)
  }
  for (let i = sorted.length - 1; i >= 0; i--) {
    sorted[i].ly = Math.min(sorted[i].ly, i < sorted.length - 1 ? sorted[i + 1].ly - gap : max)
  }
  return sorted
}

/** Larghezza dell'elemento a cui viene assegnato il ref (callback ref: funziona anche se monta dopo) */
function useWidth() {
  const [node, setNode] = useState(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!node) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(node)
    return () => ro.disconnect()
  }, [node])
  return [setNode, width]
}

export default function TrendChart({ list, topDishes }) {
  const dishes = useMemo(
    () => topDishes.slice(0, MAX_SERIES).map((d, i) => ({ ...d, color: `var(--series-${i + 1})` })),
    [topDishes],
  )
  const [hidden, setHidden] = useState(() => new Set())
  const [hover, setHover] = useState(null)
  const [wrapRef, width] = useWidth()

  // I primi piatti sono visibili di default; quelli oltre sono attivabili dalla legenda
  const isVisible = (d, i) => (i < DEFAULT_VISIBLE ? !hidden.has(d.key) : hidden.has('+' + d.key))
  function toggle(d, i) {
    setHidden((prev) => {
      const next = new Set(prev)
      const k = i < DEFAULT_VISIBLE ? d.key : '+' + d.key
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })
  }

  const trend = useMemo(() => buildTrend(list, dishes), [list, dishes])
  const visible = dishes.filter(isVisible)

  if (trend.buckets.length < 2) {
    return <p className="muted">Servono pranzi in almeno due {trend.unit === 'month' ? 'mesi' : 'settimane'} diversi per vedere l'andamento.</p>
  }

  const directLabels = width >= 520 && visible.length > 0 && visible.length <= 4
  const m = { top: 12, right: directLabels ? 120 : 16, bottom: 28, left: 30 }
  const innerW = Math.max(0, width - m.left - m.right)
  const innerH = HEIGHT - m.top - m.bottom
  const n = trend.buckets.length

  const maxY = Math.max(1, ...visible.flatMap((d) => trend.counts.get(d.key)))
  const step = Math.max(1, Math.ceil(maxY / 4))
  const yMax = Math.ceil(maxY / step) * step
  const yTicks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step)

  const x = (i) => m.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v) => m.top + innerH - (v / yMax) * innerH
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 64))))

  const series = visible.map((d) => {
    const values = trend.counts.get(d.key)
    return { ...d, values, path: smoothPath(values.map((v, i) => ({ x: x(i), y: y(v) }))) }
  })
  const labels = directLabels
    ? spreadLabels(series.map((s) => ({ ...s, y: y(s.values[n - 1]) })), 14, m.top, m.top + innerH)
    : []

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.round(((px - m.left) / innerW) * (n - 1))
    setHover(Math.min(n - 1, Math.max(0, i)))
  }

  const tip = hover !== null && series.length > 0 && {
    left: x(hover),
    flip: x(hover) > width - 200,
    rows: [...series].map((s) => ({ ...s, v: s.values[hover] })).sort((a, b) => b.v - a.v),
  }

  return (
    <div className="trend">
      <div className="trend-legend" role="group" aria-label="Piatti mostrati">
        {dishes.map((d, i) => (
          <button key={d.key} className="legend-chip" aria-pressed={isVisible(d, i)} onClick={() => toggle(d, i)}>
            <span className="swatch" style={{ background: d.color }} />
            {d.name}
          </button>
        ))}
      </div>

      <div className="trend-plot" ref={wrapRef}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={`Andamento per ${trend.unit === 'month' ? 'mese' : 'settimana'} dei piatti più mangiati`}>
            {yTicks.map((t) => (
              <g key={t}>
                <line className={t === 0 ? 'axis' : 'grid'} x1={m.left} x2={m.left + innerW} y1={y(t)} y2={y(t)} />
                <text className="tick" x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{t}</text>
              </g>
            ))}
            {trend.buckets.map((b, i) => (n - 1 - i) % every === 0 && (
              <text key={b} className="tick" x={x(i)} y={HEIGHT - 8} textAnchor="middle">{tickLabel(b, trend.unit)}</text>
            ))}

            {hover !== null && <line className="crosshair" x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + innerH} />}

            {series.map((s) => (
              <path key={s.key} d={s.path} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ))}

            {hover !== null && series.map((s) => (
              <circle key={s.key} className="hover-dot" cx={x(hover)} cy={y(s.values[hover])} r="4.5" fill={s.color} />
            ))}

            {labels.map((l) => (
              <text key={l.key} className="end-label" x={m.left + innerW + 8} y={l.ly} dy="0.32em">
                {l.name.length > 16 ? l.name.slice(0, 15) + '…' : l.name}
              </text>
            ))}

            <rect
              x={m.left - 10} y={m.top} width={innerW + 20} height={innerH} fill="transparent"
              onPointerMove={onMove} onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}

        {tip && (
          <div className="trend-tip" style={{ left: tip.left, transform: tip.flip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}>
            <strong>{longLabel(trend.buckets[hover], trend.unit)}</strong>
            {tip.rows.map((r) => (
              <div key={r.key} className="tip-row">
                <span className="swatch" style={{ background: r.color }} />
                <span className="tip-name">{r.name}</span>
                <span className="tip-value">{r.v}×</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {series.length === 0 && <p className="muted">Seleziona almeno un piatto dalla legenda.</p>}
    </div>
  )
}
