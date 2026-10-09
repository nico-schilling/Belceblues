import type { Song } from '../lib/types'

/** Devuelve la URL de embed para reproducir la canción (Spotify o YouTube), si se puede. */
export function embedUrl(song: Pick<Song, 'spotify_id' | 'spotify_url'>): { url: string; kind: 'spotify' | 'youtube' } | null {
  if (song.spotify_id) return { url: `https://open.spotify.com/embed/track/${song.spotify_id}?theme=0`, kind: 'spotify' }
  const link = song.spotify_url?.trim()
  if (!link) return null
  const sp = link.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]+)/)
  if (sp) return { url: `https://open.spotify.com/embed/track/${sp[1]}?theme=0`, kind: 'spotify' }
  const yt = link.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return { url: `https://www.youtube-nocookie.com/embed/${yt[1]}`, kind: 'youtube' }
  return null
}

export default function Player({ song }: { song: Pick<Song, 'spotify_id' | 'spotify_url' | 'title'> }) {
  const e = embedUrl(song)
  if (!e) return null
  return (
    <iframe
      className={`player ${e.kind}`}
      src={e.url}
      title={`Escuchar ${song.title}`}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
    />
  )
}
