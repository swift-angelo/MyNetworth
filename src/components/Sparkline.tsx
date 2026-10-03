import { useId } from 'react'

const W = 84
const H = 56
const PAD = 6

/** Small trend line with a soft fill and an end dot. Draws nothing for fewer than two points. */
export default function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const id = useId()
  if (values.length < 2) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2)
    const y = hi === lo ? H / 2 : PAD + (1 - (v - lo) / span) * (H - PAD * 2)
    return [x, y] as const
  })
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [ex, ey] = pts[pts.length - 1]
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary-700)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--primary-700)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${ex.toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z`} fill={`url(#${id})`} />
      <path d={line} stroke="var(--primary-800)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ex} cy={ey} r="4" fill="var(--primary-50)" stroke="var(--primary-800)" strokeWidth="2.5" />
    </svg>
  )
}
