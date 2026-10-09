export interface Song {
  id: string
  spotify_id: string | null
  title: string
  artist: string
  album: string | null
  year: number | null
  duration_ms: number | null
  image_url: string | null
  spotify_url: string | null
  playlist_position: number | null
  added_at: string | null
  in_playlist: boolean
  default_key: string | null
  notes: string | null
  energy: number
  style: string | null
  moods: string[]
  danceable: boolean
  well_known: boolean
  singable: boolean
  singers: string[]
  created_at: string
  updated_at: string
}

export interface Audience {
  ageMin: number
  ageMax: number
  styles: string[]
  moods: string[]
  eventType: string
  energy: number
  durationMin: number
  sets: number
}

export interface EventRow {
  id: string
  name: string
  event_date: string | null
  venue: string | null
  notes: string | null
  audience: Audience | null
  created_at: string
  updated_at: string
}

export type ItemKind = 'song' | 'break' | 'cue'

export interface SetlistItem {
  id: string
  event_id: string
  position: number
  kind: ItemKind
  song_id: string | null
  song_key: string | null
  transition_type: string | null
  transition: string | null
  notes: string | null
  label: string | null
  /** Momento entre canciones: quién habla o lo lleva adelante. */
  speaker: string | null
}

/** Ítem en edición (puede no estar guardado aún). */
export type DraftItem = Omit<SetlistItem, 'event_id' | 'position'> & { id: string }
