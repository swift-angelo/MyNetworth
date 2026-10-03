import { CalendarDays, Receipt, StickyNote } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import SwipeRow from '../components/SwipeRow'
import { EmptyState, Field, InstitutionLogo, PageTitle, Segmented, SelectInput, btnCls, controlCls, inputCls, today } from '../components/ui'
import { colorFor } from '../data/institutions'
import { db } from '../db/db'
import { CATEGORY_LABELS, CURRENCIES, type Category, type EntryType } from '../db/schema'
import { useData } from '../hooks/useData'
import { formatAmountInput, formatMoney, toMinor } from '../lib/money'

export default function Entries() {
  const { institutions, entries } = useData()
  const [params] = useSearchParams()
  const [type, setType] = useState<EntryType>(params.get('type') === 'withdrawal' ? 'withdrawal' : 'deposit')
  const [institutionId, setInstitutionId] = useState('')
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<Category>('ewallet')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('PHP')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [openId, setOpenId] = useState<number | null>(null) // entry whose note is showing
  const [swipeId, setSwipeId] = useState<number | null>(null) // entry swiped open to reveal delete
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')

  const instById = new Map(institutions.map((i) => [i.id!, i]))
  const sorted = [...institutions].sort((a, b) => a.name.localeCompare(b.name))
  const selected = institutionId && institutionId !== 'new' ? instById.get(Number(institutionId)) : undefined

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const minor = toMinor(amount)
    if (!institutionId) return setError('Pick a bank or wallet')
    if (institutionId === 'new' && !newName.trim()) return setError('Enter a name for the new institution')
    if (minor === null || minor <= 0) return setError('Enter a positive amount, e.g. 5,000.00')
    if (!date) return setError('Pick a date')
    setError('')

    let instId = Number(institutionId)
    if (institutionId === 'new') {
      instId = (await db.institutions.add({
        name: newName.trim(),
        category: newCategory,
        color: colorFor(institutions.length),
        isCustom: true,
      })) as number
      setInstitutionId(String(instId))
      setNewName('')
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
    setAmount('')
    setNote('')
  }

  // The editor opens near the bottom of the list; bring it (and its Save button) clear of the tab bar.
  useEffect(() => {
    if (editingId !== null) document.getElementById('note-editor')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [editingId])

  async function saveNote(id: number) {
    const next = draft.trim()
    setEditingId(null)
    if (next === (entries.find((x) => x.id === id)?.note ?? '')) return // unchanged: keep the old timestamp
    await db.entries.update(id, { note: next, noteUpdatedAt: next ? new Date().toISOString() : undefined })
    if (next === '') setOpenId(null) // nothing left to show
  }

  const shown = entries
    .filter((e) => !filter || String(e.institutionId) === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))
  const usedInstitutionIds = new Set(entries.map((e) => e.institutionId))

  return (
    <div className="space-y-3.5">
      <PageTitle>Entries</PageTitle>

      <section className="glass rounded-[28px] p-4">
        <form onSubmit={add} className="grid min-w-0 gap-3">
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
                'flex h-[68px] items-center gap-2.5 rounded-2xl border-[1.5px] bg-text-950/[0.06] pl-3.5 pr-3 backdrop-blur-md ' +
                (type === 'deposit' ? 'border-deposit' : 'border-withdraw')
              }
            >
              <input
                inputMode="decimal"
                className="min-w-0 flex-1 bg-transparent text-[28px] font-bold tracking-tight text-text-950 outline-none placeholder:text-text-950/30"
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                placeholder="0.00"
              />
              <select
                aria-label="Currency"
                className="h-11 rounded-xl bg-text-950/[0.08] px-2.5 text-sm font-semibold text-text-950 outline-none"
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

          <button className={btnCls + ' mt-0.5'}>{type === 'deposit' ? 'Add deposit' : 'Add withdrawal'}</button>
        </form>
        {error && <p className="mt-3 text-sm text-withdraw">{error}</p>}
      </section>

      <div className="flex items-center justify-between pt-1">
        <h2 className="pl-1 text-[15px] font-semibold">History</h2>
        {entries.length > 0 && (
          <select
            aria-label="Filter by bank or wallet"
            className="h-11 max-w-[55%] bg-transparent text-right text-sm font-semibold text-link outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All banks</option>
            {sorted
              .filter((i) => usedInstitutionIds.has(i.id!))
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
          </select>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="glass rounded-3xl">
          <EmptyState
            icon={<Receipt size={30} strokeWidth={1.75} />}
            title="No entries yet"
            description="Log your first deposit or withdrawal to start tracking where your money goes."
            ctaLabel="Add your first entry"
            onCta={() => {
              const el = document.getElementById('entry-institution-select')
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              el?.focus({ preventScroll: true })
            }}
          />
        </div>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-950/65">No entries for this one.</p>
      ) : (
        <ul className="glass divide-y divide-text-950/10 rounded-3xl px-3.5">
          {shown.map((e) => {
            const inst = instById.get(e.institutionId)
            return (
              <li key={e.id}>
                <SwipeRow
                  open={swipeId === e.id}
                  onOpenChange={(o) => setSwipeId(o ? e.id! : swipeId === e.id ? null : swipeId)}
                  onDelete={() => {
                    if (confirm('Delete this entry?')) {
                      setSwipeId(null)
                      db.entries.delete(e.id!)
                    }
                  }}
                >
                  {(() => {
                    const hasNote = e.note.trim() !== ''
                    const open = openId === e.id
                    const body = (
                      <>
                        <InstitutionLogo name={inst?.name ?? '?'} color={inst ? colorFor(inst.id!) : undefined} size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-semibold">{inst?.name ?? 'Unknown'}</div>
                          <div className="flex items-center gap-1.5 text-xs text-text-950/65">
                            <span className="truncate">
                              {new Date(e.date + 'T00:00:00').toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {hasNote && (
                              <StickyNote size={13} aria-label="Has a note" className={'shrink-0 transition-colors ' + (open ? 'text-link' : 'text-text-950/60')} />
                            )}
                          </div>
                        </div>
                        <span className={'text-[15px] font-semibold tabular-nums ' + (e.type === 'deposit' ? 'text-deposit' : 'text-withdraw')}>
                          {e.type === 'deposit' ? '+' : '−'}
                          {formatMoney(e.amountMinor, e.currency)}
                        </span>
                      </>
                    )
                    const rowCls = 'flex h-[62px] w-full min-w-0 items-center gap-3 text-left'
                    return hasNote ? (
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={`${inst?.name ?? 'Entry'}, has a note. Tap to ${open ? 'hide' : 'show'} it`}
                        className={rowCls}
                        onClick={() => {
                          setEditingId(null)
                          setOpenId(open ? null : e.id!)
                        }}
                      >
                        {body}
                      </button>
                    ) : (
                      <div className={rowCls}>{body}</div>
                    )
                  })()}
                </SwipeRow>
                {openId === e.id && e.note.trim() !== '' && (
                  <div className="mb-3 ml-12">
                    {editingId === e.id ? (
                      <div id="note-editor">
                        <textarea
                          autoFocus
                          aria-label="Edit note"
                          className="block min-h-24 w-full resize-none rounded-xl border border-primary-700 bg-text-950/[0.06] px-3 py-2.5 text-base leading-snug text-text-950 outline-none"
                          value={draft}
                          onChange={(ev) => setDraft(ev.target.value)}
                          onFocus={(ev) => ev.currentTarget.setSelectionRange(ev.currentTarget.value.length, ev.currentTarget.value.length)}
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            className="h-10 rounded-xl border border-text-950/15 bg-text-950/[0.06] px-4 text-sm font-semibold text-text-950 transition active:scale-[0.97]"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="h-10 rounded-xl bg-primary-500 px-5 text-sm font-semibold text-on-primary transition active:scale-[0.97]"
                            onClick={() => saveNote(e.id!)}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label="Edit note"
                        className="block w-full whitespace-pre-wrap break-words rounded-xl bg-text-950/[0.06] px-3 py-2.5 text-left text-sm leading-snug"
                        onClick={() => {
                          setDraft(e.note)
                          setEditingId(e.id!)
                        }}
                      >
                        {e.note}
                      </button>
                    )}
                    {e.noteUpdatedAt && (
                      <p className="mt-1.5 px-1 text-[11px] text-text-950/55">
                        Last edited{' '}
                        {new Date(e.noteUpdatedAt).toLocaleString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
