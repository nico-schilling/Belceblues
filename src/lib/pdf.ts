import { jsPDF } from 'jspdf'
import type { EventRow, SetlistItem, Song } from './types'
import { fmtDate, fmtDuration, fmtTotal, transitionShort } from './music'

export type PdfMode = 'stage' | 'detail'

// Las fuentes estándar de PDF usan WinAnsi: reemplazamos los caracteres que no existen ahí.
const clean = (s: string) =>
  s
    .replace(/[→⇒➜]/g, '>')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/♭/g, 'b')
    .replace(/♯/g, '#')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '')

const INK: [number, number, number] = [26, 20, 16]
const RUST: [number, number, number] = [156, 42, 26]
const AMBER: [number, number, number] = [184, 116, 30]
const MUTED: [number, number, number] = [95, 85, 75]
const BLUE: [number, number, number] = [47, 86, 112]

export function buildSetlistPdf(event: EventRow, items: SetlistItem[], songs: Map<string, Song>, mode: PdfMode): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const M = 14
  const stage = mode === 'stage'
  let y = M

  const totalMs = items.reduce((acc, it) => acc + (it.kind === 'song' && it.song_id ? songs.get(it.song_id)?.duration_ms ?? 0 : 0), 0)
  const songCount = items.filter((i) => i.kind === 'song').length

  const header = (first: boolean) => {
    doc.setFillColor(...INK)
    doc.rect(0, 0, W, first ? 34 : 14, 'F')
    doc.setFillColor(...RUST)
    doc.rect(0, first ? 34 : 14, W, 1.6, 'F')
    doc.setTextColor(240, 226, 196)
    if (first) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(26)
      doc.text('BELCEBLUES', M, 15)
      doc.setFontSize(9)
      doc.setTextColor(...AMBER)
      doc.text('SETLIST', W - M, 10, { align: 'right' })
      doc.setTextColor(240, 226, 196)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.text(clean(event.name), M, 23)
      const meta = [fmtDate(event.event_date), event.venue].filter(Boolean).join('  ·  ')
      doc.setFontSize(9.5)
      doc.text(clean(meta), M, 29)
      doc.text(clean(`${songCount} canciones · ${fmtTotal(totalMs)}`), W - M, 29, { align: 'right' })
      y = 44
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(clean(`BELCEBLUES · ${event.name}`), M, 9)
      y = 24
    }
  }

  const ensure = (h: number) => {
    if (y + h > H - 14) {
      doc.addPage()
      header(false)
    }
  }

  header(true)

  if (!stage && event.notes) {
    doc.setFont('times', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...MUTED)
    const lines = doc.splitTextToSize(clean(event.notes), W - 2 * M)
    ensure(lines.length * 4.5 + 4)
    doc.text(lines, M, y)
    y += lines.length * 4.5 + 4
  }

  let n = 0
  items.forEach((it, idx) => {
    if (it.kind === 'break') {
      ensure(14)
      doc.setFillColor(...RUST)
      doc.rect(M, y, W - 2 * M, 9, 'F')
      doc.setTextColor(255, 245, 225)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(stage ? 13 : 11)
      doc.text(clean((it.label || 'Intermedio').toUpperCase()), W / 2, y + 6.2, { align: 'center' })
      y += 14
      return
    }
    if (it.kind === 'cue') {
      const head = clean(`${(it.label || 'Momento').toUpperCase()}${it.speaker ? `  -  ${it.speaker}` : ''}`)
      doc.setFont('times', 'italic')
      doc.setFontSize(stage ? 12 : 10)
      const lines: string[] = it.notes ? doc.splitTextToSize(clean(it.notes), W - 2 * M - 22) : []
      const lh = stage ? 5.2 : 4.3
      const h = (stage ? 8 : 6.5) + lines.length * lh + 2
      ensure(h + 3)
      doc.setFillColor(232, 238, 243)
      doc.rect(M + 14, y - 1, W - 2 * M - 14, h, 'F')
      doc.setFillColor(...BLUE)
      doc.rect(M + 14, y - 1, 1.2, h, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(stage ? 12 : 9.5)
      doc.setTextColor(...BLUE)
      doc.text(`» ${head}`, M + 18, y + (stage ? 4.6 : 3.6))
      if (lines.length) {
        doc.setFont('times', 'italic')
        doc.setFontSize(stage ? 12 : 10)
        doc.setTextColor(...INK)
        doc.text(lines, M + 18, y + (stage ? 9.6 : 7.8))
      }
      y += h + 3
      return
    }
    const song = it.song_id ? songs.get(it.song_id) : undefined
    n++
    const titleSize = stage ? 22 : 14
    const titleW = W - 2 * M - 14 - 26
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(titleSize)
    const titleLines: string[] = doc.splitTextToSize(clean(song?.title ?? '(canción eliminada)'), titleW)
    const lineH = titleSize * 0.42
    const nextMusic = items.slice(idx + 1).find((x) => x.kind !== 'cue')
    const isLast = !nextMusic || nextMusic.kind === 'break'
    const trans = !isLast && (it.transition_type || it.transition) ? clean([transitionShort(it.transition_type), it.transition].filter(Boolean).join(': ')) : ''
    doc.setFont('times', 'italic')
    doc.setFontSize(stage ? 12 : 10)
    const noteLines: string[] = it.notes ? doc.splitTextToSize(clean(it.notes), W - 2 * M - 14) : []
    const noteH = noteLines.length * (stage ? 5.2 : 4.3)
    const voice = song?.singers?.length ? clean(`Voz: ${song.singers.join(', ')}`) : ''
    const blockH = titleLines.length * lineH + (stage ? 2 : 7) + (stage && voice ? 5.5 : 0) + noteH + (trans ? 6 : 0) + 4
    ensure(blockH)

    const top = y
    // número
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(stage ? 18 : 12)
    doc.setTextColor(...AMBER)
    doc.text(String(n).padStart(2, '0'), M, top + lineH * 0.85)
    // título
    doc.setFontSize(titleSize)
    doc.setTextColor(...INK)
    doc.text(titleLines, M + 14, top + lineH * 0.85)
    let cy = top + titleLines.length * lineH
    // tonalidad
    if (it.song_key) {
      doc.setDrawColor(...RUST)
      doc.setLineWidth(0.6)
      doc.roundedRect(W - M - 24, top - 1, 24, stage ? 11 : 8, 1.5, 1.5, 'S')
      doc.setTextColor(...RUST)
      doc.setFontSize(stage ? 17 : 12)
      doc.text(clean(it.song_key), W - M - 12, top + (stage ? 7.5 : 5.3), { align: 'center' })
    }
    if (!stage && song) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...MUTED)
      doc.text(clean([song.artist, fmtDuration(song.duration_ms), voice].filter(Boolean).join('  ·  ')), M + 14, cy + 3.2)
      cy += 5
    }
    if (stage && voice) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...AMBER)
      doc.text(voice.toUpperCase(), M + 14, cy + 3.5)
      cy += 5.5
    }
    if (noteLines.length) {
      doc.setFont('times', 'italic')
      doc.setFontSize(stage ? 12 : 10)
      doc.setTextColor(...INK)
      doc.text(noteLines, M + 14, cy + 4)
      cy += noteH + 1
    }
    if (trans) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(stage ? 11 : 9)
      doc.setTextColor(...RUST)
      doc.text(`>> ${trans}`, M + 14, cy + 4.5)
      cy += 6
    }
    y = cy + 3
    doc.setDrawColor(210, 198, 178)
    doc.setLineWidth(0.2)
    doc.line(M, y - 1.5, W - M, y - 1.5)
    y += 1.5
  })

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`${p} / ${pages}`, W - M, H - 7, { align: 'right' })
    doc.text('belceblues · setlist', M, H - 7)
  }
  return doc
}

export function pdfFileName(event: EventRow, mode: PdfMode) {
  const slug = event.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `setlist-${slug || 'belceblues'}${event.event_date ? '-' + event.event_date : ''}-${mode === 'stage' ? 'escenario' : 'detallado'}.pdf`
}

/** Descarga el PDF directamente al dispositivo. */
export function downloadPdf(doc: jsPDF, name: string) {
  const url = URL.createObjectURL(doc.output('blob'))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Safari necesita que la URL siga viva un rato después del click.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Abre el menú de compartir del teléfono con el PDF adjunto (para elegir WhatsApp).
 * Devuelve 'unsupported' si el navegador no puede compartir archivos (ej: computador).
 */
export async function sharePdfFile(doc: jsPDF, name: string, text: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  const file = new File([doc.output('blob')], name, { type: 'application/pdf' })
  if (!navigator.canShare?.({ files: [file] })) return 'unsupported'
  try {
    await navigator.share({ files: [file], text })
    return 'shared'
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'cancelled'
    throw e
  }
}
