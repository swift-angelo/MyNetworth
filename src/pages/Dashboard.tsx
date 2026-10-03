import { ArrowDownToLine, ArrowUpFromLine, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useEntryDrawer } from '../components/EntryDrawer'
import { AppHeader, EmptyState, InstitutionLogo, PillGroup } from '../components/ui'
import { SEED_INSTITUTIONS, colorFor } from '../data/institutions'
import { logoFor } from '../data/logos'
import { CATEGORY_LABELS } from '../db/schema'
import { useData } from '../hooks/useData'
import { groupByPeriod, groupNet, type Period } from '../lib/calc'
import { formatMoney } from '../lib/money'

const tooltipStyle = { background: 'var(--background-100)', border: '1px solid var(--glass-border)', borderRadius: 12, color: 'var(--text-950)' }
const PH_CHIPS = ['GCash', 'Maya', 'BDO', 'BPI', 'GoTyme', 'Coins.ph', 'Wise', 'PayPal']

const tileCls = 'glass flex h-[84px] flex-col items-center justify-center gap-1.5 rounded-[14px] text-[15px] font-semibold transition active:scale-[0.98]'

function periodLabel(key: string, period: Period) {
  if (period === 'year') return key
  const d = new Date(key + (period === 'month' ? '-01' : '') + 'T00:00:00')
  return d.toLocaleDateString('en-PH', period === 'month' ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const { loading, institutions, entries, rates } = useData()
  const { openDrawer } = useEntryDrawer()
  const [view, setView] = useState<'institution' | 'category'>('institution')
  const [period, setPeriod] = useState<Period>('day')

  const instById = useMemo(() => new Map(institutions.map((i) => [i.id!, i])), [institutions])

  const totals = useMemo(() => {
    const rows = groupNet(entries, rates, () => 'all')
    return rows[0] ?? { deposits: 0, withdrawals: 0, net: 0 }
  }, [entries, rates])

  const byInstitution = useMemo(
    () =>
      groupNet(entries, rates, (e) => e.institutionId)
        .map((r) => {
          const inst = instById.get(r.key)
          return { ...r, name: inst?.name ?? 'Unknown', color: inst ? colorFor(inst.id!) : '#6ea7f7' }
        })
        .sort((a, b) => b.net - a.net),
    [entries, rates, instById],
  )

  const byCategory = useMemo(
    () =>
      groupNet(entries, rates, (e) => instById.get(e.institutionId)?.category ?? 'other')
        .map((r, i) => ({ ...r, name: CATEGORY_LABELS[r.key], color: colorFor(i) }))
        .sort((a, b) => b.net - a.net),
    [entries, rates, instById],
  )

  const timeline = useMemo(
    () =>
      groupByPeriod(entries, rates, period)
        .slice(-12)
        .map((r) => ({ label: periodLabel(r.key, period), Deposits: r.deposits / 100, Withdrawals: r.withdrawals / 100 })),
    [entries, rates, period],
  )

  if (loading) return null

  if (entries.length === 0)
    return (
      <div className="space-y-3.5">
        <AppHeader />
        <div className="glass mt-4 rounded-[20px]">
          <EmptyState
            icon={<Wallet size={32} strokeWidth={1.75} />}
            title="Nothing tracked yet"
            description="Log a deposit or withdrawal for a bank or wallet and your totals and charts will show up here."
            ctaLabel="Add your first entry"
            onCta={() => openDrawer()}
          />
        </div>
        <div className="pt-3">
          <p className="mb-2.5 px-1 text-[13px] text-text-950/65">Already set up for the Philippines</p>
          <div className="flex flex-wrap gap-2">
            {PH_CHIPS.map((name) => (
              <span key={name} className="glass inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm">
                {logoFor(name) && <img src={logoFor(name)!} alt="" className="h-[22px] w-[22px] rounded-md object-cover" />}
                {name}
              </span>
            ))}
            <span className="inline-flex h-11 items-center rounded-full border border-dashed border-text-950/30 px-4 text-sm text-text-950/65">
              + {Math.max(SEED_INSTITUTIONS.length - PH_CHIPS.length, 0)} more
            </span>
          </div>
        </div>
      </div>
    )

  const php = (m: number) => formatMoney(m)
  const money = (v: unknown) => formatMoney(Math.round(Number(v) * 100))
  const rows = view === 'institution' ? byInstitution : byCategory
  const positiveTotal = rows.reduce((s, r) => s + Math.max(r.net, 0), 0)
  const pct = (m: number) => (positiveTotal > 0 ? Math.round((Math.max(m, 0) / positiveTotal) * 100) : 0)

  const [whole, cents = '00'] = (totals.net / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split('.')

  return (
    <div className="space-y-3.5">
      <AppHeader />

      <section className="rounded-[18px] border border-text-950/15 bg-gradient-to-br from-primary-300/35 via-primary-200/20 to-text-950/10 bg-clip-padding px-5 pb-5 pt-[18px] text-text-950 shadow-[inset_0_1px_0_var(--glass-highlight),0_12px_32px_var(--glass-shadow)] backdrop-blur-xl backdrop-saturate-150">
        <div className="text-[46px] font-bold leading-[1.1] tracking-tighter">
          ₱{whole}
          {cents !== '00' && <span className="text-text-950/60">.{cents}</span>}
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-text-950/80">▲ Deposited</div>
            <div className="mt-0.5 text-[17px] font-semibold">{php(totals.deposits)}</div>
          </div>
          <div>
            <div className="text-xs text-text-950/80">▼ Withdrawn</div>
            <div className="mt-0.5 text-[17px] font-semibold">{php(totals.withdrawals)}</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => openDrawer('deposit')} className={tileCls}>
          <ArrowDownToLine size={24} strokeWidth={1.75} />
          Deposit
        </button>
        <button type="button" onClick={() => openDrawer('withdrawal')} className={tileCls}>
          <ArrowUpFromLine size={24} strokeWidth={1.75} />
          Withdraw
        </button>
      </div>

      <section className="glass rounded-[16px] px-4 pb-3 pt-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Over time</h2>
          <PillGroup
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Year' },
            ]}
          />
        </div>
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={timeline} barGap={2}>
              <XAxis dataKey="label" fontSize={11} stroke="var(--muted)" tickLine={false} axisLine={false} />
              <YAxis
                fontSize={11}
                width={46}
                stroke="var(--muted)"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => Number(v).toLocaleString('en-PH', { notation: 'compact' })}
              />
              <Tooltip formatter={money} contentStyle={tooltipStyle} cursor={{ fill: 'var(--glass-b)' }} />
              <Bar dataKey="Deposits" fill="var(--deposit)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Withdrawals" fill="var(--withdraw)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {timeline.length === 12 && <p className="text-xs text-text-950/50">Showing the latest 12.</p>}
      </section>

      <div className="flex items-center justify-between pt-1">
        <h2 className="pl-1 text-[15px] font-semibold">{view === 'institution' ? 'By bank / wallet' : 'By type'}</h2>
        <button
          className="h-11 px-1 text-sm font-semibold text-link"
          onClick={() => setView(view === 'institution' ? 'category' : 'institution')}
        >
          {view === 'institution' ? 'By type' : 'By bank / wallet'}
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.name} className="glass flex h-[62px] items-center gap-3 rounded-[14px] px-3.5">
            <InstitutionLogo name={r.name} color={r.color} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{r.name}</div>
              <div className="text-xs text-text-950/65">{pct(r.net)}% of total</div>
            </div>
            <div className="text-[15px] font-semibold tabular-nums">{php(r.net)}</div>
          </li>
        ))}
      </ul>
      <p className="px-1 text-xs text-text-950/50">Foreign-currency entries are converted to PHP using the rates in Settings.</p>
    </div>
  )
}
