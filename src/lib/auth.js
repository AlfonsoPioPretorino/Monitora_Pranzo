import { useState } from 'react'

const SESSION_KEY = 'monitora-pranzo:admin'

// SHA-256 della password di amministrazione: nel codice pubblicato non compare in chiaro.
// Per cambiarla: printf '%s' 'nuova-password' | shasum -a 256
const PASSWORD_SHA256 = 'fbfb386efea67e816f2dda0a8c94a98eb203757aebb3f55f183755a192d44467'

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function readSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

/** Sessione amministratore: dura finché la scheda resta aperta */
export function useAdminSession() {
  const [authed, setAuthed] = useState(readSession)

  async function login(password) {
    const ok = (await sha256(password)) === PASSWORD_SHA256
    if (ok) {
      try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* vale solo per questa pagina */ }
      setAuthed(true)
    }
    return ok
  }

  function logout() {
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* niente da rimuovere */ }
    setAuthed(false)
  }

  return { authed, login, logout }
}
