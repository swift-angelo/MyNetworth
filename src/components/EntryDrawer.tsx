import { CalendarDays, Check, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { colorFor } from '../data/institutions'
import { db } from '../db/db'
import { CATEGORY_LABELS, CURRENCIES, type Category, type EntryType } from '../db/schema'
import { useData } from '../hooks/useData'
import { formatAmountInput, toMinor } from '../lib/money'
import { Field, InstitutionLogo, Segmented, SelectInput, btnCls, controlCls, inputCls, today } from './ui'

const CLOSE_MS = 320

type DrawerApi = { openDrawer: (type?: EntryType) => void }
const DrawerContext = createContext<DrawerApi>({ openDrawer: () => {} })

/** Open the "add entry" drawer from anywhere; `type` presets Deposit or Withdrawal. */
export const useEntryDrawer = () => useContext(DrawerContext)

/** Holds the drawer so any screen's Deposit / Withdraw / Add button can open it without navigating. */
export function EntryDrawerProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false) // in the page
  const [shown, setShown] = useState(false) // slid up (false while sliding away)
  const [preset, setPreset] = useState<EntryType>('deposit')
  const [session, setSession] = useState(0) // a fresh form on every open
  const timer = useRef<number | undefined>(undefined)

  const openDrawer = useCallback((type: EntryType = 'deposit') => {
    window.clearTimeout(timer.current)
    setPreset(type)
    setSession((n) => n + 1)
    setMounted(true)
    // two frames so the sheet is painted off-screen first, then slides in
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
  }, [])

  const close = useCallback(() => {
    setShown(false)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMounted(false), CLOSE_MS)
  }, [])

  return (
    <DrawerContext.Provider value={{ openDrawer }}>
      {children}
      {mounted && <EntryDrawer key={session} shown={shown} initialType={preset} onClose={close} />}
    </DrawerContext.Provider>
  )
}

