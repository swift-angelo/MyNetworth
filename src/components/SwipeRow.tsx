import { Trash2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

const ACTION_WIDTH = 56

/**
 * A row that reveals a delete button on a left swipe (finger or mouse). The row's content is not moved:
 * the revealed button takes space from the right edge, so the name on the left stays put and just truncates.
 * `touch-action: pan-y` keeps vertical scrolling native, so only a clearly horizontal drag counts as a swipe.
 */
export default function SwipeRow({
  open,
  onOpenChange,
  onDelete,
  disabled = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  disabled?: boolean
  children: ReactNode
}) {
  const [drag, setDrag] = useState<number | null>(null)
  const start = useRef<{ x: number; y: number; base: number; moved: boolean } | null>(null)
  const base = open ? ACTION_WIDTH : 0
  const reveal = drag ?? base // how many px of the delete button are showing

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
    setDrag(Math.min(ACTION_WIDTH, Math.max(0, s.base - dx)))
  }

  function up() {
    const s = start.current
    start.current = null
    if (s?.moved) onOpenChange((drag ?? base) > ACTION_WIDTH / 2)
    setDrag(null)
  }

  return (
    <div
      className="relative"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {/* While swiped open, a tap on the row just closes it instead of triggering the row's own action. */}
      <div
        style={{ paddingRight: reveal, transition: drag === null ? 'padding 0.25s cubic-bezier(0.22, 1, 0.36, 1)' : 'none' }}
        onClickCapture={(e) => {
          if (open) {
            e.stopPropagation()
            onOpenChange(false)
          }
        }}
      >
        {children}
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center justify-center overflow-hidden" style={{ width: reveal }}>
        <button
          type="button"
          aria-label="Delete entry"
          tabIndex={open ? 0 : -1}
          disabled={disabled}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-danger/15 text-danger transition active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          onClick={onDelete}
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  )
}
