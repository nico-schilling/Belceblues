import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL as string
const KEY = import.meta.env.VITE_SUPABASE_KEY as string
const CODE_KEY = 'belceblues.bandCode'

let client: SupabaseClient | null = null
let currentCode: string | null = null

function make(code: string) {
  return createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-band-code': code } },
  })
}

export function getStoredCode(): string | null {
  try {
    return localStorage.getItem(CODE_KEY)
  } catch {
    return null
  }
}

export function db(): SupabaseClient {
  const code = currentCode ?? getStoredCode()
  if (!code) throw new Error('Falta el código de banda')
  if (!client || code !== currentCode) {
    client = make(code)
    currentCode = code
  }
  return client
}

/** Valida el código contra el servidor y lo guarda si es correcto. */
export async function login(code: string): Promise<boolean> {
  const c = make(code.trim())
  const { data, error } = await c.rpc('check_band_code')
  if (error) throw error
  if (data !== true) return false
  try {
    localStorage.setItem(CODE_KEY, code.trim())
  } catch {
    /* modo privado: queda solo en memoria */
  }
  client = c
  currentCode = code.trim()
  return true
}

export function logout() {
  try {
    localStorage.removeItem(CODE_KEY)
  } catch {
    /* noop */
  }
  client = null
  currentCode = null
}

/** Canal de broadcast para avisar a los demás integrantes que algo cambió. */
export const CHANNEL = 'belceblues-sync'
