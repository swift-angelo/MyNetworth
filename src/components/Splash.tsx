import { useEffect, useState } from 'react'

const KEY = 'mn-splash-seen'
const HOLD_MS = 1300
const FADE_MS = 450

const alreadySeen = () => {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Launch splash: app icon and name over the page glow, shown once per app launch, then fades away. */
export default function Splash() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>(() => (alreadySeen() ? 'gone' : 'show'))

  useEffect(() => {
    if (phase === 'gone') return
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* private mode: just show it again next launch */
    }
    const fade = setTimeout(() => setPhase('fade'), HOLD_MS)
    const done = setTimeout(() => setPhase('gone'), HOLD_MS + FADE_MS)
    return () => {
      clearTimeout(fade)
      clearTimeout(done)
    }
  }, [phase === 'gone']) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'gone') return null
  return (
    <div
      aria-hidden
      className={'reader-bg fixed inset-0 z-[60] flex flex-col items-center justify-center transition-opacity ease-out ' + (phase === 'fade' ? 'opacity-0' : 'opacity-100')}
      style={{ transitionDuration: `${FADE_MS}ms`, pointerEvents: phase === 'fade' ? 'none' : 'auto' }}
    >
      <img src="/icon-192.png" alt="" className="pop h-28 w-28 rounded-[32px] shadow-[0_16px_36px_rgba(7,97,5,0.3)]" />
      <h1 className="page-enter mt-6 text-[32px] font-bold tracking-tight [animation-delay:150ms]">WealthRadar</h1>
      <p className="page-enter mt-2 text-base text-text-950/70 [animation-delay:300ms]">Every peso, in one place.</p>
    </div>
  )
}
