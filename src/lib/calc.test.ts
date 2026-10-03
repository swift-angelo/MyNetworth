import { describe, expect, it } from 'vitest'
import type { Entry } from '../db/schema'
import { runningTotal } from './calc'

const e = (date: string, type: Entry['type'], amountMinor: number, currency = 'PHP'): Entry => ({ institutionId: 1, type, amountMinor, currency, date, note: '' })

describe('runningTotal', () => {
  it('accumulates net per day, oldest first, regardless of input order', () => {
    const entries = [e('2026-01-03', 'withdrawal', 20_00), e('2026-01-01', 'deposit', 100_00), e('2026-01-01', 'deposit', 50_00)]
    expect(runningTotal(entries, { PHP: 1 })).toEqual([150_00, 130_00])
  })

  it('converts foreign currency with the given rates', () => {
    expect(runningTotal([e('2026-01-01', 'deposit', 10_00, 'USD')], { PHP: 1, USD: 60 })).toEqual([600_00])
  })

  it('is empty with no entries', () => {
    expect(runningTotal([], { PHP: 1 })).toEqual([])
  })
})
