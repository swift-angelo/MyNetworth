import { CalendarDays, Check } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { colorFor } from '../data/institutions'
import { db } from '../db/db'
import { CATEGORY_LABELS, CURRENCIES, type Category, type EntryType } from '../db/schema'
import { useData } from '../hooks/useData'
import { formatAmountInput, toMinor } from '../lib/money'
import { Sheet, useSheetState } from './Sheet'
import { Field, InstitutionLogo, Segmented, SelectInput, btnCls, controlCls, inputCls, today } from './ui'

type DrawerApi = { openDrawer: (type?: EntryType) => void }
const DrawerContext = createContext<DrawerApi>({ openDrawer: () => {} })

/** Open the "add entry" drawer from anywhere; `type` presets Deposit or Withdrawal. */
export const useEntryDrawer = () => useContext(DrawerContext)

/** Holds the drawer so any screen's Deposit / Withdraw / Add button can open it without navigating. */
export function EntryDrawerProvider({ children }: { children: ReactNode }) {
  const sheet = useSheetState()
  const [preset, setPreset] = useState<EntryType>('deposit')
  const [session, setSession] = useState(0) // a fresh form on every open

  const openDrawer = useCallback(
    (type: EntryType = 'deposit') => {
      setPreset(type)
      setSession((n) => n + 1)
      sheet.open()
    },
    [sheet.open], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <DrawerContext.Provider value={{ openDrawer }}>
      {children}
      {sheet.mounted && <EntryDrawer key={session} shown={sheet.shown} initialType={preset} onClose={sheet.close} />}
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
    <Sheet shown={shown} onClose={onClose} locked={saving} label={type === 'deposit' ? 'Add deposit' : 'Add withdrawal'}>
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
    </Sheet>
  )
}
