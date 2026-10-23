import { useEffect, useState, useCallback } from 'react'

const KEY = 'monitora-pranzo:v1'

export const CATEGORIES = ['Primo', 'Secondo', 'Contorno', 'Piatto unico', 'Frutta', 'Dolce', 'Bevanda', 'Altro']

/** Normalizza il nome di un piatto: spazi compattati, iniziale maiuscola */
export function normalizeName(name) {
  const s = name.trim().replace(/\s+/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const dishKey = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ')

/** true se su questo dispositivo esiste già una bozza locale dei pranzi */
export function hasLocalDraft() {
  try {
    return localStorage.getItem(KEY) !== null
  } catch {
    return false
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed.lunches === 'object' ? parsed.lunches : {}
  } catch {
    return {}
  }
}

function persist(lunches) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, lunches }))
  } catch (e) {
    console.error('Impossibile salvare i dati', e)
  }
}

/** Valida un oggetto pranzi importato da file */
export function sanitizeLunches(input) {
  const source = input?.lunches ?? input
  const out = {}
  const list = Array.isArray(source) ? source : Object.values(source ?? {})
  for (const l of list) {
    if (!l || !/^\d{4}-\d{2}-\d{2}$/.test(l.date) || !Array.isArray(l.dishes)) continue
    const dishes = l.dishes
      .filter((d) => d && typeof d.name === 'string' && d.name.trim())
      .map((d) => ({
        name: normalizeName(d.name),
        category: CATEGORIES.includes(d.category) ? d.category : 'Altro',
      }))
    if (dishes.length) out[l.date] = { date: l.date, dishes, note: typeof l.note === 'string' ? l.note : '' }
  }
  return out
}

/**
 * Pranzi indicizzati per data (YYYY-MM-DD).
 * Persistenza nel localStorage del browser, sincronizzata tra schede aperte.
 */
export function useLunches() {
  const [lunches, setLunches] = useState(load)

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setLunches(load())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const update = useCallback((fn) => {
    setLunches((prev) => {
      const next = fn(prev)
      persist(next)
      return next
    })
  }, [])

  const saveLunch = useCallback((lunch) => update((p) => ({ ...p, [lunch.date]: lunch })), [update])

  const deleteLunch = useCallback((date) => update((p) => {
    const { [date]: _, ...rest } = p
    return rest
  }), [update])

  const replaceAll = useCallback((data) => update(() => data), [update])
  const mergeAll = useCallback((data) => update((p) => ({ ...p, ...data })), [update])

  return { lunches, saveLunch, deleteLunch, replaceAll, mergeAll }
}
