import { useEffect, useState } from 'react'

const TOTAL_MS = 2800
const NAME = 'Belceblues'

/**
 * Animación de apertura. Se monta una sola vez al iniciar la app (cargar la página),
 * por eso no vuelve a aparecer al traerla desde segundo plano.
 */
export default function Splash() {
  const [phase, setPhase] = useState<'on' | 'out' | 'gone'>('on')

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const total = reduced ? 1200 : TOTAL_MS
    const t1 = setTimeout(() => setPhase('out'), total - 450)
    const t2 = setTimeout(() => setPhase('gone'), total)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  if (phase === 'gone') return null

  return (
    <div className={`splash${phase === 'out' ? ' out' : ''}`} role="presentation" aria-hidden onClick={() => setPhase('gone')}>
      <svg className="splash-logo" viewBox="0 0 512 512">
        <defs>
          <linearGradient id="sp-pick" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d8572f" />
            <stop offset="0.55" stopColor="#a5301a" />
            <stop offset="1" stopColor="#5e170b" />
          </linearGradient>
          <linearGradient id="sp-horn" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#b8741e" />
            <stop offset="1" stopColor="#f2c36b" />
          </linearGradient>
        </defs>
        <g className="splash-horns">
          <path d="M150 150 C120 110 112 60 132 22 C150 70 175 100 214 118 Z" fill="url(#sp-horn)" stroke="#1a120a" strokeWidth="10" strokeLinejoin="round" />
          <path d="M362 150 C392 110 400 60 380 22 C362 70 337 100 298 118 Z" fill="url(#sp-horn)" stroke="#1a120a" strokeWidth="10" strokeLinejoin="round" />
        </g>
        <path d="M256 92 C360 92 448 120 448 200 C448 300 330 430 256 480 C182 430 64 300 64 200 C64 120 152 92 256 92 Z" fill="url(#sp-pick)" stroke="#1a120a" strokeWidth="14" strokeLinejoin="round" />
        <path d="M256 120 C345 120 418 142 418 202 C418 285 318 398 256 444" fill="none" stroke="#f0e2c4" strokeOpacity="0.25" strokeWidth="6" />
        <text x="256" y="300" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="170" fill="#f0e2c4" stroke="#1a120a" strokeWidth="6" paintOrder="stroke" letterSpacing="-8">
          BB
        </text>
        <path className="splash-tail" d="M300 360 C340 370 352 340 336 326 L360 318 L350 342" fill="none" stroke="#f0e2c4" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h1 className="splash-name">
        {NAME.split('').map((c, i) => (
          <span key={i} style={{ animationDelay: `${700 + i * 55}ms` }}>
            {c}
          </span>
        ))}
      </h1>
      <div className="splash-rule" />
    </div>
  )
}
