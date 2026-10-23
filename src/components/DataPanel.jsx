import { useRef, useState } from 'react'
import { sanitizeLunches } from '../lib/storage'
import { todayISO } from '../lib/dates'

export default function DataPanel({ lunches, onReplace, onMerge }) {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState('')

  function exportJson() {
    const blob = new Blob([JSON.stringify({ version: 1, lunches }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `monitora-pranzo-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importJson(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = sanitizeLunches(JSON.parse(await file.text()))
      const n = Object.keys(data).length
      if (!n) return setMsg('Il file non contiene pranzi validi.')
      const replace = Object.keys(lunches).length > 0 &&
        confirm(`Trovati ${n} pranzi.\nOK = sostituisci tutti i dati attuali\nAnnulla = unisci ai dati esistenti`)
      replace ? onReplace(data) : onMerge(data)
      setMsg(`Importati ${n} pranzi ✓`)
    } catch {
      setMsg('File non valido.')
    }
  }

  function clearAll() {
    if (confirm('Eliminare definitivamente TUTTI i pranzi? Consigliato esportare prima un backup.')) {
      onReplace({})
      setMsg('Dati eliminati.')
    }
  }

  return (
    <section className="card">
      <h2>Backup dei dati</h2>
      <p className="muted">
        Importa un file JSON (ad esempio un export precedente) nella bozza di questo browser, oppure esportane una copia di backup.
        Per renderli visibili sul sito usa poi «Pubblica sul sito».
      </p>
      <div className="actions left">
        <button className="btn" onClick={exportJson} disabled={!Object.keys(lunches).length}>Esporta JSON</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Importa JSON</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
        <button className="btn danger ghost" onClick={clearAll} disabled={!Object.keys(lunches).length}>Cancella tutto</button>
        <span className="flash">{msg}</span>
      </div>
    </section>
  )
}
