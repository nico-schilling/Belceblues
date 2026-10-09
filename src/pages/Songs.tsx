import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { errMsg, useStore } from '../lib/store'
import type { Song } from '../lib/types'
import { fmtDuration } from '../lib/music'
import SongEditor, { type SongForm } from '../components/SongEditor'
import { Cover, matches } from '../components/SongPicker'
import { Energy, Icon, Spinner, useToast } from '../components/ui'

type Filter = 'all' | 'nokey' | 'untagged' | 'out'

export default function Songs() {
  const { songs, loading, saveSong, addSong, deleteSong } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Song | 'new' | null>(null)
  const toast = useToast()

  const list = useMemo(
    () =>
      songs.filter((s) => {
        if (!matches(s, q)) return false
        if (filter === 'nokey') return s.in_playlist && !s.default_key
        if (filter === 'untagged') return s.in_playlist && (!s.style || !s.moods.length)
        if (filter === 'out') return !s.in_playlist
        return s.in_playlist
      }),
    [songs, q, filter],
  )

  if (loading) return <Spinner />
  const active = songs.filter((s) => s.in_playlist)
  const nokey = active.filter((s) => !s.default_key).length
  const untagged = active.filter((s) => !s.style || !s.moods.length).length
  const out = songs.length - active.length

  const save = async (f: SongForm) => {
    try {
      if (editing === 'new') await addSong({ ...f, in_playlist: true })
      else if (editing) await saveSong(editing.id, f)
      toast('Canción guardada')
    } catch (e) {
      toast(errMsg(e))
      throw e
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Repertorio</h1>
          <div className="sub">{active.length} canciones en la playlist</div>
        </div>
        <button className="btn" onClick={() => setEditing('new')}>
          <Icon.plus /> Manual
        </button>
      </div>

      {!songs.length && (
        <div className="card empty">
          <h3>El repertorio está vacío</h3>
          <p>Conecta la playlist de Spotify de la banda para cargar las canciones.</p>
          <Link to="/ajustes" className="btn amber">
            <Icon.spotify /> Conectar Spotify
          </Link>
        </div>
      )}

      {songs.length > 0 && (
        <div className="stack">
          <input type="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="chips">
            {(
              [
                ['all', 'Todas'],
                ['nokey', `Sin tono (${nokey})`],
                ['untagged', `Sin etiquetar (${untagged})`],
                ['out', `Fuera de la playlist (${out})`],
              ] as [Filter, string][]
            ).map(([k, l]) => (
              <button key={k} className={`chip${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>
                {l}
              </button>
            ))}
          </div>
          {untagged > 0 && filter === 'all' && (
            <p className="small muted">Tip: etiqueta estilo, ánimo y energía de cada canción para que las propuestas de setlist sean más certeras.</p>
          )}
          <div>
            {list.map((s) => (
              <button key={s.id} className="song-row" onClick={() => setEditing(s)}>
                <Cover song={s} />
                <span className="grow" style={{ minWidth: 0 }}>
                  <div className="sl-title">{s.title}</div>
                  <div className="sl-sub">
                    {s.artist} · {fmtDuration(s.duration_ms)}
                    {s.style && ` · ${s.style}`}
                    {s.well_known && ' · ★'}
                    {s.singers.length > 0 && ` · 🎤 ${s.singers.join(', ')}`}
                  </div>
                </span>
                {s.default_key ? <span className="tag key">{s.default_key}</span> : <span className="tag">tono?</span>}
                <Energy value={s.energy} />
              </button>
            ))}
            {!list.length && <p className="empty">Nada por aquí.</p>}
          </div>
        </div>
      )}

      {editing && (
        <SongEditor
          song={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={editing !== 'new' ? () => deleteSong(editing.id) : undefined}
        />
      )}
    </>
  )
}
