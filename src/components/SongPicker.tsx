import { useMemo, useState } from 'react'
import type { Song } from '../lib/types'
import { fmtDuration } from '../lib/music'
import { Energy, Icon, Modal } from './ui'

export function Cover({ song }: { song: Song }) {
  return song.image_url ? <img className="cover" src={song.image_url} alt="" loading="lazy" /> : <div className="cover" />
}

export function matches(s: Song, q: string) {
  if (!q) return true
  const n = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const needle = n(q)
  return n(`${s.title} ${s.artist} ${s.style ?? ''} ${s.album ?? ''}`).includes(needle)
}

export default function SongPicker({ songs, already, onClose, onAdd }: { songs: Song[]; already: Set<string>; onClose: () => void; onAdd: (ids: string[]) => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const [hideUsed, setHideUsed] = useState(true)
  const list = useMemo(() => songs.filter((s) => s.in_playlist && matches(s, q) && !(hideUsed && already.has(s.id))), [songs, q, hideUsed, already])

  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <Modal
      title="Agregar canciones"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={!sel.length} onClick={() => onAdd(sel)}>
            <Icon.plus /> Agregar {sel.length || ''}
          </button>
        </>
      }
    >
      <div className="stack">
        <input type="search" placeholder="Buscar canción, artista o estilo…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <label className="row small muted">
          <input type="checkbox" checked={hideUsed} onChange={(e) => setHideUsed(e.target.checked)} /> Ocultar las que ya están en el setlist
        </label>
        <div>
          {list.map((s) => {
            const on = sel.includes(s.id)
            return (
              <button key={s.id} className={`song-row${on ? ' selected' : ''}`} onClick={() => toggle(s.id)}>
                <span className="check">{on && <Icon.check />}</span>
                <Cover song={s} />
                <span className="grow">
                  <div className="sl-title">
                    {sel.includes(s.id) && <span className="pill-num">{sel.indexOf(s.id) + 1}</span>} {s.title}
                  </div>
                  <div className="sl-sub">
                    {s.artist} · {fmtDuration(s.duration_ms)}
                    {already.has(s.id) && ' · ya en el setlist'}
                  </div>
                </span>
                {s.default_key && <span className="tag key">{s.default_key}</span>}
                <Energy value={s.energy} />
              </button>
            )
          })}
          {!list.length && <p className="empty">No hay canciones que coincidan.</p>}
        </div>
      </div>
    </Modal>
  )
}
