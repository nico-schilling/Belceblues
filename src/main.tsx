import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import Splash from './components/Splash'
import { handleRedirect } from './lib/spotify'

// Si la app quedó con una versión vieja en caché y falta un archivo, recarga una vez para tomar la nueva.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('belceblues.reloaded')) return
  sessionStorage.setItem('belceblues.reloaded', '1')
  location.reload()
})

async function boot() {
  let spotifyReturned = false
  let spotifyError: string | null = null
  try {
    spotifyReturned = await handleRedirect()
  } catch (e) {
    spotifyError = e instanceof Error ? e.message : String(e)
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App spotifyReturned={spotifyReturned} spotifyError={spotifyError} />
      {!spotifyReturned && <Splash />}
    </StrictMode>,
  )
}

boot()
