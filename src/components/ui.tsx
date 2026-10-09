import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const Icon = {
  ticket: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M13 6v12" strokeDasharray="2 2" />
    </svg>
  ),
  guitar: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="m20 4-6 6" />
      <path d="m18 2 4 4" />
      <path d="M10.5 9.5a4 4 0 0 0-5.6.6c-.8 1-.6 2-1.6 2.9-1.2 1-2 1.8-1 3.9 1 2.1 3 3 4.5 2.5 1.6-.5 1.6-1.8 2.8-2.8.9-.9 1.9-.8 2.9-1.6a4 4 0 0 0 .6-5.6z" />
      <circle cx="8" cy="15" r="1.4" />
    </svg>
  ),
  magic: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="m15 4-11 11 5 5 11-11z" />
      <path d="m13 6 5 5" />
      <path d="M19 2v3M17.5 3.5h3M5 3v2M4 4h2" />
    </svg>
  ),
  gear: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  grip: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </svg>
  ),
  plus: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" {...P} strokeWidth={3}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  up: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  ),
  down: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  pdf: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 15h6M9 11h2M9 19h6" />
    </svg>
  ),
  share: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  ),
  trash: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  ),
  sync: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </svg>
  ),
  back: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  pause: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M10 4H6v16h4zM18 4h-4v16h4z" />
    </svg>
  ),
  edit: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  spotify: () => (
    <svg viewBox="0 0 24 24" {...P}>
      <circle cx="12" cy="12" r="10" />
      <path d="M7 9.5c3.5-1 7.5-.6 10 1M7.5 13c3-.8 6-.4 8.5 1M8 16.3c2.4-.6 4.6-.3 6.5.8" />
    </svg>
  ),
}

export function Energy({ value }: { value: number }) {
  return (
    <span className="energy" title={`Energía ${value}/5`} aria-label={`Energía ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= value ? 'on' : ''} />
      ))}
    </span>
  )
}

export function Chips({ options, value, onChange, single }: { options: string[]; value: string[]; onChange: (v: string[]) => void; single?: boolean }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button
            type="button"
            key={o}
            className={`chip${on ? ' on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(single ? (on ? [] : [o]) : on ? value.filter((x) => x !== o) : [...value, o])}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn icon ghost" onClick={onClose} aria-label="Cerrar">
            <Icon.x />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

const ToastCtx = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2800)
    return () => clearTimeout(t)
  }, [msg])
  const show = useCallback((m: string) => setMsg(m), [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

export function Spinner() {
  return (
    <div className="center">
      <div className="spin" />
    </div>
  )
}
