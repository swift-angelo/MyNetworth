import { ArrowLeftRight, House, Settings2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { seedIfEmpty } from './db/db'
import Dashboard from './pages/Dashboard'
import Entries from './pages/Entries'
import Settings from './pages/Settings'

const links = [
  ['/', 'Home', House],
  ['/entries', 'Entries', ArrowLeftRight],
  ['/settings', 'Settings', Settings2],
] as const

const tabIndex = (path: string) => Math.max(0, links.findIndex(([to]) => to === path))

function AppRoutes({ location }: { location: Location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/entries" element={<Entries />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}

/**
 * Slides between tabs: the page you leave slides out toward where you are going while the new one slides in
 * from that side (left/right follows the tab order). Pages are re-mounted per route, and scroll resets.
 */
function SlideRoutes() {
  const location = useLocation()
  const [current, setCurrent] = useState(location)
  const [leaving, setLeaving] = useState<{ loc: Location; sy: number } | null>(null)
  const [dir, setDir] = useState(1)
  const [animate, setAnimate] = useState(false)

  useLayoutEffect(() => {
    if (location.pathname === current.pathname) {
      setCurrent(location) // same page (e.g. only the query changed): just follow it
      return
    }
    const scroller = document.getElementById('scroll-root')
    const sy = -(scroller?.scrollTop ?? 0)
    scroller?.scrollTo(0, 0)
    setDir(tabIndex(location.pathname) > tabIndex(current.pathname) ? 1 : -1)
    setLeaving({ loc: current, sy })
    setCurrent(location)
    setAnimate(true)
    const t = setTimeout(() => setLeaving(null), 260)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  const vars = { '--dir': dir } as CSSProperties
  return (
    <div className="relative">
      {leaving && (
        <div key={leaving.loc.pathname + '-out'} aria-hidden className="page-out" style={{ ...vars, '--sy': `${leaving.sy}px` } as CSSProperties}>
          <AppRoutes location={leaving.loc} />
        </div>
      )}
      <div key={current.pathname} className={animate ? 'page-in' : 'page-enter'} style={vars}>
        <AppRoutes location={current} />
      </div>
    </div>
  )
}

function TabBar() {
  const index = tabIndex(useLocation().pathname)
  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="glass pointer-events-auto relative mx-auto grid max-w-md grid-cols-3 rounded-[30px] p-2">
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

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    seedIfEmpty()
      .then(() => setReady(true))
      .catch((e) => setError(String(e?.message ?? e)))
  }, [])

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
            Taking longer than usual. If MyNetworth is open in another tab or window, close it, then reload this page.
          </p>
        )}
      </div>
    )

  return (
    <HashRouter>
      {/* App shell: exactly one dynamic-viewport tall, so the tab bar stays at the true bottom even as iOS Chrome's toolbar shows/hides. Only <main> scrolls. */}
      <div className="relative flex h-dvh flex-col overflow-hidden">
      <main id="scroll-root" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="mx-auto max-w-2xl space-y-3.5 px-5 pb-32 pt-[env(safe-area-inset-top)]">
          <SlideRoutes />
        </div>
      </main>
      <TabBar />
      </div>
    </HashRouter>
  )
}
