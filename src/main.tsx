import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { applyTheme, getThemePref, watchSystemTheme } from './lib/theme.ts'

// Installed PWAs rarely do a fresh page load, so ask for a new version every time the app comes back to the foreground.
// autoUpdate then swaps in the new files and reloads.
registerSW({
  immediate: true,
  onRegistered(reg) {
    if (!reg) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {})
    })
    setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000)
  },
})

applyTheme(getThemePref())
watchSystemTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
