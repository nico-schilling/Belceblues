import { useState } from 'react'
import { login } from '../lib/supabase'
import { errMsg } from '../lib/store'

export default function Login({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      if (await login(code)) onOk()
      else setErr('Ese no es el código de la banda.')
    } catch (e) {
      setErr(`No se pudo conectar: ${errMsg(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="card stack" onSubmit={submit}>
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
        <h1>Belceblues</h1>
        <p className="sub">Setlists de la banda</p>
        <label className="field" style={{ textAlign: 'left' }}>
          Código de banda
          <input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="off" autoCorrect="off" autoComplete="current-password" type="password" required />
        </label>
        {err && <div className="err small">{err}</div>}
        <button className="btn primary" style={{ width: '100%' }} disabled={busy || !code.trim()}>
          {busy ? 'Afinando…' : 'Subir al escenario'}
        </button>
      </form>
    </div>
  )
}
