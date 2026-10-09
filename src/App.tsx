import { useState } from 'react'
import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import { getStoredCode } from './lib/supabase'
import { Icon, ToastProvider } from './components/ui'
import Login from './pages/Login'
import Events from './pages/Events'
import EventEditor from './pages/EventEditor'
import Songs from './pages/Songs'
import Propose from './pages/Propose'
import Settings from './pages/Settings'

export default function App({ spotifyReturned, spotifyError }: { spotifyReturned: boolean; spotifyError: string | null }) {
  const [authed, setAuthed] = useState(!!getStoredCode())
  const [autoSync, setAutoSync] = useState(spotifyReturned)

  if (!authed) return <Login onOk={() => setAuthed(true)} />

  return (
    <ToastProvider>
      <StoreProvider>
        <HashRouter>
          <header className="topbar">
            <NavLink to="/" className="brand">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
              <span>Belceblues</span>
            </NavLink>
            <span className="spacer" />
            <span className="sync-dot" title="Sincronizado con la banda" />
          </header>
          <nav className="tabbar">
            <NavLink to="/" end>
              <Icon.ticket />
              Shows
            </NavLink>
            <NavLink to="/repertorio">
              <Icon.guitar />
              Repertorio
            </NavLink>
            <NavLink to="/proponer">
              <Icon.magic />
              Proponer
            </NavLink>
            <NavLink to="/ajustes">
              <Icon.gear />
              Ajustes
            </NavLink>
          </nav>
          <main>
            {spotifyError && <div className="err" style={{ marginBottom: 12 }}>{spotifyError}</div>}
            <Routes>
              <Route path="/" element={<Events />} />
              <Route path="/evento/:id" element={<EventEditor />} />
              <Route path="/repertorio" element={<Songs />} />
              <Route path="/proponer" element={<Propose />} />
              <Route path="/ajustes" element={<Settings autoSync={autoSync} onAutoSyncDone={() => setAutoSync(false)} />} />
              <Route path="*" element={<Events />} />
            </Routes>
          </main>
        </HashRouter>
      </StoreProvider>
    </ToastProvider>
  )
}
