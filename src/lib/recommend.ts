import type { Audience, DraftItem, Song } from './types'
import { uid } from './music'

const DEFAULT_MS = 4 * 60 * 1000
const PARTY = ['Matrimonio / fiesta privada', 'Cumpleaños', 'Festival', 'Bar / pub']

export interface Pick {
  song: Song
  score: number
  reasons: string[]
}

export interface Proposal {
  items: DraftItem[]
  picks: Map<string, Pick>
  totalMs: number
}

/** Generador pseudoaleatorio con semilla (para "otra propuesta"). */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function styleMatch(songStyle: string | null, wanted: string[]): 'exact' | 'family' | null {
  if (!songStyle || !wanted.length) return null
  const s = norm(songStyle)
  if (wanted.some((w) => norm(w) === s)) return 'exact'
  const fam = (x: string) => (x.includes('blues') || x.includes('shuffle') || x.includes('boogie') ? 'blues' : x.includes('rock') ? 'rock' : x)
  if (wanted.some((w) => fam(norm(w)) === fam(s))) return 'family'
  return null
}

export function scoreSong(song: Song, a: Audience, rand: () => number): Pick {
  const reasons: string[] = []
  let score = 0
  const party = PARTY.includes(a.eventType) || a.moods.includes('Fiestero')
  const intimate = a.eventType === 'Acústico / íntimo'
  const targetEnergy = intimate ? Math.min(a.energy, 3) : a.energy

  const sm = styleMatch(song.style, a.styles)
  if (sm === 'exact') {
    score += 3
    reasons.push(song.style!)
  } else if (sm === 'family') {
    score += 1.5
    reasons.push(`afín a ${a.styles.join('/')}`)
  }

  const moodHits = song.moods.filter((m) => a.moods.includes(m))
  if (moodHits.length) {
    score += 2 * moodHits.length
    reasons.push(moodHits.join(', ').toLowerCase())
  }

  const dE = Math.abs(song.energy - targetEnergy)
  score += 1.5 - dE
  if (dE === 0) reasons.push('energía justa')

  // Generación: la música que el público escuchó entre los 12 y 28 años pega más.
  if (song.year) {
    const now = new Date().getFullYear()
    const from = now - a.ageMax + 12
    const to = now - a.ageMin + 28
    if (song.year >= from && song.year <= to) {
      score += 2
      reasons.push(`de su época (${song.year})`)
    } else {
      const dist = song.year < from ? from - song.year : song.year - to
      if (dist <= 8) score += 0.8
      // Clásicos del blues/rock trascienden generaciones
      else if (song.well_known) score += 0.5
    }
  }

  if (song.well_known) {
    score += party ? 1.8 : 0.8
    reasons.push('conocida')
  }
  if (song.singable && (party || a.moods.includes('Nostálgico'))) {
    score += 1.2
    reasons.push('cantable')
  }
  if (song.danceable && party) {
    score += 1.5
    reasons.push('bailable')
  }
  if (intimate && song.energy >= 5) score -= 1.5

  score += rand() * 1.2
  return { song, score, reasons }
}

/** Curva de energía de un set: arranca arriba, respira al medio, cierra en lo más alto. */
function curve(n: number, base: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 1 : i / (n - 1)
    let e: number
    if (x < 0.15) e = base + 0.5
    else if (x < 0.55) e = base - 0.2 * Math.sin(((x - 0.15) / 0.4) * Math.PI) * 2
    else if (x < 0.8) e = base + (x - 0.55) * 4
    else e = base + 1.5
    out.push(Math.max(1, Math.min(5, e)))
  }
  return out
}

export function propose(songs: Song[], a: Audience, seed = Date.now()): Proposal {
  const rand = rng(seed)
  const pool = songs.filter((s) => s.in_playlist)
  const ranked = pool.map((s) => scoreSong(s, a, rand)).sort((x, y) => y.score - x.score)

  const sets = Math.max(1, a.sets)
  const breakMs = (sets - 1) * 15 * 60 * 1000
  const budget = Math.max(10, a.durationMin) * 60 * 1000 - breakMs
  const chosen: Pick[] = []
  let total = 0
  for (const p of ranked) {
    const d = p.song.duration_ms ?? DEFAULT_MS
    if (total + d > budget + 90 * 1000) continue
    chosen.push(p)
    total += d
    if (total >= budget - 60 * 1000) break
  }

  // Repartir en sets equilibrados: se reparten por energía como cartas, así cada set tiene con qué subir y bajar.
  const sets_: Pick[][] = Array.from({ length: sets }, () => [])
  ;[...chosen]
    .sort((x, y) => y.song.energy - x.song.energy || y.score - x.score)
    .forEach((p, i) => {
      const round = Math.floor(i / sets)
      const idx = round % 2 === 0 ? i % sets : sets - 1 - (i % sets)
      sets_[idx].push(p)
    })

  const items: DraftItem[] = []
  const base = a.eventType === 'Acústico / íntimo' ? Math.min(a.energy, 3) : a.energy
  sets_.forEach((pool, s) => {
    if (!pool.length) return
    const remaining = [...pool]
    const n = remaining.length
    const targets = curve(n, base - 0.5)
    if (s === sets - 1) targets[n - 1] = 5
    // Se eligen primero los momentos clave: cierre, apertura y luego el resto según qué tan extremos son.
    const order = targets
      .map((t, i) => ({ i, prio: i === n - 1 ? 100 : i === 0 ? 90 : Math.abs(t - 3) }))
      .sort((x, y) => y.prio - x.prio)
      .map((x) => x.i)
    const slots: (Pick | null)[] = new Array(n).fill(null)
    for (const i of order) {
      let best = 0
      let bestCost = Infinity
      remaining.forEach((p, j) => {
        let cost = Math.abs(p.song.energy - targets[i]) * 2 - p.score * 0.3
        if ((i === 0 || i === n - 1) && p.song.well_known) cost -= 1
        for (const nb of [slots[i - 1], slots[i + 1]]) {
          if (nb && nb.song.artist === p.song.artist) cost += 2
          if (nb && nb.song.default_key && nb.song.default_key === p.song.default_key) cost += 0.5
        }
        if (cost < bestCost) {
          bestCost = cost
          best = j
        }
      })
      slots[i] = remaining.splice(best, 1)[0]
    }
    for (const p of slots as Pick[])
      items.push({ id: uid(), kind: 'song', song_id: p.song.id, song_key: p.song.default_key, transition_type: null, transition: null, notes: p.song.notes, label: null, speaker: null })
    if (s < sets - 1)
      items.push({ id: uid(), kind: 'break', song_id: null, song_key: null, transition_type: null, transition: null, notes: null, label: `Fin del set ${s + 1} — intermedio`, speaker: null })
  })

  return { items, picks: new Map(chosen.map((p) => [p.song.id, p])), totalMs: total }
}
