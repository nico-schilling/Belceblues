import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { CHANNEL, db } from './supabase'
import type { DraftItem, EventRow, SetlistItem, Song } from './types'

interface Store {
  songs: Song[]
  songMap: Map<string, Song>
  events: EventRow[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  notify: () => void
  saveSong: (id: string, patch: Partial<Song>) => Promise<void>
  addSong: (s: Partial<Song>) => Promise<Song>
  deleteSong: (id: string) => Promise<void>
  createEvent: (e: Partial<EventRow>, items?: DraftItem[]) => Promise<EventRow>
  saveEvent: (id: string, patch: Partial<EventRow>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  loadItems: (eventId: string) => Promise<SetlistItem[]>
  saveItems: (eventId: string, items: DraftItem[]) => Promise<void>
  lastRemoteChange: number
}

const Ctx = createContext<Store | null>(null)

const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e))

export function StoreProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRemoteChange, setLastRemoteChange] = useState(0)
  const channel = useRef<RealtimeChannel | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([
        db().from('songs').select('*').order('playlist_position', { ascending: true, nullsFirst: false }).order('title'),
        db().from('events').select('*').order('event_date', { ascending: false, nullsFirst: true }),
      ])
      if (s.error) throw s.error
      if (e.error) throw e.error
      setSongs(s.data as Song[])
      setEvents(e.data as EventRow[])
      setError(null)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const ch = db()
      .channel(CHANNEL, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'changed' }, () => {
        refresh()
        setLastRemoteChange(Date.now())
      })
      .subscribe()
    channel.current = ch
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      db().removeChannel(ch)
    }
  }, [refresh])

  const notify = useCallback(() => {
    channel.current?.send({ type: 'broadcast', event: 'changed', payload: { at: Date.now() } })
  }, [])

  const saveSong = useCallback(
    async (id: string, patch: Partial<Song>) => {
      setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
      const { error } = await db().from('songs').update(patch).eq('id', id)
      if (error) throw error
      notify()
    },
    [notify],
  )

  const addSong = useCallback(
    async (s: Partial<Song>) => {
      const { data, error } = await db().from('songs').insert(s).select().single()
      if (error) throw error
      setSongs((prev) => [...prev, data as Song])
      notify()
      return data as Song
    },
    [notify],
  )

  const deleteSong = useCallback(
    async (id: string) => {
      const { error } = await db().from('songs').delete().eq('id', id)
      if (error) throw error
      setSongs((prev) => prev.filter((s) => s.id !== id))
      notify()
    },
    [notify],
  )

  const saveItems = useCallback(
    async (eventId: string, items: DraftItem[]) => {
      const rows = items.map((it, i) => ({
        id: it.id,
        event_id: eventId,
        position: i,
        kind: it.kind,
        song_id: it.song_id,
        song_key: it.song_key,
        transition_type: it.transition_type,
        transition: it.transition,
        notes: it.notes,
        label: it.label,
      }))
      if (rows.length) {
        const { error } = await db().from('setlist_items').upsert(rows)
        if (error) throw error
      }
      let del = db().from('setlist_items').delete().eq('event_id', eventId)
      if (rows.length) del = del.not('id', 'in', `(${rows.map((r) => r.id).join(',')})`)
      const { error } = await del
      if (error) throw error
      await db().from('events').update({ updated_at: new Date().toISOString() }).eq('id', eventId)
      notify()
    },
    [notify],
  )

  const createEvent = useCallback(
    async (e: Partial<EventRow>, items?: DraftItem[]) => {
      const { data, error } = await db().from('events').insert(e).select().single()
      if (error) throw error
      const ev = data as EventRow
      if (items?.length) await saveItems(ev.id, items)
      setEvents((prev) => [ev, ...prev])
      notify()
      return ev
    },
    [notify, saveItems],
  )

  const saveEvent = useCallback(
    async (id: string, patch: Partial<EventRow>) => {
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
      const { error } = await db().from('events').update(patch).eq('id', id)
      if (error) throw error
      notify()
    },
    [notify],
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      const { error } = await db().from('events').delete().eq('id', id)
      if (error) throw error
      setEvents((prev) => prev.filter((e) => e.id !== id))
      notify()
    },
    [notify],
  )

  const loadItems = useCallback(async (eventId: string) => {
    const { data, error } = await db().from('setlist_items').select('*').eq('event_id', eventId).order('position')
    if (error) throw error
    return data as SetlistItem[]
  }, [])

  const songMap = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])

  const value: Store = {
    songs,
    songMap,
    events,
    loading,
    error,
    refresh,
    notify,
    saveSong,
    addSong,
    deleteSong,
    createEvent,
    saveEvent,
    deleteEvent,
    loadItems,
    saveItems,
    lastRemoteChange,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fuera de StoreProvider')
  return s
}

export { errMsg }
