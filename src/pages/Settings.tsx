import { useEffect, useRef, useState } from 'react'
import { errMsg, useStore } from '../lib/store'
import { logout } from '../lib/supabase'
import {
  hasSpotifyToken,
  loadSpotifySettings,
  playlistIdFrom,
  redirectUri,
  saveSpotifySettings,
  spotifyLogout,
  startLogin,
  syncPlaylist,
  type SpotifySettings,
  type SyncResult,
} from '../lib/spotify'
import { Icon, Spinner, useToast } from '../components/ui'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

let installEvent: BeforeInstallPromptEvent | null = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  installEvent = e as BeforeInstallPromptEvent
})

export default function Settings({ autoSync, onAutoSyncDone }: { autoSync: boolean; onAutoSyncDone: () => void }) {
  const { refresh } = useStore()
  const [s, setS] = useState<SpotifySettings | null>(null)
  const [clientId, setClientId] = useState('')
  const [playlist, setPlaylist] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [connected, setConnected] = useState(hasSpotifyToken())
  const [canInstall, setCanInstall] = useState(!!installEvent)
  const toast = useToast()
  const autoSynced = useRef(false)

  useEffect(() => {
    loadSpotifySettings()
      .then((v) => {
        setS(v ?? { clientId: '', playlistUrl: '' })
        setClientId(v?.clientId ?? '')
        setPlaylist(v?.playlistUrl ?? '')
      })
      .catch((e) => setErr(errMsg(e)))
    const h = () => setCanInstall(true)
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  const sync = async (cfg: SpotifySettings) => {
    setBusy(true)
    setErr(null)
    setResult(null)
    try {
      const r = await syncPlaylist(cfg)
      setResult(r)
      setS({ ...cfg, lastSync: new Date().toISOString() })
      await refresh()
    } catch (e) {
      const m = errMsg(e)
      if (m === 'NEED_LOGIN') {
        setConnected(false)
        setErr('Conecta tu cuenta de Spotify para sincronizar.')
      } else setErr(m)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (autoSync && !autoSynced.current && s?.clientId && s.playlistUrl) {
      autoSynced.current = true
      onAutoSyncDone()
      sync(s)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync, s])

  if (!s) return err ? <div className="err">{err}</div> : <Spinner />

  const saveCfg = async () => {
    if (!playlistIdFrom(playlist)) {
      setErr('Pega el link de la playlist (https://open.spotify.com/playlist/…)')
      return
    }
    const cfg = { ...s, clientId: clientId.trim(), playlistUrl: playlist.trim() }
    try {
      await saveSpotifySettings(cfg)
      setS(cfg)
      setErr(null)
      toast('Configuración guardada para toda la banda')
    } catch (e) {
      setErr(errMsg(e))
    }
  }

  const cfgReady = !!s.clientId && !!s.playlistUrl
  const dirty = clientId.trim() !== s.clientId || playlist.trim() !== s.playlistUrl

  return (
    <>
      <div className="page-head">
        <h1>Ajustes</h1>
      </div>

      <div className="card stack">
        <h2>
          <span style={{ color: '#1ed760' }}>●</span> Playlist de Spotify
        </h2>
        <p className="small muted">
          Las canciones de la playlist forman el repertorio. Al sincronizar se agregan las nuevas y se marcan las que salieron; los tonos, notas y etiquetas que cargó la banda se mantienen.
        </p>
        <label className="field">
          Link de la playlist
          <input value={playlist} onChange={(e) => setPlaylist(e.target.value)} placeholder="https://open.spotify.com/playlist/…" />
        </label>
        <label className="field">
          Client ID de la app de Spotify
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="32 caracteres" autoCapitalize="off" />
        </label>
        {dirty && (
          <button className="btn" onClick={saveCfg} disabled={!clientId.trim() || !playlist.trim()}>
            Guardar configuración
          </button>
        )}
        <details className="small muted">
          <summary>¿Cómo obtengo el Client ID?</summary>
          <ol>
            <li>
              Entra a <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">developer.spotify.com/dashboard</a> con la cuenta dueña de la playlist (requiere Premium) y crea una app («Web API»).
            </li>
            <li>
              En <b>Redirect URIs</b> agrega exactamente: <code>{redirectUri()}</code>
            </li>
            <li>En «User Management» agrega el email de Spotify de cada integrante que vaya a sincronizar (máx. 5).</li>
            <li>Copia el Client ID y pégalo aquí. Solo se necesita una vez para toda la banda.</li>
          </ol>
          <p>La cuenta que sincroniza debe ser dueña o colaboradora de la playlist.</p>
        </details>

        {err && <div className="err small">{err}</div>}
        {result && (
          <div className="ok small">
            ¡Listo! {result.total} canciones en la playlist · {result.added} nuevas · {result.removed} salieron.
          </div>
        )}

        <div className="row">
          {connected ? (
            <>
              <button className="btn amber grow" disabled={!cfgReady || busy || dirty} onClick={() => sync(s)}>
                <Icon.sync /> {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
              </button>
              <button
                className="btn ghost small"
                onClick={() => {
                  spotifyLogout()
                  setConnected(false)
                }}
              >
                Desconectar
              </button>
            </>
          ) : (
            <button className="btn amber grow" disabled={!cfgReady || dirty} onClick={() => startLogin(s.clientId)}>
              <Icon.spotify /> Conectar con Spotify
            </button>
          )}
        </div>
        {s.lastSync && <p className="small muted">Última sincronización: {new Date(s.lastSync).toLocaleString('es')}</p>}
      </div>

      <div className="card stack">
        <h2>Instalar en el teléfono</h2>
        {canInstall ? (
          <button
            className="btn primary"
            onClick={async () => {
              await installEvent?.prompt()
              installEvent = null
              setCanInstall(false)
            }}
          >
            Instalar app
          </button>
        ) : (
          <p className="small muted">
            <b>iPhone:</b> abre en Safari → botón Compartir → «Agregar a pantalla de inicio».
            <br />
            <b>Android:</b> menú de Chrome (⋮) → «Instalar app» o «Agregar a pantalla principal».
          </p>
        )}
      </div>

      <div className="card stack">
        <h2>Sesión</h2>
        <p className="small muted">Este dispositivo está conectado con el código de la banda.</p>
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('¿Salir? Tendrás que ingresar el código de nuevo.')) {
              logout()
              location.reload()
            }
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </>
  )
}
