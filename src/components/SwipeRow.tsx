import { Trash2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

const ACTION_WIDTH = 84

/**
 * A row that slides left to reveal a delete button (drag with a finger or mouse).
 * `touch-action: pan-y` keeps vertical scrolling native, so only a clearly horizontal drag is treated as a swipe.
 */
export default function SwipeRow({
  open,
  onOpenChange,
  onDelete,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  children: ReactNode
}) {
  const [drag, setDrag] = useState<number | null>(null)
  const start = useRef<{ x: number; y: number; base: number; moved: boolean } | null>(null)
  const base = open ? -ACTION_WIDTH : 0
  const x = drag ?? base

  function down(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY, base, moved: false }
  }

  function move(e: React.PointerEvent) {
    const s = start.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (!s.moved) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return
      s.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDrag(Math.min(0, Math.max(-ACTION_WIDTH, s.base + dx)))
  }

  function up() {
    const s = start.current
    start.current = null
    if (s?.moved) onOpenChange((drag ?? base) < -ACTION_WIDTH / 2)
    setDrag(null)
  }

  return (
    <div className="overflow-hidden">
      <div
        className="flex"
        style={{
          width: `calc(100% + ${ACTION_WIDTH}px)`,
          transform: `translateX(${x}px)`,
          transition: drag === null ? 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
          touchAction: 'pan-y',
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {/* While swiped open, a tap on the row just closes it instead of triggering the row's own action. */}
        <div
          className="min-w-0 flex-1"
          onClickCapture={(e) => {
            if (open) {
              e.stopPropagation()
              onOpenChange(false)
            }
          }}
        >
          {children}
        </div>
        <button
          type="button"
          aria-label="Delete entry"
          tabIndex={open ? 0 : -1}
          className="my-2 flex shrink-0 items-center justify-center rounded-2xl bg-withdraw text-background-50"
          style={{ width: ACTION_WIDTH - 12, marginLeft: 6, marginRight: 6 }}
          onClick={onDelete}
        >
          <Trash2 size={22} />
        </button>
      </div>
    </div>
  )
}
