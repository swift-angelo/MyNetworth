import { useState } from 'react'
import { PageTitle, Segmented, btnCls, inputCls } from '../components/ui'
import { resetAppCache } from '../components/ErrorBoundary'
import { db, exportAll, importAll, wipeAll } from '../db/db'
import { useData } from '../hooks/useData'
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme'

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const secondaryBtn =
  'inline-flex h-12 items-center justify-center rounded-[10px] border border-text-950/15 bg-text-950/[0.06] text-sm font-semibold text-text-950 backdrop-blur-md transition active:scale-[0.97] active:bg-text-950/15 disabled:pointer-events-none disabled:opacity-50'

export default function Settings() {
  const { fx, institutions, entries } = useData()
  const [msg, setMsg] = useState('')
  const [theme, setTheme] = useState<ThemePref>(getThemePref())
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  /** Runs one action at a time; every button is disabled until it finishes. */
  async function run(key: string, fn: () => Promise<void> | void) {
    if (busy !== null) return
    setBusy(key)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  async function saveRate(currency: string) {
    const v = parseFloat(edits[currency])
    if (!(v > 0)) return setMsg('Rate must be a positive number')
    await db.fxRates.put({ currency, phpPerUnit: v, updatedAt: new Date().toISOString() })
    setEdits((s) => {
      const { [currency]: _, ...rest } = s
      return rest
    })
    setMsg(`Saved ${currency} rate`)
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
    } catch (e) {
      setMsg('Import failed: ' + (e as Error).message)
    }
  }

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
          Export backup
        </button>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <button className={secondaryBtn} disabled={busy !== null} onClick={() => run('csv', exportCsv)}>
            Export CSV
          </button>
          <label className={secondaryBtn + ' cursor-pointer' + (busy !== null ? ' pointer-events-none opacity-50' : '')}>
            Import backup
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

      <section className="glass rounded-[16px] px-4 pb-2 pt-4">
        <h2 className="text-[15px] font-semibold">Exchange rates</h2>
        <p className="mt-1 text-[13px] text-text-950/65">PHP per 1 unit. Used to total foreign-currency entries.</p>
        <div className="mt-2">
          {fx
            .filter((r) => r.currency !== 'PHP')
            .map((r) => (
              <div key={r.currency} className="flex h-[58px] items-center justify-between gap-2 border-t border-text-950/10">
                <span className="text-[15px] font-semibold">{r.currency}</span>
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`${r.currency} rate`}
                    className={inputCls + ' !min-h-11 !w-[104px] !rounded-lg !px-3 text-right !text-[15px]'}
                    inputMode="decimal"
                    value={edits[r.currency] ?? String(r.phpPerUnit)}
                    onChange={(e) => setEdits((s) => ({ ...s, [r.currency]: e.target.value }))}
                  />
                  <button
                    className={secondaryBtn + ' !h-11 px-4 disabled:opacity-40'}
                    onClick={() => run('rate-' + r.currency, () => saveRate(r.currency))}
                    disabled={busy !== null || edits[r.currency] === undefined}
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
        </div>
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
        <button className={secondaryBtn + ' !h-11 shrink-0 px-4'} disabled={busy !== null} onClick={() => run('refresh', resetAppCache)}>
          Refresh files
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
            }
          })
        }
      >
        Erase all data
      </button>

      {msg && <p className="px-1 text-sm text-text-950/65">{msg}</p>}
    </div>
  )
}
