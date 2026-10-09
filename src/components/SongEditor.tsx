import { useState } from 'react'
import type { Song } from '../lib/types'
import { KEYS, MOODS, STYLES, fmtDuration } from '../lib/music'
import { Chips, Icon, Modal } from './ui'

export type SongForm = Pick<Song, 'title' | 'artist' | 'year' | 'duration_ms' | 'default_key' | 'notes' | 'energy' | 'style' | 'moods' | 'danceable' | 'well_known'>

export function KeySelect({ value, onChange, placeholder = 'Sin definir' }: { value: string | null; onChange: (v: string | null) => void; placeholder?: string }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{placeholder}</option>
      <optgroup label="Mayores">
        {KEYS.filter((k) => !k.endsWith('m')).map((k) => (
          <option key={k}>{k}</option>
        ))}
      </optgroup>
      <optgroup label="Menores">
        {KEYS.filter((k) => k.endsWith('m')).map((k) => (
          <option key={k}>{k}</option>
        ))}
      </optgroup>
      {value && !KEYS.includes(value) && <option>{value}</option>}
    </select>
  )
}

export default function SongEditor({ song, onClose, onSave, onDelete }: { song: Song | null; onClose: () => void; onSave: (f: SongForm) => Promise<void>; onDelete?: () => Promise<void> }) {
  const manual = !song?.spotify_id
  const [f, setF] = useState<SongForm>({
    title: song?.title ?? '',
    artist: song?.artist ?? '',
    year: song?.year ?? null,
    duration_ms: song?.duration_ms ?? null,
    default_key: song?.default_key ?? null,
    notes: song?.notes ?? '',
    energy: song?.energy ?? 3,
    style: song?.style ?? null,
    moods: song?.moods ?? [],
    danceable: song?.danceable ?? false,
    well_known: song?.well_known ?? false,
  })
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof SongForm>(k: K, v: SongForm[K]) => setF((p) => ({ ...p, [k]: v }))
  const minutes = f.duration_ms ? Math.round(f.duration_ms / 1000) : ''

  const save = async () => {
    setBusy(true)
    try {
      await onSave({ ...f, notes: f.notes?.trim() || null })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={song ? song.title : 'Nueva canción'}
      onClose={onClose}
      footer={
        <>
          {onDelete && manual && (
            <button
              className="btn danger"
              onClick={async () => {
                if (confirm('¿Eliminar esta canción del repertorio?')) {
                  await onDelete()
                  onClose()
                }
              }}
            >
              <Icon.trash />
            </button>
          )}
          <span className="grow" />
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy || !f.title.trim()} onClick={save}>
            Guardar
          </button>
        </>
      }
    >
      <div className="stack">
        {manual ? (
          <>
            <div className="grid2">
              <label className="field">
                Título
                <input value={f.title} onChange={(e) => set('title', e.target.value)} />
              </label>
              <label className="field">
                Artista original
                <input value={f.artist} onChange={(e) => set('artist', e.target.value)} />
              </label>
            </div>
            <div className="grid2">
              <label className="field">
                Año
                <input type="number" inputMode="numeric" value={f.year ?? ''} onChange={(e) => set('year', e.target.value ? Number(e.target.value) : null)} />
              </label>
              <label className="field">
                Duración (segundos)
                <input type="number" inputMode="numeric" value={minutes} onChange={(e) => set('duration_ms', e.target.value ? Number(e.target.value) * 1000 : null)} />
              </label>
            </div>
          </>
        ) : (
          <p className="sub">
            {song!.artist} · {song!.album} {song!.year ? `(${song!.year})` : ''} · {fmtDuration(song!.duration_ms)}
            {!song!.in_playlist && <span className="tag warn"> fuera de la playlist</span>}
          </p>
        )}
        <div className="grid2">
          <label className="field">
            Tono habitual de la banda
            <KeySelect value={f.default_key} onChange={(v) => set('default_key', v)} />
          </label>
          <label className="field">
            Estilo
            <select value={f.style ?? ''} onChange={(e) => set('style', e.target.value || null)}>
              <option value="">Sin definir</option>
              {STYLES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Energía: {f.energy}/5 {['', '· tranqui', '· suave', '· media', '· arriba', '· a full'][f.energy]}
          <input type="range" min={1} max={5} value={f.energy} onChange={(e) => set('energy', Number(e.target.value))} />
        </label>
        <div className="field">
          Ánimo
          <Chips options={MOODS} value={f.moods} onChange={(v) => set('moods', v)} />
        </div>
        <div className="row">
          <label className="row">
            <input type="checkbox" checked={f.well_known} onChange={(e) => set('well_known', e.target.checked)} /> Muy conocida / hit
          </label>
          <label className="row">
            <input type="checkbox" checked={f.danceable} onChange={(e) => set('danceable', e.target.checked)} /> Bailable
          </label>
        </div>
        <label className="field">
          Observaciones por defecto
          <textarea value={f.notes ?? ''} placeholder="Ej: arranca la guitarra sola, solo de armónica en el 2º puente…" onChange={(e) => set('notes', e.target.value)} />
        </label>
        <p className="small muted">Estos datos se usan para proponer setlists y se copian al agregar la canción a un evento.</p>
      </div>
    </Modal>
  )
}
