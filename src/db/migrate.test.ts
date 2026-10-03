import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { expect, it } from 'vitest'

it('upgrades a v1 database (accounts) to v2 (entries carry institution + currency)', async () => {
  const old = new Dexie('mynetworth')
  old.version(1).stores({
    institutions: '++id, name, category',
    accounts: '++id, institutionId',
    entries: '++id, accountId, date, type',
    snapshots: '++id, accountId, date',
    fxRates: 'currency',
  })
  await old.table('institutions').add({ name: 'Wise', category: 'intl_wallet', color: '#000', isCustom: false })
  await old.table('accounts').add({ institutionId: 1, nickname: '', currency: 'USD', currentBalanceMinor: null, balanceUpdatedAt: null })
  await old.table('entries').add({ accountId: 1, type: 'deposit', amountMinor: 500, date: '2026-01-01', note: '' })
  old.close()

  const { db } = await import('./db')
  const entries = await db.entries.toArray()
  expect(entries).toEqual([{ id: 1, institutionId: 1, currency: 'USD', type: 'deposit', amountMinor: 500, date: '2026-01-01', note: '' }])
  expect(db.tables.map((t) => t.name).sort()).toEqual(['entries', 'fxRates', 'institutions'])
}, 10000)
