import { Check, Plus, Receipt, StickyNote } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useEntryDrawer } from '../components/EntryDrawer'
import SwipeRow from '../components/SwipeRow'
import { EmptyState, InstitutionLogo, PageTitle, Spinner, pause } from '../components/ui'
import { colorFor } from '../data/institutions'
import { db } from '../db/db'
import { useData } from '../hooks/useData'
import { formatMoney } from '../lib/money'

export default function Entries() {
  const { institutions, entries } = useData()
  const { openDrawer } = useEntryDrawer()
  const [filter, setFilter] = useState('')
  const [openId, setOpenId] = useState<number | null>(null) // entry whose note is showing
  const [swipeId, setSwipeId] = useState<number | null>(null) // entry swiped open to reveal delete
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [flashId, setFlashId] = useState<number | null>(null) // entry whose note is being saved (spinner, then a check)
  const [saved, setSaved] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const instById = new Map(institutions.map((i) => [i.id!, i]))
  const sorted = [...institutions].sort((a, b) => a.name.localeCompare(b.name))

  // The editor opens near the bottom of the list; bring it (and its Save button) clear of the tab bar.
  useEffect(() => {
    if (editingId !== null) document.getElementById('note-editor')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [editingId])

  /** Writes the edited note (only if it really changed, so the "last edited" time stays honest). */
  async function persistNote(id: number) {
    const next = draft.trim()
    if (next === (entries.find((x) => x.id === id)?.note ?? '')) return
    await db.entries.update(id, { note: next, noteUpdatedAt: next ? new Date().toISOString() : undefined })
  }

  /** Save: a check pops on the button, then the editor and the note fold away. */
  async function onSaveNote(id: number) {
    if (flashId !== null) return
    setFlashId(id)
    await Promise.all([persistNote(id), pause()])
    setSaved(true)
    setTimeout(() => {
      setEditingId(null)
      setOpenId(null)
      setFlashId(null)
      setSaved(false)
    }, 600)
  }

  function onCancelNote() {
    setEditingId(null)
    setOpenId(null)
  }

  const shown = entries
    .filter((e) => !filter || String(e.institutionId) === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))
  const usedInstitutionIds = new Set(entries.map((e) => e.institutionId))

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <PageTitle>Entries</PageTitle>
        <button
          type="button"
          onClick={() => openDrawer()}
          className="flex h-11 items-center gap-1.5 rounded-full bg-primary-500 pl-3.5 pr-5 text-sm font-semibold text-on-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_8px_20px_color-mix(in_srgb,var(--primary-500)_30%,transparent)] transition active:scale-95"
        >
          <Plus size={18} strokeWidth={2.5} /> Add
        </button>
      </div>

      {entries.length === 0 && (
        <div className="glass rounded-[16px]">
          <EmptyState
            icon={<Receipt size={30} strokeWidth={1.75} />}
            title="No entries yet"
            description="Log your first deposit or withdrawal to start tracking where your money goes."
            ctaLabel="Add your first entry"
            onCta={() => openDrawer()}
          />
        </div>
      )}

      {entries.length > 0 && (
        <>
      <div className="flex items-center justify-between pt-1">
        <h2 className="pl-1 text-[15px] font-semibold">History</h2>
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
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-950/65">No entries for this one.</p>
      ) : (
        <ul className="glass divide-y divide-text-950/10 rounded-[16px] px-3.5">
          {shown.map((e) => {
            const inst = instById.get(e.institutionId)
            return (
              <li key={e.id}>
                <SwipeRow
                  open={swipeId === e.id}
                  onOpenChange={(o) => setSwipeId(o ? e.id! : swipeId === e.id ? null : swipeId)}
                  disabled={deletingId === e.id}
                  onDelete={async () => {
                    if (deletingId !== null || !confirm('Delete this entry?')) return
                    setDeletingId(e.id!)
                    setSwipeId(null)
                    try {
                      await db.entries.delete(e.id!)
                    } finally {
                      setDeletingId(null)
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
                {e.note.trim() !== '' && (
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ gridTemplateRows: openId === e.id ? '1fr' : '0fr' }}
                    inert={openId !== e.id}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="mb-3 ml-12">
                        {editingId === e.id ? (
                          <textarea
                            autoFocus
                            aria-label="Edit note"
                            className="block min-h-24 w-full resize-none rounded-lg border border-primary-700 bg-text-950/[0.06] px-3 py-2.5 text-base leading-snug text-text-950 outline-none"
                            value={draft}
                            onChange={(ev) => setDraft(ev.target.value)}
                            onFocus={(ev) => ev.currentTarget.setSelectionRange(ev.currentTarget.value.length, ev.currentTarget.value.length)}
                          />
                        ) : (
                          <button
                            type="button"
                            aria-label="Edit note"
                            className="block w-full whitespace-pre-wrap break-words rounded-lg bg-text-950/[0.06] px-3 py-2.5 text-left text-sm leading-snug"
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
                        {editingId === e.id && (
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              className="h-10 rounded-lg border border-text-950/15 bg-text-950/[0.06] px-4 text-sm font-semibold text-text-950 transition active:scale-90 disabled:opacity-50"
                              disabled={flashId !== null}
                              onClick={onCancelNote}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className={
                                'flex h-10 min-w-[84px] items-center justify-center rounded-lg bg-primary-500 px-5 text-sm font-semibold text-on-primary transition active:scale-90 ' +
                                (flashId === e.id && saved ? 'scale-105 shadow-[0_0_18px_color-mix(in_srgb,var(--primary-500)_60%,transparent)]' : '')
                              }
                              disabled={flashId !== null}
                              onClick={() => onSaveNote(e.id!)}
                            >
                              {flashId === e.id ? saved ? <Check key="ok" size={20} strokeWidth={3} className="pop" /> : <Spinner size={18} /> : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
        </>
      )}
    </div>
  )
}
