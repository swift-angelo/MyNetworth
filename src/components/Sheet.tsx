import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const CLOSE_MS = 320

/** Mount / slide-in / slide-out lifecycle for a bottom sheet or full-screen overlay. `open()` mounts it off-screen and slides it in; `close()` slides it away, then unmounts. */
export function useSheetState() {
  const [mounted, setMounted] = useState(false) // in the page
  const [shown, setShown] = useState(false) // slid in (false while sliding away)
  const timer = useRef<number | undefined>(undefined)

  const open = useCallback(() => {
    window.clearTimeout(timer.current)
    setMounted(true)
    // two frames so it is painted off-screen first, then slides in
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
 * While an overlay is up, the page behind it cannot scroll, be tapped, or take focus, and Escape closes the overlay.
 * The overlay itself must be rendered OUTSIDE #scroll-root (see Overlay), otherwise it would be switched off too.
 */
export function useModalLock(onClose: () => void, locked = false) {
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
}

/** Renders into <body>, outside the scrolling page, so locking the page (inert) never disables the overlay itself. */
export function Overlay({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}

/**
 * Bottom sheet: dimmed, blurred backdrop, a frosted panel that slides up, a close button, Escape and backdrop-tap to dismiss.
 * `locked` blocks closing (e.g. while saving).
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
  useModalLock(onClose, locked)

  // Drag the top of the sheet (grabber + title) down to dismiss; past a third of the way or a quick flick closes it.
  const [dragY, setDragY] = useState<number | null>(null)
  const drag = useRef<{ startY: number; startT: number } | null>(null)

  function onDragStart(e: React.PointerEvent<HTMLDivElement>) {
    if (locked || (e.target as HTMLElement).closest('button')) return
    drag.current = { startY: e.clientY, startT: e.timeStamp }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragY(0)
  }
  function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
    if (drag.current) setDragY(Math.max(0, e.clientY - drag.current.startY))
  }
  function onDragEnd(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    drag.current = null
    if (!d) return
    const dy = Math.max(0, e.clientY - d.startY)
    const flick = dy / Math.max(1, e.timeStamp - d.startT) > 0.6
    setDragY(null) // clears the inline offset so the class below animates it either home or away
    if (dy > 110 || (flick && dy > 30)) onClose()
  }

  return (
    <Overlay>
      <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label={label}>
        <div
          className={'absolute inset-0 bg-[#041801]/40 backdrop-blur-sm ' + (dragY === null ? 'transition-opacity duration-300 ' : '') + (shown ? 'opacity-100' : 'opacity-0')}
          style={dragY ? { opacity: Math.max(0.2, 1 - dragY / 420) } : undefined}
          onClick={() => !locked && onClose()}
        />
        <div
          className={
            'sheet absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-2xl overflow-y-auto overscroll-contain rounded-t-[22px] px-5 pb-[max(env(safe-area-inset-bottom),20px)] ease-[cubic-bezier(0.22,1,0.36,1)] ' +
            (dragY === null ? 'transition-transform duration-[350ms] ' : '') +
            (shown ? 'translate-y-0' : 'translate-y-full')
          }
          style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        >
          <div
            className="-mx-5 touch-none select-none px-5"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
          <div className="mx-auto h-1.5 w-10 translate-y-2.5 rounded-full bg-text-950/20" />
          <div className="flex items-center justify-between pb-2 pt-3.5">
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
          </div>
          {children}
        </div>
      </div>
    </Overlay>
  )
}
