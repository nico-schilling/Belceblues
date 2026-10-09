export const NOTES = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']

/** Tonalidades mayores y menores, en notación americana. */
export const KEYS: string[] = [
  ...['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  ...['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'],
]

export const STYLES = [
  'Blues',
  'Blues rock',
  'Rock',
  "Rock 'n' roll",
  'Hard rock',
  'Shuffle',
  'Boogie',
  'Slow blues',
  'Soul',
  'Funk',
  'R&B',
  'Southern rock',
  'Rock nacional',
  'Balada',
]

export const MOODS = ['Fiestero', 'Enérgico', 'Groovero', 'Melancólico', 'Romántico', 'Oscuro', 'Relajado', 'Nostálgico']

export const EVENT_TYPES = ['Bar / pub', 'Festival', 'Matrimonio / fiesta privada', 'Evento corporativo', 'Show en teatro / sala', 'Cumpleaños', 'Acústico / íntimo']

export const TRANSITIONS: { value: string; label: string; short: string }[] = [
  { value: 'pause', label: 'Pausa (hablar / afinar)', short: 'PAUSA' },
  { value: 'segue', label: 'Enganchado (sin parar)', short: 'ENGANCHE' },
  { value: 'count', label: 'Cuenta directa', short: 'CUENTA' },
  { value: 'fade', label: 'Fade out → siguiente', short: 'FADE' },
  { value: 'cut', label: 'Corte seco → siguiente', short: 'CORTE' },
  { value: 'drums', label: 'Entra la batería sola', short: 'BATERÍA' },
  { value: 'intro', label: 'Intro / solo de unión', short: 'INTRO' },
  { value: 'talk', label: 'Presentación / speech', short: 'SPEECH' },
]

/** Momentos típicos entre canciones (presentaciones, saludos, uniones…). */
export const CUES = [
  'Presentación de la banda',
  'Presentar el tema',
  'Saludar a los anfitriones',
  'Unir los temas en el mismo tono',
  'Agradecer al público',
  'Dedicatoria',
  'Brindis',
  'Invitar a bailar',
  'Presentar a un invitado',
  'Afinar / cambio de instrumento',
  'Despedida',
]

export const transitionShort = (v: string | null) => TRANSITIONS.find((t) => t.value === v)?.short ?? ''

export function fmtDuration(ms: number | null | undefined): string {
  if (!ms) return '–'
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function fmtTotal(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`
}

export function fmtDate(d: string | null): string {
  if (!d) return 'Sin fecha'
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export const uid = () => crypto.randomUUID()
