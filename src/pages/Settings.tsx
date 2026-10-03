import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { PageTitle, Segmented, Spinner, btnCls, pause } from '../components/ui'
import { resetAppCache } from '../components/ErrorBoundary'
import { exportAll, importAll, wipeAll } from '../db/db'
import { useData } from '../hooks/useData'
import { refreshRates, useFxStatus } from '../lib/fx'
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme'
import { timeAgo } from '../lib/time'

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/** 62.6096 -> "62.61", 0.3965 -> "0.3965": two decimals for big rates, up to four (trailing zeros trimmed) for small ones. */
const fmtRate = (r: number) => (r >= 10 ? r.toFixed(2) : String(Number(r.toFixed(4))))

const secondaryBtn =
  'inline-flex h-12 items-center justify-center rounded-[10px] border border-text-950/15 bg-text-950/[0.06] text-sm font-semibold text-text-950 backdrop-blur-md transition active:scale-[0.97] active:bg-text-950/15 disabled:pointer-events-none disabled:opacity-50'

export default function Settings() {
  const { fx, institutions, entries } = useData()
  const [msg, setMsg] = useState('')
  const [theme, setTheme] = useState<ThemePref>(getThemePref())
  const fxStatus = useFxStatus()
  const [busy, setBusy] = useState<string | null>(null)

  /** Runs one action at a time; every button is disabled until it finishes. */
  async function run(key: string, fn: () => Promise<void> | void) {
    if (busy !== null) return
    setBusy(key)
    try {
      await Promise.all([fn(), pause()])
    } finally {
      setBusy(null)
    }
  }

  function exportCsv() {
    const instById = new Map(institutions.map((i) => [i.id, i.name]))
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`
    const rows = entries.map((e) =>
      [e.date, q(instById.get(e.institutionId) ?? ''), e.currency, e.type, (e.amountMinor / 100).toFixed(2), q(e.note)].join(','),
    )
    download('entries.csv', ['date,institution,currency,type,amount,note', ...rows].join('\n'), 'text/csv')
  }

  async function onImport(file: File) {
    try {
      if (!confirm('Importing replaces ALL current data. Continue?')) return
      await importAll(JSON.parse(await file.text()))
      setMsg('Backup imported')
      refreshRates({ force: true })
    } catch (e) {
      setMsg('Import failed: ' + (e as Error).message)
    }
  }

  const rates = fx.filter((r) => r.currency !== 'PHP').sort((a, b) => a.currency.localeCompare(b.currency))
  const liveTimes = rates.filter((r) => r.live).map((r) => new Date(r.updatedAt).getTime())
  const lastLive = liveTimes.length ? Math.max(...liveTimes) : null
  const rateStatus =
    fxStatus === 'loading'
      ? 'Updating live rates…'
      : lastLive === null
        ? fxStatus === 'error'
          ? "Couldn't reach the rate service. Using built-in estimates."
          : 'Estimated rates. Live rates load when you are online.'
        : fxStatus === 'error'
          ? `Offline. Using rates from ${timeAgo(lastLive)}.`
          : `Live rates, updated ${timeAgo(lastLive)}`

  return (
    <div className="space-y-3">
      <PageTitle>Settings</PageTitle>

      <section className="glass rounded-[16px] p-4">
        <h2 className="text-[15px] font-semibold">Backup</h2>
        <p className="mt-1 text-[13px] leading-snug text-text-950/65">Your data lives only on this phone. Export a copy now and then.</p>
        <button
          className={btnCls + ' mt-3.5 !min-h-[52px] !text-base'}
          disabled={busy !== null}
          onClick={() => run('backup', async () => download('mynetworth-backup.json', JSON.stringify(await exportAll(), null, 2), 'application/json'))}
        >
          {busy === 'backup' ? <Spinner /> : 'Export backup'}
        </button>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <button className={secondaryBtn} disabled={busy !== null} onClick={() => run('csv', exportCsv)}>
            {busy === 'csv' ? <Spinner /> : 'Export CSV'}
          </button>
          <label className={secondaryBtn + ' cursor-pointer' + (busy !== null ? ' pointer-events-none opacity-50' : '')}>
            {busy === 'import' ? <Spinner /> : 'Import backup'}
            <input
              type="file"
              accept="application/json"
              hidden
              disabled={busy !== null}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) run('import', () => onImport(file))
              }}
            />
          </label>
        </div>
      </section>

      <section className="glass rounded-[16px] px-4 pb-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">Exchange rates</h2>
            <p className="mt-1 text-[13px] leading-snug text-text-950/65" aria-live="polite">
              {rateStatus}
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh exchange rates"
            className={secondaryBtn + ' !h-11 !w-11 shrink-0'}
            disabled={busy !== null || fxStatus === 'loading'}
            onClick={() => run('fx', async () => void (await refreshRates({ force: true })))}
          >
            <RefreshCw size={18} className={fxStatus === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="mt-2">
          {rates.map((r) => (
            <div key={r.currency} className="flex h-12 items-center justify-between border-t border-text-950/10">
              <span className="text-[15px] font-semibold">1 {r.currency}</span>
              <span className="text-[15px] tabular-nums">₱{fmtRate(r.phpPerUnit)}</span>
            </div>
          ))}
        </div>
        <p className="border-t border-text-950/10 py-3 text-xs text-text-950/55">
          Rates by{' '}
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">
            ExchangeRate-API
          </a>
        </p>
      </section>

      <section className="glass rounded-[16px] p-4">
        <h2 className="mb-3 text-[15px] font-semibold">Appearance</h2>
        <Segmented
          className="bg-text-950/[0.08]"
          value={theme}
          onChange={(v) => {
            setTheme(v)
            setThemePref(v)
          }}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </section>

      <section className="glass flex items-center justify-between gap-3 rounded-[16px] p-4">
        <div>
          <h2 className="text-[15px] font-semibold">App version</h2>
          <p className="mt-0.5 text-[13px] text-text-950/65">
            Built {new Date(__BUILD_TIME__).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <button className={secondaryBtn + ' !h-11 min-w-[116px] shrink-0 px-4'} disabled={busy !== null} onClick={() => run('refresh', resetAppCache)}>
          {busy === 'refresh' ? <Spinner size={18} /> : 'Refresh files'}
        </button>
      </section>

      <button
        className="h-[52px] w-full rounded-[12px] border border-withdraw/50 bg-text-950/[0.06] text-[15px] font-semibold text-withdraw backdrop-blur-md transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        disabled={busy !== null}
        onClick={() =>
          run('erase', async () => {
            if (confirm('Erase ALL data? This cannot be undone.')) {
              await wipeAll()
              setMsg('All data erased')
              refreshRates({ force: true })
            }
          })
        }
      >
        {busy === 'erase' ? <Spinner /> : 'Erase all data'}
      </button>

      {msg && <p className="px-1 text-sm text-text-950/65">{msg}</p>}
    </div>
  )
}
