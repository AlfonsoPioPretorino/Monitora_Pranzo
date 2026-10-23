import { useState } from 'react'

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    const ok = await onLogin(password)
    setBusy(false)
    if (!ok) {
      setError('Password errata.')
      setPassword('')
    }
  }

  return (
    <section className="card login">
      <h2>Area amministratore</h2>
      <form onSubmit={submit}>
        <label className="label" htmlFor="admin-password">Password</label>
        <input
          id="admin-password" type="password" autoFocus autoComplete="current-password"
          value={password} onChange={(e) => { setPassword(e.target.value); setError('') }}
        />
        <div className="actions left">
          <button className="btn primary" disabled={!password || busy}>Accedi</button>
          <span className="flash" role="alert">{error}</span>
        </div>
      </form>
    </section>
  )
}
