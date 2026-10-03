import type { Entry } from '../db/schema'
import { toPhpMinor } from './money'

type Amounted = Pick<Entry, 'type' | 'amountMinor'>

/** Deposits positive, withdrawals negative. */
export const signedMinor = (e: Amounted) => (e.type === 'deposit' ? e.amountMinor : -e.amountMinor)

/** Deposits minus withdrawals, in minor units. */
export function netContributed(entries: Amounted[]): number {
  return entries.reduce((sum, e) => sum + signedMinor(e), 0)
}

/** Signed amount of an entry converted to PHP minor units. */
export const signedPhp = (e: Entry, rates: Record<string, number>) => toPhpMinor(signedMinor(e), e.currency, rates)

export type Period = 'day' | 'month' | 'year'

const KEY_LENGTH: Record<Period, number> = { day: 10, month: 7, year: 4 }

/** Group entries by date bucket, totalling deposits and withdrawals in PHP minor units. Sorted oldest first. */
export function groupByPeriod(entries: Entry[], rates: Record<string, number>, period: Period) {
  const map = new Map<string, { key: string; deposits: number; withdrawals: number }>()
  for (const e of entries) {
    const key = e.date.slice(0, KEY_LENGTH[period])
    const row = map.get(key) ?? { key, deposits: 0, withdrawals: 0 }
    const php = toPhpMinor(e.amountMinor, e.currency, rates)
    if (e.type === 'deposit') row.deposits += php
    else row.withdrawals += php
    map.set(key, row)
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

/** Group entries by an arbitrary key, netting deposits minus withdrawals in PHP minor units. */
export function groupNet<K extends string | number>(entries: Entry[], rates: Record<string, number>, keyOf: (e: Entry) => K) {
  const map = new Map<K, { key: K; deposits: number; withdrawals: number; net: number }>()
  for (const e of entries) {
    const key = keyOf(e)
    const row = map.get(key) ?? { key, deposits: 0, withdrawals: 0, net: 0 }
    const php = toPhpMinor(e.amountMinor, e.currency, rates)
    if (e.type === 'deposit') row.deposits += php
    else row.withdrawals += php
    row.net = row.deposits - row.withdrawals
    map.set(key, row)
  }
  return [...map.values()]
}
