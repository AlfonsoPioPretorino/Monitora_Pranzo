export const WEEKDAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const todayISO = () => toISO(new Date())

/** Indice del giorno della settimana con lunedì = 0 */
export const weekdayIndex = (iso) => (parseISO(iso).getDay() + 6) % 7

export function formatLong(iso) {
  return parseISO(iso).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function formatShort(iso) {
  return parseISO(iso).toLocaleDateString('it-IT', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

export function monthLabel(iso) {
  const s = parseISO(iso).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function addDays(iso, n) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
