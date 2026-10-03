import { describe, expect, it } from 'vitest'
import { formatAmountInput, fromMinor, toMinor, toPhpMinor } from './money'
import { groupByPeriod, groupNet, netContributed } from './calc'
import type { Entry } from '../db/schema'

describe('money', () => {
  it('parses amounts into minor units without float errors', () => {
    expect(toMinor('1,234.50')).toBe(123450)
    expect(toMinor('0.1')).toBe(10)
    expect(toMinor('19.99')).toBe(1999)
    expect(toMinor('abc')).toBeNull()
    expect(toMinor('1.234')).toBeNull()
    expect(fromMinor(123450)).toBe(1234.5)
  })

  it('formats amount input with commas as you type', () => {
    expect(formatAmountInput('1')).toBe('1')
    expect(formatAmountInput('1234')).toBe('1,234')
    expect(formatAmountInput('1,234,567')).toBe('1,234,567')
    expect(formatAmountInput('12345678.5')).toBe('12,345,678.5')
    expect(formatAmountInput('1234.567')).toBe('1,234.56')
    expect(formatAmountInput('.5')).toBe('0.5')
    expect(formatAmountInput('1.2.3')).toBe('1.23')
    expect(formatAmountInput('007')).toBe('7')
    expect(formatAmountInput('abc')).toBe('')
    expect(toMinor(formatAmountInput('1234567.89'))).toBe(123456789)
  })

  it('converts to PHP', () => {
    expect(toPhpMinor(1000, 'USD', { USD: 58 })).toBe(58000)
    expect(toPhpMinor(1000, 'PHP', {})).toBe(1000)
    expect(toPhpMinor(1000, 'XXX', {})).toBe(0)
  })
})

const entry = (p: Partial<Entry>): Entry => ({
  institutionId: 1,
  type: 'deposit',
  amountMinor: 10000,
  currency: 'PHP',
  date: '2026-01-01',
  note: '',
  ...p,
})

describe('calc', () => {
  it('nets deposits and withdrawals', () => {
    expect(netContributed([entry({}), entry({ amountMinor: 5000 }), entry({ type: 'withdrawal', amountMinor: 3000 })])).toBe(12000)
  })

  it('groups by period in PHP', () => {
    const rows = groupByPeriod(
      [
        entry({ date: '2026-02-10' }),
        entry({ date: '2026-01-05', currency: 'USD', amountMinor: 100 }),
        entry({ date: '2026-01-20', type: 'withdrawal', amountMinor: 2000 }),
      ],
      { USD: 50 },
      'month',
    )
    expect(rows).toEqual([
      { key: '2026-01', deposits: 5000, withdrawals: 2000 },
      { key: '2026-02', deposits: 10000, withdrawals: 0 },
    ])
    expect(groupByPeriod([entry({ date: '2026-02-10' }), entry({ date: '2027-01-01' })], {}, 'year').map((r) => r.key)).toEqual(['2026', '2027'])
  })

  it('groups net by key', () => {
    const rows = groupNet([entry({ institutionId: 1 }), entry({ institutionId: 2, amountMinor: 500 }), entry({ institutionId: 1, type: 'withdrawal', amountMinor: 4000 })], {}, (e) => e.institutionId)
    expect(rows.find((r) => r.key === 1)?.net).toBe(6000)
    expect(rows.find((r) => r.key === 2)?.net).toBe(500)
  })
})
