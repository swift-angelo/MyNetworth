import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const CLOSE_MS = 320

/** Mount / slide-in / slide-out lifecycle for a bottom sheet. `open()` mounts it off-screen and slides it up; `close()` slides it away, then unmounts. */
export function useSheetState() {
  const [mounted, setMounted] = useState(false) // in the page
  const [shown, setShown] = useState(false) // slid up (false while sliding away)
  const timer = useRef<number | undefined>(undefined)

  const open = useCallback(() => {
    window.clearTimeout(timer.current)
    setMounted(true)
    // two frames so the sheet is painted off-screen first, then slides in
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
  }, [])

  const close = useCallback(() => {
    setShown(false)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMounted(false), CLOSE_MS)
  }, [])

  return { mounted, shown, open, close }
}

/**
 * Bottom sheet: dimmed, blurred backdrop, a frosted panel that slides up, a close button, Escape and backdrop-tap to dismiss.
 * While it is up the page behind it cannot scroll, be tapped, or take focus. `locked` blocks closing (e.g. while saving).
 */
export function Sheet({
  shown,
  onClose,
  title,
  label,
  locked = false,
  children,
}: {
  shown: boolean
  onClose: () => void
  title?: string
  label: string
  locked?: boolean
  children: ReactNode
}) {
  useEffect(() => {
    const page = document.getElementById('scroll-root')
    if (!page) return
    page.style.overflow = 'hidden'
    page.inert = true
    return () => {
      page.style.overflow = ''
      page.inert = false
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, locked])

  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label={label}>
      <div
        className={'absolute inset-0 bg-[#041801]/40 backdrop-blur-sm transition-opacity duration-300 ' + (shown ? 'opacity-100' : 'opacity-0')}
        onClick={() => !locked && onClose()}
      />
      <div
        className={
          'sheet absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-2xl overflow-y-auto overscroll-contain rounded-t-[22px] px-5 pb-[max(env(safe-area-inset-bottom),20px)] transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] ' +
          (shown ? 'translate-y-0' : 'translate-y-full')
        }
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-text-950/20" />
        <div className="flex items-center justify-between pb-2 pt-1">
          <h2 className="pl-1 text-xl font-bold tracking-tight">{title ?? label}</h2>
          <button
            type="button"
            aria-label="Close"
            disabled={locked}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text-950/70 transition active:scale-90 active:bg-text-950/10 disabled:opacity-40"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
