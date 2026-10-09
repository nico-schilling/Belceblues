import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { handleRedirect } from './lib/spotify'

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
    </StrictMode>,
  )
}

boot()
