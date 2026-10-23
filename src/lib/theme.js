import { useEffect, useState } from 'react'

// Stessa chiave usata dallo script inline in index.html
const KEY = 'monitora-pranzo:theme'
export const THEMES = ['auto', 'light', 'dark']

function readTheme() {
  try {
    const t = localStorage.getItem(KEY)
    return THEMES.includes(t) ? t : 'auto'
  } catch {
    return 'auto'
  }
}

export function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

/** Tema scelto dall'utente, persistito nel localStorage */
export function useTheme() {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* storage non disponibile: il tema vale solo per la sessione */
    }
  }, [theme])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setTheme(readTheme())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return [theme, setTheme]
}
