import { Fragment, useState } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { DraftItem, Song } from '../lib/types'
import { CUES, TRANSITIONS, fmtDuration, transitionShort, uid } from '../lib/music'
import { useStore } from '../lib/store'
import { KeySelect } from './SongEditor'
import Player from './Player'
import { Chips, Icon } from './ui'

interface Props {
  items: DraftItem[]
  songs: Map<string, Song>
  onChange: (items: DraftItem[]) => void
  reasons?: Map<string, string[]>
}

export default function SetlistEditor({ items, songs, onChange, reasons }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = items.findIndex((i) => i.id === e.active.id)
    const to = items.findIndex((i) => i.id === e.over!.id)
    onChange(arrayMove(items, from, to))
  }

  const update = (id: string, patch: Partial<DraftItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id))
  const insertCue = (at: number) => {
    const cue: DraftItem = { id: uid(), kind: 'cue', song_id: null, song_key: null, transition_type: null, transition: null, notes: null, label: null, speaker: null }
    onChange([...items.slice(0, at), cue, ...items.slice(at)])
    setOpen(cue.id)
  }
  const move = (id: string, d: number) => {
    const i = items.findIndex((x) => x.id === id)
    const j = i + d
    if (j < 0 || j >= items.length) return
    onChange(arrayMove(items, i, j))
  }

  let n = 0
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="setlist">
          {items.length > 0 && <Inserter onClick={() => insertCue(0)} />}
          {items.map((it, idx) => {
            if (it.kind === 'song') n++
            // Siguiente elemento musical, saltando los momentos hablados.
            const next = items.slice(idx + 1).find((x) => x.kind !== 'cue')
            const showTransition = it.kind === 'song' && next?.kind === 'song' && (it.transition_type || it.transition)
            return (
              <Fragment key={it.id}>
                {it.kind === 'cue' ? (
                  <CueRow item={it} open={open === it.id} onToggle={() => setOpen(open === it.id ? null : it.id)} onUpdate={(p) => update(it.id, p)} onRemove={() => remove(it.id)} />
                ) : (
                  <Row
                    item={it}
                    num={n}
                    song={it.song_id ? songs.get(it.song_id) : undefined}
                    open={open === it.id}
                    isLast={!next || next.kind === 'break'}
                    reasons={it.song_id ? reasons?.get(it.song_id) : undefined}
                    onToggle={() => setOpen(open === it.id ? null : it.id)}
                    onUpdate={(p) => update(it.id, p)}
                    onRemove={() => remove(it.id)}
                    onMove={(d) => move(it.id, d)}
                    transition={showTransition ? [transitionShort(it.transition_type), it.transition].filter(Boolean).join(': ') : null}
                  />
                )}
                {items[idx + 1]?.kind !== 'cue' && <Inserter onClick={() => insertCue(idx + 1)} />}
              </Fragment>
            )
          })}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function Row({
  item,
  num,
  song,
  open,
  isLast,
  reasons,
  transition,
  onToggle,
  onUpdate,
  onRemove,
  onMove,
}: {
  item: DraftItem
  num: number
  song?: Song
  open: boolean
  isLast: boolean
  reasons?: string[]
  transition: string | null
  onToggle: () => void
  onUpdate: (p: Partial<DraftItem>) => void
  onRemove: () => void
  onMove: (d: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition: tr, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition: tr }

  if (item.kind === 'break') {
    return (
      <li ref={setNodeRef} style={style} className={`sl-item sl-break${isDragging ? ' dragging' : ''}`}>
        <div className="sl-main">
          <button className="handle" {...attributes} {...listeners} aria-label="Arrastrar">
            <Icon.grip />
          </button>
          <Icon.pause />
          <input className="grow" style={{ background: 'transparent', border: 0, fontFamily: 'var(--font-title)', color: '#ffc1b3' }} value={item.label ?? ''} placeholder="Intermedio" onChange={(e) => onUpdate({ label: e.target.value })} />
          <button className="btn icon ghost" onClick={onRemove} aria-label="Quitar intermedio">
            <Icon.x />
          </button>
        </div>
      </li>
    )
  }

  return (
    <>
      <li ref={setNodeRef} style={style} className={`sl-item${isDragging ? ' dragging' : ''}`}>
        <div className="sl-main">
          <button className="handle" {...attributes} {...listeners} aria-label="Arrastrar para reordenar">
            <Icon.grip />
          </button>
          <span className="num">{num}</span>
          <button className="grow" style={{ all: 'unset', cursor: 'pointer', minWidth: 0, flex: 1 }} onClick={onToggle} aria-expanded={open}>
            <div className="sl-title">{song?.title ?? '(canción eliminada)'}</div>
            <div className="sl-sub">
              {song?.artist} {song && `· ${fmtDuration(song.duration_ms)}`}
              {song?.singers?.length ? ` · 🎤 ${song.singers.join(', ')}` : ''}
              {item.notes && ' · 📝'}
            </div>
            {reasons && reasons.length > 0 && <div className="reason">{reasons.slice(0, 3).join(' · ')}</div>}
          </button>
          {item.song_key ? <span className="tag key">{item.song_key}</span> : <span className="tag">tono?</span>}
          <button className="btn icon ghost" onClick={onToggle} aria-label="Editar">
            <Icon.edit />
          </button>
        </div>
        {open && (
          <div className="sl-edit stack">
            {song && <Player song={song} />}
            <div className="grid2">
              <label className="field">
                Tono para este show
                <KeySelect value={item.song_key} onChange={(v) => onUpdate({ song_key: v })} placeholder="Sin tono" />
              </label>
              {!isLast && (
                <label className="field">
                  Transición a la siguiente
                  <select value={item.transition_type ?? ''} onChange={(e) => onUpdate({ transition_type: e.target.value || null })}>
                    <option value="">—</option>
                    {TRANSITIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {!isLast && (
              <label className="field">
                Detalle de la transición
                <input value={item.transition ?? ''} placeholder="Ej: queda sonando el acorde de E7 y entra el bajo…" onChange={(e) => onUpdate({ transition: e.target.value || null })} />
              </label>
            )}
            <label className="field">
              Observaciones
              <textarea value={item.notes ?? ''} placeholder="Ej: solo de guitarra doble, final con stop, Juan canta el puente…" onChange={(e) => onUpdate({ notes: e.target.value || null })} />
            </label>
            <div className="row">
              <button className="btn small" onClick={() => onMove(-1)} aria-label="Subir">
                <Icon.up /> Subir
              </button>
              <button className="btn small" onClick={() => onMove(1)} aria-label="Bajar">
                <Icon.down /> Bajar
              </button>
              <span className="grow" />
              <button className="btn small danger" onClick={onRemove}>
                <Icon.trash /> Quitar
              </button>
            </div>
          </div>
        )}
      </li>
      {transition && !open && <li className="transition">{transition}</li>}
    </>
  )
}

function Inserter({ onClick }: { onClick: () => void }) {
  return (
    <li className="inserter">
      <button type="button" onClick={onClick}>
        <Icon.plus /> momento
      </button>
    </li>
  )
}

function CueRow({ item, open, onToggle, onUpdate, onRemove }: { item: DraftItem; open: boolean; onToggle: () => void; onUpdate: (p: Partial<DraftItem>) => void; onRemove: () => void }) {
  const { members } = useStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const preset = item.label && CUES.includes(item.label) ? item.label : null
  return (
    <li ref={setNodeRef} style={style} className={`sl-item sl-cue${isDragging ? ' dragging' : ''}`}>
      <div className="sl-main">
        <button className="handle" {...attributes} {...listeners} aria-label="Arrastrar">
          <Icon.grip />
        </button>
        <span className="cue-icon" aria-hidden>
          <Icon.mic />
        </span>
        <button className="grow" style={{ all: 'unset', cursor: 'pointer', minWidth: 0, flex: 1 }} onClick={onToggle} aria-expanded={open}>
          <div className="sl-title">{item.label || 'Momento entre canciones'}</div>
          {(item.speaker || item.notes) && <div className="sl-sub">{[item.speaker, item.notes].filter(Boolean).join(' · ')}</div>}
        </button>
        <button className="btn icon ghost" onClick={onToggle} aria-label="Editar momento">
          <Icon.edit />
        </button>
      </div>
      {open && (
        <div className="sl-edit stack">
          <div className="field">
            Qué ocurre
            <Chips options={CUES} value={preset ? [preset] : []} single onChange={(v) => onUpdate({ label: v[0] ?? null })} />
          </div>
          <label className="field">
            O escríbelo
            <input value={item.label ?? ''} placeholder="Ej: Sorteo de la rifa" onChange={(e) => onUpdate({ label: e.target.value || null })} />
          </label>
          <label className="field">
            Quién lo hace
            <select value={item.speaker ?? ''} onChange={(e) => onUpdate({ speaker: e.target.value || null })}>
              <option value="">—</option>
              <option>Toda la banda</option>
              {members.map((m) => (
                <option key={m}>{m}</option>
              ))}
              {item.speaker && item.speaker !== 'Toda la banda' && !members.includes(item.speaker) && <option>{item.speaker}</option>}
            </select>
          </label>
          <label className="field">
            Detalle
            <textarea value={item.notes ?? ''} placeholder="Ej: nombrar a Ana y Pedro, contar que el tema es de 1969…" onChange={(e) => onUpdate({ notes: e.target.value || null })} />
          </label>
          <div className="row end">
            <button className="btn small danger" onClick={onRemove}>
              <Icon.trash /> Quitar momento
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
