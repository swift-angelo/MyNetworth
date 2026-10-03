import { ChevronDown, DatabaseBackup, LoaderCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { logoFor } from '../data/logos'

// text-base (16px) stops iOS from zooming into inputs; min-h-11 gives ~44px touch targets
export const inputCls =
  'w-full min-h-[52px] rounded-xl border border-text-950/15 bg-text-950/[0.06] px-3.5 py-2 text-base text-text-950 backdrop-blur-md placeholder:text-text-950/45 focus:border-primary-700 focus:outline-none'
/** Single-line controls (select, date) share one fixed height so they line up; text is centred vertically. */
export const controlCls = inputCls + ' h-[52px] py-0'

/** Native select with the OS arrow hidden and our own chevron, so its height and text alignment match other inputs on every browser. */
export function SelectInput({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...props} className={controlCls + ' appearance-none pr-10 ' + className} />
      <ChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-text-950/60" />
    </span>
  )
}

/** Spinning ring shown on a button while its action runs. */
export function Spinner({ size = 20 }: { size?: number }) {
  return <LoaderCircle size={size} strokeWidth={2.5} className="animate-spin" aria-hidden />
}

/** Resolves after `ms`, so a spinner is visible long enough to register even when the work is instant. */
export const pause = (ms = 500) => new Promise<void>((r) => setTimeout(r, ms))

export const btnCls = 'min-h-14 w-full rounded-[12px] transition duration-150 active:scale-[0.98] bg-primary-500 px-4 py-3 text-lg font-semibold text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_20px_color-mix(in_srgb,var(--primary-500)_35%,transparent)] active:bg-primary-400 disabled:opacity-50'
export const btnGhostCls =
  'inline-flex min-h-12 items-center transition duration-150 active:scale-[0.97] justify-center rounded-lg border border-text-950/20 bg-text-950/[0.08] px-4 py-2 text-sm text-text-950 active:bg-text-950/20'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="mb-1.5 block text-xs text-text-950/65">{label}</span>
      {children}
    </label>
  )
}

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass rounded-[16px] p-4">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-deposit' : tone === 'bad' ? 'text-withdraw' : ''
  return (
    <div className="glass rounded-[16px] p-4">
      <div className="text-sm text-text-950/65">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
    </div>
  )
}

/** Pill-style segmented control, like the Investment / Expenses toggle. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = 'glass',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={'flex rounded-xl p-1 ' + className}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={'min-h-12 flex-1 rounded-lg text-base font-medium transition ' +
            (value === o.value ? 'bg-text-950 text-background-50 shadow-md' : 'text-text-950/75')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  to,
  onCta,
}: {
  icon: ReactNode
  title: string
  description: string
  ctaLabel: string
  to?: string
  onCta?: () => void
}) {
  const cls = 'inline-flex min-h-14 w-full items-center justify-center rounded-[12px] bg-primary-500 px-8 py-3 text-lg font-semibold text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_20px_color-mix(in_srgb,var(--primary-500)_35%,transparent)] active:bg-primary-400'
  return (
    <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[14px] bg-gradient-to-br from-primary-200 to-primary-300 text-deposit shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_color-mix(in_srgb,var(--primary-500)_25%,transparent)]">{icon}</div>
      <h3 className="mt-5 text-[22px] font-bold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-[270px] text-[15px] leading-snug text-text-950/65">{description}</p>
      <div className="mt-6 w-full">
        {to ? (
          <Link to={to} className={cls}>
            {ctaLabel}
          </Link>
        ) : (
          <button onClick={onCta} className={cls}>
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  )
}

/** Bank/wallet logo filling its whole tile, or coloured initials if there isn't one. */
export function InstitutionLogo({ name, color, size = 40 }: { name: string; color?: string; size?: number }) {
  const src = logoFor(name)
  const [failed, setFailed] = useState(false)
  const box = { width: size, height: size }
  if (src && !failed)
    return (
      <span className="flex shrink-0 overflow-hidden rounded-lg" style={box}>
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      </span>
    )
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg text-sm font-bold text-on-primary"
      style={{ ...box, background: color ?? '#525252' }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

/** Home-screen header: app icon + name on the left, backup shortcut on the right. */
export function AppHeader() {
  return (
    <div className="flex items-center justify-between pl-1 pt-3">
      <div className="flex items-center gap-2.5">
        <img src="/icon-192.png" alt="MyNetworth" className="h-[34px] w-[34px] rounded-[8px] shadow-md" />
        <span className="text-base font-semibold tracking-tight">MyNetworth</span>
      </div>
      <Link
        to="/settings"
        aria-label="Backup and restore"
        title="Backup"
        className="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 active:bg-text-950/15"
      >
        <DatabaseBackup size={22} strokeWidth={1.75} />
      </Link>
    </div>
  )
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="px-1 pb-1 pt-3 text-[30px] font-bold tracking-tight">{children}</h1>
}

/** Small inline segmented control (Day / Month / Year). */
export function PillGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-[10px] bg-text-950/[0.08] p-0.5">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={'h-10 min-w-[52px] rounded-lg px-2 text-[13px] transition ' +
            (value === o.value ? 'bg-text-950 font-semibold text-background-50' : 'font-medium text-text-950/70')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const today = () => new Date().toISOString().slice(0, 10)
