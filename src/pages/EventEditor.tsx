import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { errMsg, useStore } from '../lib/store'
import type { DraftItem, EventRow } from '../lib/types'
import { fmtDate, fmtTotal, uid } from '../lib/music'
import { buildSetlistPdf, downloadPdf, pdfFileName, sharePdfFile, type PdfMode } from '../lib/pdf'
import SetlistEditor from '../components/SetlistEditor'
import SongPicker from '../components/SongPicker'
import { Icon, Modal, Spinner, useToast } from '../components/ui'

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

export default function EventEditor() {
  const { id } = useParams<{ id: string }>()
  const { events, songMap, songs, loadItems, saveItems, saveEvent, deleteEvent, lastRemoteChange, loading } = useStore()
  const event = events.find((e) => e.id === id)
  const [items, setItems] = useState<DraftItem[] | null>(null)
  const [save, setSave] = useState<SaveState>('saved')
  const [picking, setPicking] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nav = useNavigate()
  const toast = useToast()

  const load = useCallback(async () => {
    if (!id) return
    try {
      const rows = await loadItems(id)
      setItems(rows.map(({ event_id: _e, position: _p, ...r }) => r))
    } catch (e) {
      toast(errMsg(e))
    }
  }, [id, loadItems, toast])

  useEffect(() => {
    load()
  }, [load])

  // Si otro integrante cambió algo y no tenemos cambios sin guardar, recargamos.
  useEffect(() => {
    if (lastRemoteChange && save === 'saved') load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRemoteChange])

  const change = (next: DraftItem[]) => {
    setItems(next)
    setSave('dirty')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setSave('saving')
      try {
        await saveItems(id!, next)
        setSave('saved')
      } catch (e) {
        setSave('error')
        toast(`No se pudo guardar: ${errMsg(e)}`)
      }
    }, 700)
  }

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save !== 'saved') e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [save])

  if (loading || (event && !items)) return <Spinner />
  if (!event || !items)
    return (
      <div className="card empty">
        <h3>Show no encontrado</h3>
        <Link to="/" className="btn">
          Volver
        </Link>
      </div>
    )

  const songItems = items.filter((i) => i.kind === 'song')
  const total = songItems.reduce((a, i) => a + ((i.song_id && songMap.get(i.song_id)?.duration_ms) || 0), 0)
  const already = new Set(songItems.map((i) => i.song_id!).filter(Boolean))
  const missingKey = songItems.filter((i) => !i.song_key).length

  const addSongs = (ids: string[]) => {
    const add: DraftItem[] = ids.map((sid) => {
      const s = songMap.get(sid)
      return { id: uid(), kind: 'song', song_id: sid, song_key: s?.default_key ?? null, transition_type: null, transition: null, notes: s?.notes ?? null, label: null, speaker: null }
    })
    change([...items, ...add])
    setPicking(false)
  }

  const addBreak = () => {
    const sets = items.filter((i) => i.kind === 'break').length + 1
    change([...items, { id: uid(), kind: 'break', song_id: null, song_key: null, transition_type: null, transition: null, notes: null, label: `Fin del set ${sets} — intermedio`, speaker: null }])
  }

  // Importante: sin awaits antes de compartir/descargar, Safari exige que ocurra dentro del toque.
  const buildPdf = (mode: PdfMode) => {
    const full = items.map((it, i) => ({ ...it, event_id: event.id, position: i }))
    return { doc: buildSetlistPdf(event, full, songMap, mode), name: pdfFileName(event, mode) }
  }
  const eventUrl = `${location.origin}${import.meta.env.BASE_URL}#/evento/${event.id}`
  const shareText = `Setlist de ${event.name} (${fmtDate(event.event_date)})`

  const sendWhatsApp = (mode: PdfMode) => {
    try {
      const { doc, name } = buildPdf(mode)
      const r = sharePdfFile(doc, name, shareText)
      if (r === 'unsupported') {
        // En computador no se pueden adjuntar archivos: se descarga y se abre WhatsApp para adjuntarlo.
        downloadPdf(doc, name)
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} - adjunto el PDF`)}`, '_blank', 'noopener')
        toast('PDF descargado: adjúntalo en el chat de WhatsApp')
      } else {
        r.catch((e) => toast(`No se pudo compartir: ${errMsg(e)}`))
      }
      setPdfOpen(false)
    } catch (e) {
      toast(`No se pudo compartir: ${errMsg(e)}`)
    }
  }

  const pdf = (mode: PdfMode) => {
    try {
      const { doc, name } = buildPdf(mode)
      const r = downloadPdf(doc, name)
      if (r === 'downloaded') toast('PDF descargado')
      setPdfOpen(false)
    } catch (e) {
      toast(`No se pudo generar el PDF: ${errMsg(e)}`)
    }
  }

  const shareMore = () => {
    if (navigator.share) {
      navigator.share({ title: shareText, text: shareText, url: eventUrl }).catch(() => {})
    } else {
      copyLink()
    }
    setShareOpen(false)
  }
  const copyLink = () => {
    navigator.clipboard?.writeText(eventUrl).then(
      () => toast('Link copiado'),
      () => toast(eventUrl),
    )
    setShareOpen(false)
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <Link to="/" className="btn small ghost">
          <Icon.back /> Shows
        </Link>
        <span className="grow" />
        <span className="small muted" aria-live="polite">
          {{ saved: 'Guardado', dirty: 'Cambios…', saving: 'Guardando…', error: 'Error al guardar' }[save]}
        </span>
      </div>

      <div className="card">
        <div className="row">
          <div className="grow">
            <h1 style={{ marginBottom: 2 }}>{event.name}</h1>
            <div className="sub">
              {fmtDate(event.event_date)}
              {event.venue && ` · ${event.venue}`}
            </div>
          </div>
          <button className="btn icon" onClick={() => setEditingInfo(true)} aria-label="Editar datos del show">
            <Icon.edit />
          </button>
        </div>
        {event.notes && <p className="note" style={{ marginBottom: 0 }}>{event.notes}</p>}
        <div className="totals" style={{ marginTop: 10 }}>
          <span>
            <b>{songItems.length}</b> canciones
          </span>
          <span>
            <b>{fmtTotal(total)}</b> de música
          </span>
          {missingKey > 0 && <span className="tag warn">{missingKey} sin tono</span>}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn amber" onClick={() => setPdfOpen(true)} disabled={!items.length}>
            <Icon.pdf /> PDF
          </button>
          <button className="btn" onClick={() => setShareOpen(true)}>
            <Icon.share /> Compartir
          </button>
          <Link className="btn" to={`/proponer?evento=${event.id}`}>
            <Icon.magic /> Proponer
          </Link>
        </div>
      </div>

      <div className="section-label">Setlist</div>
      {!items.length && (
        <div className="card empty">
          <h3>Setlist vacío</h3>
          <p>Agrega canciones de la playlist o pide una propuesta.</p>
        </div>
      )}
      <SetlistEditor items={items} songs={songMap} onChange={change} />

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary grow" onClick={() => setPicking(true)}>
          <Icon.plus /> Canciones
        </button>
        <button className="btn" onClick={addBreak}>
          <Icon.pause /> Intermedio
        </button>
      </div>

      <div className="row end" style={{ marginTop: 28 }}>
        <button
          className="btn small danger"
          onClick={async () => {
            if (!confirm(`¿Borrar "${event.name}" y su setlist?`)) return
            await deleteEvent(event.id)
            nav('/')
          }}
        >
          <Icon.trash /> Borrar show
        </button>
      </div>

      {picking && <SongPicker songs={songs} already={already} onClose={() => setPicking(false)} onAdd={addSongs} />}
      {editingInfo && <EventInfoModal event={event} onClose={() => setEditingInfo(false)} onSave={(p) => saveEvent(event.id, p)} />}
      {pdfOpen && (
        <Modal title="PDF del setlist" onClose={() => setPdfOpen(false)}>
          <div className="stack">
            <button className="btn primary" style={{ width: '100%' }} onClick={() => pdf('stage')}>
              <Icon.pdf /> Para el escenario (letra grande)
            </button>
            <p className="small muted" style={{ marginTop: 4 }}>
              Título, tono, transiciones y observaciones bien grandes para leer desde el piso.
            </p>
            <button className="btn" style={{ width: '100%' }} onClick={() => pdf('detail')}>
              <Icon.pdf /> Detallado
            </button>
            <p className="small muted" style={{ marginTop: 4 }}>
              Incluye artista original, duración y notas del show. Ideal para ensayar o mandar al sonidista.
            </p>
            <div className="section-label" style={{ marginTop: 18 }}>
              Enviar por WhatsApp
            </div>
            <div className="row">
              <button className="btn whatsapp grow" onClick={() => sendWhatsApp('stage')}>
                <Icon.whatsapp /> Escenario
              </button>
              <button className="btn whatsapp grow" onClick={() => sendWhatsApp('detail')}>
                <Icon.whatsapp /> Detallado
              </button>
            </div>
            <p className="small muted" style={{ marginTop: 4 }}>
              En el teléfono se abre el menú para compartir con el PDF adjunto: elige WhatsApp y el chat de la banda.
            </p>
          </div>
        </Modal>
      )}
      {shareOpen && (
        <Modal title="Compartir setlist" onClose={() => setShareOpen(false)}>
          <div className="stack">
            <a
              className="btn whatsapp"
              style={{ width: '100%' }}
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText}: ${eventUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShareOpen(false)}
            >
              <Icon.whatsapp /> Enviar link por WhatsApp
            </a>
            <button className="btn" style={{ width: '100%' }} onClick={shareMore}>
              <Icon.share /> Más opciones…
            </button>
            <button className="btn ghost" style={{ width: '100%' }} onClick={copyLink}>
              Copiar link
            </button>
            <p className="small muted">El link abre este show en la app (hay que ingresar el código de banda la primera vez).</p>
          </div>
        </Modal>
      )}
    </>
  )
}

function EventInfoModal({ event, onClose, onSave }: { event: EventRow; onClose: () => void; onSave: (p: Partial<EventRow>) => Promise<void> }) {
  const [name, setName] = useState(event.name)
  const [date, setDate] = useState(event.event_date ?? '')
  const [venue, setVenue] = useState(event.venue ?? '')
  const [notes, setNotes] = useState(event.notes ?? '')
  const toast = useToast()
  return (
    <Modal
      title="Datos del show"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn primary"
            disabled={!name.trim()}
            onClick={async () => {
              try {
                await onSave({ name: name.trim(), event_date: date || null, venue: venue.trim() || null, notes: notes.trim() || null })
                onClose()
              } catch (e) {
                toast(errMsg(e))
              }
            }}
          >
            Guardar
          </button>
        </>
      }
    >
      <div className="stack">
        <label className="field">
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} />
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
        <label className="field">
          Notas generales (horarios, equipos, prueba de sonido…)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
    </Modal>
  )
}
