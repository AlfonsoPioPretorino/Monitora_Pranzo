import { dishKey } from './storage'
import { weekdayIndex } from './dates'

/** Catalogo dei piatti già inseriti, ordinato per frequenza */
export function buildCatalog(lunches) {
  const map = new Map()
  for (const l of Object.values(lunches)) {
    for (const d of l.dishes) {
      const k = dishKey(d.name)
      const cur = map.get(k)
      if (!cur) map.set(k, { name: d.name, category: d.category, count: 1, lastDate: l.date })
      else {
        cur.count++
        if (l.date > cur.lastDate) {
          cur.lastDate = l.date
          cur.category = d.category
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate))
}

/** Combinazioni di pranzo distinte, la più recente prima */
export function distinctMeals(lunches) {
  const seen = new Map()
  const sorted = Object.values(lunches).sort((a, b) => b.date.localeCompare(a.date))
  for (const l of sorted) {
    const sig = l.dishes.map((d) => dishKey(d.name)).sort().join('|')
    const cur = seen.get(sig)
    if (cur) cur.count++
    else seen.set(sig, { lunch: l, count: 1 })
  }
  return [...seen.values()]
}

export function computeStats(list) {
  const total = list.length
  const dishCounts = new Map()
  const categoryCounts = new Map()
  const byWeekday = Array.from({ length: 7 }, () => ({ lunches: 0, dishes: new Map() }))
  let dishTotal = 0

  for (const l of list) {
    const wd = byWeekday[weekdayIndex(l.date)]
    wd.lunches++
    for (const d of l.dishes) {
      dishTotal++
      const k = dishKey(d.name)
      const dc = dishCounts.get(k) ?? { name: d.name, category: d.category, count: 0 }
      dc.count++
      dishCounts.set(k, dc)
      categoryCounts.set(d.category, (categoryCounts.get(d.category) ?? 0) + 1)
      const wdc = wd.dishes.get(k) ?? { name: d.name, count: 0 }
      wdc.count++
      wd.dishes.set(k, wdc)
    }
  }

  const topDishes = [...dishCounts.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const categories = [...categoryCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const weekdays = byWeekday.map((w) => ({
    lunches: w.lunches,
    dishes: [...w.dishes.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  }))

  return {
    total,
    distinctDishes: dishCounts.size,
    avgDishes: total ? dishTotal / total : 0,
    topDishes,
    categories,
    weekdays,
  }
}

/** Serie di giorni consecutivi con pranzo registrato più lunga */
export function longestStreak(dates) {
  const sorted = [...dates].sort()
  let best = 0
  let cur = 0
  let prev = null
  for (const iso of sorted) {
    const t = Date.parse(iso + 'T12:00:00')
    cur = prev !== null && Math.round((t - prev) / 86400000) === 1 ? cur + 1 : 1
    best = Math.max(best, cur)
    prev = t
  }
  return best
}