function EntryDrawer({ shown, initialType, onClose }: { shown: boolean; initialType: EntryType; onClose: () => void }) {
  const { institutions } = useData()
  const [type, setType] = useState<EntryType>(initialType)
  const [institutionId, setInstitutionId] = useState('')
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<Category>('ewallet')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('PHP')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [justAdded, setJustAdded] = useState(false)
  const [saving, setSaving] = useState(false) // true from the tap on Add until the drawer has closed

  const instById = new Map(institutions.map((i) => [i.id!, i]))
  const sorted = [...institutions].sort((a, b) => a.name.localeCompare(b.name))
  const selected = institutionId && institutionId !== 'new' ? instById.get(Number(institutionId)) : undefined

  // Behind the drawer: freeze the page's scrolling and keep it out of reach of taps and focus.
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
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    const minor = toMinor(amount)
    if (!institutionId) return setError('Pick a bank or wallet')
    if (institutionId === 'new' && !newName.trim()) return setError('Enter a name for the new institution')
    if (minor === null || minor <= 0) return setError('Enter a positive amount, e.g. 5,000')
    if (!date) return setError('Pick a date')
    setError('')

    setSaving(true)
    try {
      let instId = Number(institutionId)
      if (institutionId === 'new') {
        instId = (await db.institutions.add({
          name: newName.trim(),
          category: newCategory,
          color: colorFor(institutions.length),
          isCustom: true,
        })) as number
      }
      const trimmed = note.trim()
      await db.entries.add({
        institutionId: instId,
        type,
        amountMinor: minor,
        currency,
        date,
        note: trimmed,
        noteUpdatedAt: trimmed ? new Date().toISOString() : undefined,
      })
      setJustAdded(true)
      setTimeout(onClose, 900) // let the check mark show, then slide the drawer away
    } catch {
      setSaving(false)
      setError('Could not save the entry. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label={type === 'deposit' ? 'Add deposit' : 'Add withdrawal'}>
      <div
        className={'absolute inset-0 bg-[#041801]/40 backdrop-blur-sm transition-opacity duration-300 ' + (shown ? 'opacity-100' : 'opacity-0')}
        onClick={() => !saving && onClose()}
      />
      <div
        className={
          'sheet absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-2xl overflow-y-auto overscroll-contain rounded-t-[22px] px-5 pb-[max(env(safe-area-inset-bottom),20px)] transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] ' +
          (shown ? 'translate-y-0' : 'translate-y-full')
        }
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-text-950/20" />
        <div className="flex items-center justify-between pb-2 pt-1">
          <h2 className="pl-1 text-xl font-bold tracking-tight">{type === 'deposit' ? 'Add deposit' : 'Add withdrawal'}</h2>
          <button
            type="button"
            aria-label="Close"
            disabled={saving}
            className="flex h-11 w-11 items-center justify-center rounded-full text-text-950/70 transition active:scale-90 active:bg-text-950/10 disabled:opacity-40"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={add} className="grid min-w-0 gap-3 pb-1">
          <Segmented
            className="bg-text-950/[0.08]"
            value={type}
            onChange={setType}
            options={[
              { value: 'deposit', label: 'Deposit' },
              { value: 'withdrawal', label: 'Withdrawal' },
            ]}
          />

          <Field label="Bank / wallet">
            <div className="relative">
              {selected && (
                <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2">
                  <InstitutionLogo name={selected.name} color={colorFor(selected.id!)} size={32} />
                </span>
              )}
              <SelectInput
                id="entry-institution-select"
                className="font-medium"
                style={{ paddingLeft: selected ? 58 : undefined }}
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
              >
                <option value="">Select…</option>
                {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => {
                  const group = sorted.filter((i) => i.category === cat)
                  return (
                    group.length > 0 && (
                      <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                        {group.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </optgroup>
                    )
                  )
                })}
                <option value="new">+ Add a new one…</option>
              </SelectInput>
            </div>
          </Field>

          {institutionId === 'new' && (
            <>
              <Field label="Name">
                <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Tala" />
              </Field>
              <Field label="Type">
                <SelectInput value={newCategory} onChange={(e) => setNewCategory(e.target.value as Category)}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </>
          )}

          <Field label="Amount">
            <div
              className={
                'flex h-[68px] items-center gap-2.5 rounded-xl border-[1.5px] bg-text-950/[0.06] pl-3.5 pr-3 backdrop-blur-md ' +
                (type === 'deposit' ? 'border-deposit' : 'border-withdraw')
              }
            >
              <input
                inputMode="decimal"
                className="min-w-0 flex-1 bg-transparent text-[28px] font-bold tracking-tight text-text-950 outline-none placeholder:text-text-950/30"
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                placeholder="0"
              />
              <select
                aria-label="Currency"
                className="h-11 rounded-lg bg-text-950/[0.08] px-2.5 text-sm font-semibold text-text-950 outline-none"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Date">
            <div className={controlCls + ' relative flex items-center gap-2.5 focus-within:border-primary-700'}>
              <CalendarDays size={18} className="shrink-0 text-text-950/60" />
              <span className="text-base">
                {date ? new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pick a date'}
              </span>
              <input
                type="date"
                aria-label="Date"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.()
                  } catch {
                    // some browsers only allow this from certain gestures; the native tap still works
                  }
                }}
              />
            </div>
          </Field>

          <Field label="Note">
            <textarea
              className={inputCls + ' h-[88px] resize-none py-4'}
              placeholder="Optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          {error && <p className="text-sm text-withdraw">{error}</p>}

          <button className={btnCls + ' mt-0.5 disabled:opacity-100'} disabled={saving}>
            {justAdded ? (
              <span key="added" className="pop inline-flex items-center gap-2">
                <Check size={22} strokeWidth={3} /> Added
              </span>
            ) : type === 'deposit' ? (
              'Add deposit'
            ) : (
              'Add withdrawal'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
