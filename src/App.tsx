import { ArrowLeftRight, House, Settings2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { EntryDrawerProvider } from './components/EntryDrawer'
import Splash from './components/Splash'
import { seedIfEmpty } from './db/db'
import { useAuth } from './lib/auth'
import { refreshRates } from './lib/fx'
import Dashboard from './pages/Dashboard'
import Entries from './pages/Entries'
import Login from './pages/Login'
import Settings from './pages/Settings'

const links = [
  ['/', 'Home', House],
  ['/entries', 'Entries', ArrowLeftRight],
  ['/settings', 'Settings', Settings2],
] as const

const tabIndex = (path: string) => Math.max(0, links.findIndex(([to]) => to === path))

/** Re-mounts the page on every route change (via key) so its entrance fade replays, and resets scroll. */
function AnimatedRoutes() {
  const location = useLocation()
  useEffect(() => {
    document.getElementById('scroll-root')?.scrollTo(0, 0)
  }, [location.pathname])
  return (
    <div key={location.pathname} className="page-enter">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/entries" element={<Entries />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  )
}

/** The scrolling area. Swiping left/right on it moves to the next/previous tab. Native listeners, so swipes inside portaled drawers/readers never reach it. */
function SwipeMain({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const pathRef = useRef('')
  const { pathname } = useLocation()
  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let start: { x: number; y: number; t: number } | null = null

    // Don't hijack swipes that start on inputs or inside something that scrolls sideways itself.
    const blocked = (target: EventTarget | null) => {
      for (let n = target as HTMLElement | null; n && n !== el; n = n.parentElement) {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.dataset?.noSwipe !== undefined) return true
        if (n.scrollWidth > n.clientWidth && /(auto|scroll)/.test(getComputedStyle(n).overflowX)) return true
      }
      return false
    }

    const onStart = (e: TouchEvent) => {
      start = e.touches.length === 1 && !blocked(e.target) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null
    }
    const onEnd = (e: TouchEvent) => {
      if (!start) return
      const dx = e.changedTouches[0].clientX - start.x
      const dy = e.changedTouches[0].clientY - start.y
      const fast = Date.now() - start.t < 600
      start = null
      if (!fast || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
      const next = tabIndex(pathRef.current) + (dx < 0 ? 1 : -1)
      if (next >= 0 && next < links.length) navigate(links[next][0])
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [navigate])

  return (
    <main ref={ref} id="scroll-root" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
      {children}
    </main>
  )
}

function TabBar() {
  const index = tabIndex(useLocation().pathname)
  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="glass pointer-events-auto relative mx-auto grid max-w-md grid-cols-3 rounded-[20px] p-2">
        {/* One indicator that glides to the active tab (inset from the edges so it stays inside the capsule) */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-3.5 left-2 flex w-[calc((100%-1rem)/3)] justify-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(${index * 100}%)` }}
        >
          <span className="h-[3px] w-[calc(100%-2.5rem)] rounded-full bg-tab-line" />
        </span>
        {links.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              'flex min-w-0 flex-col items-center gap-0.5 pb-4 pt-3 text-xs transition-colors duration-300 active:scale-95 ' +
              (isActive ? 'font-semibold text-text-950' : 'text-text-950/65')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={24} strokeWidth={isActive ? 2.25 : 1.75} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/** The app proper: only mounted once signed in, so seeding, live rates and news never run before that. */
function AppShell() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    seedIfEmpty()
      .then(() => setReady(true))
      .catch((e) => setError(String(e?.message ?? e)))
  }, [])

  // Live exchange rates: on every open, whenever the app comes back to the foreground, and when the connection returns.
  useEffect(() => {
    if (!ready) return
    refreshRates()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshRates()
    }
    const onOnline = () => refreshRates({ force: true })
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [ready])

  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000)
    return () => clearTimeout(t)
  }, [])

  if (error) return <p className="p-6 text-withdraw">Couldn't open the database: {error}</p>
  if (!ready)
    return (
      <div className="p-6 text-text-950/75">
        <p>Loading…</p>
        {slow && (
          <p className="mt-3 text-sm text-text-950/65">
            Taking longer than usual. If WealthRadar is open in another tab or window, close it, then reload this page.
          </p>
        )}
      </div>
    )

  return (
    <HashRouter>
      <EntryDrawerProvider>
      {/* App shell: exactly one dynamic-viewport tall, so the tab bar stays at the true bottom even as iOS Chrome's toolbar shows/hides. Only <main> scrolls. */}
      <div className="relative flex h-dvh flex-col overflow-hidden">
      <SwipeMain>
        <div className="mx-auto max-w-2xl space-y-3.5 px-5 pb-32 pt-[env(safe-area-inset-top)]">
          <AnimatedRoutes />
        </div>
      </SwipeMain>
      <TabBar />
      </div>
      </EntryDrawerProvider>
    </HashRouter>
  )
}

export default function App() {
  const { status } = useAuth()
  return (
    <>
      <Splash />
      {status === 'loading' ? <div className="p-6 text-text-950/75">Loading…</div> : status === 'signedOut' ? <Login /> : <AppShell />}
    </>
  )
}
