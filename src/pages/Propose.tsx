import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { errMsg, useStore } from '../lib/store'
import type { Audience, DraftItem } from '../lib/types'
import { EVENT_TYPES, MOODS, STYLES, fmtTotal } from '../lib/music'
import { propose, type Proposal } from '../lib/recommend'
import SetlistEditor from '../components/SetlistEditor'
import { Chips, Icon, Spinner, useToast } from '../components/ui'

const DEFAULT: Audience = { ageMin: 30, ageMax: 55, styles: ['Blues', 'Blues rock'], moods: ['Fiestero'], eventType: 'Bar / pub', energy: 4, durationMin: 90, sets: 2 }

export default function Propose() {
  const [params] = useSearchParams()
  const eventId = params.get('evento')
  const { songs, events, loading, createEvent, saveEvent, saveItems, loadItems } = useStore()
  const event = events.find((e) => e.id === eventId)
  const [a, setA] = useState<Audience>(event?.audience ?? DEFAULT)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [items, setItems] = useState<DraftItem[]>([])
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()
  const toast = useToast()
  const songMap = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])
  const reasons = useMemo(() => new Map([...(proposal?.picks.entries() ?? [])].map(([k, p]) => [k, p.reasons])), [proposal])
  const active = songs.filter((s) => s.in_playlist)
  const tagged = active.filter((s) => s.style || s.moods.length).length

  if (loading) return <Spinner />

  const set = <K extends keyof Audience>(k: K, v: Audience[K]) => setA((p) => ({ ...p, [k]: v }))

  const run = (seed?: number) => {
    const p = propose(songs, a, seed)
    setProposal(p)
    setItems(p.items)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const total = items.reduce((acc, i) => acc + ((i.song_id && songMap.get(i.song_id)?.duration_ms) || 0), 0)

  const saveNew = async () => {
    setBusy(true)
    try {
      const ev = await createEvent({ name: name.trim() || `Show ${a.eventType}`, event_date: date || null, audience: a }, items)
      nav(`/evento/${ev.id}`)
    } catch (e) {
      toast(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  const applyTo = async (mode: 'replace' | 'append') => {
    if (!event) return
    setBusy(true)
    try {
      let next = items
      if (mode === 'append') {
        const current = (await loadItems(event.id)).map(({ event_id: _e, position: _p, ...r }) => r)
        next = [...current, ...items]
      } else if (!confirm('¿Reemplazar el setlist actual del show con esta propuesta?')) {
        return
      }
      await saveItems(event.id, next)
      await saveEvent(event.id, { audience: a })
      nav(`/evento/${event.id}`)
    } catch (e) {
      toast(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  if (proposal) {
    return (
      <>
        <div className="row" style={{ marginBottom: 8 }}>
          <button className="btn small ghost" onClick={() => setProposal(null)}>
            <Icon.back /> Ajustar público
          </button>
        </div>
        <div className="page-head">
          <div>
            <h1>Setlist propuesto</h1>
            <div className="sub">
              {items.filter((i) => i.kind === 'song').length} canciones · {fmtTotal(total)} · {a.eventType}, {a.ageMin}–{a.ageMax} años
            </div>
          </div>
          <button className="btn" onClick={() => run(Date.now())}>
            <Icon.sync /> Otra
          </button>
        </div>
        <p className="small muted">Arranca arriba, respira en el medio y cierra a full. Puedes reordenar, quitar canciones y ajustar tonos antes de guardar.</p>
        <SetlistEditor items={items} songs={songMap} onChange={setItems} reasons={reasons} />
        <div className="card stack" style={{ marginTop: 16 }}>
          {event ? (
            <>
              <h3>Usar en «{event.name}»</h3>
              <div className="row">
                <button className="btn primary grow" disabled={busy || !items.length} onClick={() => applyTo('replace')}>
                  Reemplazar setlist
                </button>
                <button className="btn grow" disabled={busy || !items.length} onClick={() => applyTo('append')}>
                  Agregar al final
                </button>
              </div>
            </>
          ) : (
            <>
              <h3>Guardar como show nuevo</h3>
              <div className="grid2">
                <label className="field">
                  Nombre
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Fiesta de Pedro" />
                </label>
                <label className="field">
                  Fecha
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
              </div>
              <button className="btn primary" disabled={busy || !items.length} onClick={saveNew}>
                Crear show con este setlist
              </button>
            </>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Proponer setlist</h1>
          <div className="sub">{event ? `Para «${event.name}»` : 'Cuéntame del público y armo la lista ideal'}</div>
        </div>
      </div>

      {!active.length && (
        <div className="err">
          No hay canciones en el repertorio. <Link to="/ajustes">Sincroniza la playlist</Link> primero.
        </div>
      )}
      {active.length > 0 && tagged < active.length / 2 && (
        <div className="card small" style={{ borderColor: 'var(--whiskey)' }}>
          Solo {tagged} de {active.length} canciones tienen estilo o ánimo cargado. <Link to="/repertorio">Etiquétalas</Link> para mejores propuestas.
        </div>
      )}

      <div className="card stack" style={{ marginTop: 12 }}>
        <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="field">
            Edad desde
            <input type="number" inputMode="numeric" min={5} max={99} value={a.ageMin} onChange={(e) => set('ageMin', Number(e.target.value) || 0)} onBlur={() => a.ageMin > a.ageMax && set('ageMax', a.ageMin)} />
          </label>
          <label className="field">
            Edad hasta
            <input type="number" inputMode="numeric" min={5} max={99} value={a.ageMax} onChange={(e) => set('ageMax', Number(e.target.value) || 0)} onBlur={() => a.ageMax < a.ageMin && set('ageMin', a.ageMax)} />
          </label>
        </div>
        <div className="field">
          Estilo que les gusta
          <Chips options={STYLES} value={a.styles} onChange={(v) => set('styles', v)} />
        </div>
        <div className="field">
          Ánimo buscado
          <Chips options={MOODS} value={a.moods} onChange={(v) => set('moods', v)} />
        </div>
        <div className="field">
          Tipo de evento
          <Chips options={EVENT_TYPES} value={[a.eventType]} single onChange={(v) => set('eventType', v[0] ?? a.eventType)} />
        </div>
        <label className="field">
          Nivel de energía: {a.energy}/5 {['', '· tranqui', '· suave', '· media', '· arriba', '· a full'][a.energy]}
          <input type="range" min={1} max={5} value={a.energy} onChange={(e) => set('energy', Number(e.target.value))} />
        </label>
        <div className="grid2">
          <label className="field">
            Duración total (min)
            <input type="number" inputMode="numeric" min={10} max={300} value={a.durationMin} onChange={(e) => set('durationMin', Number(e.target.value) || 60)} />
          </label>
          <label className="field">
            Cantidad de sets
            <select value={a.sets} onChange={(e) => set('sets', Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn amber" disabled={!active.length} onClick={() => run()}>
          <Icon.magic /> Armar setlist
        </button>
      </div>
    </>
  )
}
