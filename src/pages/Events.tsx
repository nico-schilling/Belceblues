import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errMsg, useStore } from '../lib/store'
import { Icon, Modal, Spinner, useToast } from '../components/ui'
import type { EventRow } from '../lib/types'

const today = () => new Date().toLocaleDateString('sv')

function Ticket({ date }: { date: string | null }) {
  if (!date) return <div className="ticket"><b>?</b><span>s/f</span></div>
  const [y, m, d] = date.split('-').map(Number)
  const month = new Date(y, m - 1, d).toLocaleDateString('es', { month: 'short' }).replace('.', '')
  return (
    <div className="ticket">
      <b>{d}</b>
      <span>{month} {String(y).slice(2)}</span>
    </div>
  )
}

function EventList({ list }: { list: EventRow[] }) {
  return (
    <>
      {list.map((e) => (
        <Link key={e.id} to={`/evento/${e.id}`} className="card event-card">
          <Ticket date={e.event_date} />
          <div className="grow">
            <h3>{e.name}</h3>
            <div className="sub small">{e.venue || 'Lugar por definir'}</div>
          </div>
          <span className="muted">›</span>
        </Link>
      ))}
    </>
  )
}

export default function Events() {
  const { events, loading, error, createEvent } = useStore()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState(today())
  const [venue, setVenue] = useState('')
  const nav = useNavigate()
  const toast = useToast()

  if (loading) return <Spinner />
  const t = today()
  const upcoming = events.filter((e) => !e.event_date || e.event_date >= t).sort((a, b) => (a.event_date ?? '9').localeCompare(b.event_date ?? '9'))
  const past = events.filter((e) => e.event_date && e.event_date < t)

  const create = async () => {
    try {
      const ev = await createEvent({ name: name.trim(), event_date: date || null, venue: venue.trim() || null })
      setCreating(false)
      nav(`/evento/${ev.id}`)
    } catch (e) {
      toast(errMsg(e))
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Shows</h1>
          <div className="sub">Cada evento con su setlist</div>
        </div>
        <div className="row">
          <Link to="/proponer" className="btn amber">
            <Icon.magic /> Proponer
          </Link>
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Icon.plus /> Nuevo
          </button>
        </div>
      </div>
      {error && <div className="err">{error}</div>}

      {!events.length && (
        <div className="card empty">
          <h3>Todavía no hay shows</h3>
          <p>Crea el primero o pide una propuesta de setlist según el público.</p>
        </div>
      )}

      {upcoming.length > 0 && <div className="section-label">Próximos</div>}
      <EventList list={upcoming} />
      {past.length > 0 && <div className="section-label">Tocados</div>}
      <EventList list={past} />

      {creating && (
        <Modal
          title="Nuevo show"
          onClose={() => setCreating(false)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button className="btn primary" disabled={!name.trim()} onClick={create}>
                Crear
              </button>
            </>
          }
        >
          <div className="stack">
            <label className="field">
              Nombre del evento
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Viernes en El Bluesero" autoFocus />
            </label>
            <div className="grid2">
              <label className="field">
                Fecha
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="field">
                Lugar
                <input value={venue} onChange={(e) => setVenue(e.target.value)} />
              </label>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
