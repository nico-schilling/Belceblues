import { db } from './supabase'

const TOKEN_KEY = 'belceblues.spotifyToken'
const VERIFIER_KEY = 'belceblues.pkceVerifier'
const PENDING_KEY = 'belceblues.pkcePending'
const SCOPES = 'playlist-read-private playlist-read-collaborative'

export interface SpotifySettings {
  clientId: string
  playlistUrl: string
  lastSync?: string
}

interface Token {
  access_token: string
  refresh_token?: string
  expires_at: number
}

export const redirectUri = () => `${location.origin}${import.meta.env.BASE_URL}`

export function playlistIdFrom(input: string): string | null {
  const s = input.trim()
  const m = s.match(/playlist[/:]([A-Za-z0-9]{10,})/)
  if (m) return m[1]
  if (/^[A-Za-z0-9]{16,}$/.test(s)) return s
  return null
}

export async function loadSpotifySettings(): Promise<SpotifySettings | null> {
  const { data, error } = await db().from('settings').select('value').eq('key', 'spotify').maybeSingle()
  if (error) throw error
  return (data?.value as SpotifySettings) ?? null
}

export async function saveSpotifySettings(s: SpotifySettings) {
  const { error } = await db().from('settings').upsert({ key: 'spotify', value: s })
  if (error) throw error
}

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  arr.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function startLogin(clientId: string) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(64)))
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)))
  localStorage.setItem(VERIFIER_KEY, verifier)
  localStorage.setItem(PENDING_KEY, JSON.stringify({ state, clientId }))
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES,
    state,
  })
  location.href = `https://accounts.spotify.com/authorize?${params}`
}

function saveToken(t: { access_token: string; refresh_token?: string; expires_in: number }, prevRefresh?: string) {
  const token: Token = {
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? prevRefresh,
    expires_at: Date.now() + (t.expires_in - 60) * 1000,
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  return token
}

/**
 * Si la URL trae ?code= de vuelta de Spotify, canjea el token.
 * Devuelve true si se completó un login.
 */
export async function handleRedirect(): Promise<boolean> {
  const url = new URL(location.href)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const err = url.searchParams.get('error')
  if (!code && !err) return false
  const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null') as { state: string; clientId: string } | null
  const verifier = localStorage.getItem(VERIFIER_KEY)
  localStorage.removeItem(PENDING_KEY)
  localStorage.removeItem(VERIFIER_KEY)
  history.replaceState(null, '', `${import.meta.env.BASE_URL}#/ajustes`)
  if (err) throw new Error(`Spotify rechazó el acceso: ${err}`)
  if (!pending || !verifier || pending.state !== state) throw new Error('La respuesta de Spotify no coincide; intenta de nuevo.')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: redirectUri(),
      client_id: pending.clientId,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) throw new Error(`No se pudo obtener el token de Spotify (${res.status})`)
  saveToken(await res.json())
  localStorage.setItem('belceblues.spotifyClient', pending.clientId)
  return true
}

export function hasSpotifyToken() {
  return !!localStorage.getItem(TOKEN_KEY)
}

export function spotifyLogout() {
  localStorage.removeItem(TOKEN_KEY)
}

async function accessToken(clientId: string): Promise<string | null> {
  const raw = localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  const t = JSON.parse(raw) as Token
  if (Date.now() < t.expires_at) return t.access_token
  if (!t.refresh_token) return null
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: clientId }),
  })
  if (!res.ok) {
    spotifyLogout()
    return null
  }
  return saveToken(await res.json(), t.refresh_token).access_token
}

interface SpTrack {
  id: string | null
  type?: string
  name: string
  duration_ms: number
  artists: { name: string }[]
  album?: { name: string; release_date?: string; images?: { url: string; width?: number }[] }
  external_urls?: { spotify?: string }
}

interface SpEntry {
  added_at?: string
  item?: SpTrack | null
  track?: SpTrack | null
}

export interface SyncResult {
  added: number
  updated: number
  removed: number
  total: number
}

/** Lee la playlist completa y actualiza el catálogo de canciones de la banda. */
export async function syncPlaylist(settings: SpotifySettings): Promise<SyncResult> {
  const pid = playlistIdFrom(settings.playlistUrl)
  if (!pid) throw new Error('El link de la playlist no es válido')
  const token = await accessToken(settings.clientId)
  if (!token) throw new Error('NEED_LOGIN')

  const entries: SpEntry[] = []
  let next: string | null = `https://api.spotify.com/v1/playlists/${pid}/items?limit=50&additional_types=track`
  while (next) {
    const res: Response = await fetch(next, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 401) {
      spotifyLogout()
      throw new Error('NEED_LOGIN')
    }
    if (res.status === 403)
      throw new Error('Spotify negó el acceso (403). La cuenta conectada debe ser dueña o colaboradora de la playlist y estar registrada como usuario en la app de Spotify.')
    if (res.status === 404) throw new Error('No se encontró la playlist.')
    if (!res.ok) throw new Error(`Error de Spotify (${res.status})`)
    const page = (await res.json()) as { items: SpEntry[]; next: string | null }
    entries.push(...page.items)
    next = page.next
  }

  const tracks = entries
    .map((e, i) => ({ t: e.item ?? e.track, added_at: e.added_at ?? null, pos: i }))
    .filter((x): x is { t: SpTrack & { id: string }; added_at: string | null; pos: number } => !!x.t && !!x.t.id && (x.t.type ?? 'track') === 'track')

  const { data: existing, error } = await db().from('songs').select('id, spotify_id, in_playlist')
  if (error) throw error
  const bySpotify = new Map((existing ?? []).filter((s) => s.spotify_id).map((s) => [s.spotify_id as string, s]))

  const rows = tracks.map(({ t, added_at, pos }) => {
    const imgs = t.album?.images ?? []
    const img = imgs.find((i) => (i.width ?? 0) <= 320) ?? imgs[imgs.length - 1]
    const year = t.album?.release_date ? Number(t.album.release_date.slice(0, 4)) || null : null
    return {
      spotify_id: t.id,
      title: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      album: t.album?.name ?? null,
      year,
      duration_ms: t.duration_ms,
      image_url: img?.url ?? null,
      spotify_url: t.external_urls?.spotify ?? `https://open.spotify.com/track/${t.id}`,
      playlist_position: pos,
      added_at,
      in_playlist: true,
    }
  })

  // upsert por spotify_id: solo pisa los datos de Spotify; tono, notas y etiquetas de la banda se conservan.
  for (let i = 0; i < rows.length; i += 200) {
    const { error: e } = await db().from('songs').upsert(rows.slice(i, i + 200), { onConflict: 'spotify_id' })
    if (e) throw e
  }

  const current = new Set(rows.map((r) => r.spotify_id))
  const gone = (existing ?? []).filter((s) => s.spotify_id && s.in_playlist && !current.has(s.spotify_id)).map((s) => s.id)
  if (gone.length) {
    const { error: e } = await db().from('songs').update({ in_playlist: false, playlist_position: null }).in('id', gone)
    if (e) throw e
  }

  await saveSpotifySettings({ ...settings, lastSync: new Date().toISOString() })
  const added = rows.filter((r) => !bySpotify.has(r.spotify_id)).length
  return { added, updated: rows.length - added, removed: gone.length, total: rows.length }
}
