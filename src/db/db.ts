import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_FX, SEED_INSTITUTIONS, colorFor } from '../data/institutions'
import type { Entry, FxRate, Institution } from './schema'

export const db = new Dexie('mynetworth') as Dexie & {
  institutions: EntityTable<Institution, 'id'>
  entries: EntityTable<Entry, 'id'>
  fxRates: EntityTable<FxRate, 'currency'>
}

db.version(1).stores({
  institutions: '++id, name, category',
  accounts: '++id, institutionId',
  entries: '++id, accountId, date, type',
  snapshots: '++id, accountId, date',
  fxRates: 'currency',
})

// v2: accounts are gone. Entries point straight at an institution and carry their own currency.
db.version(2)
  .stores({
    institutions: '++id, name, category',
    entries: '++id, institutionId, date, type',
    fxRates: 'currency',
    accounts: null,
    snapshots: null,
  })
  .upgrade(async (tx) => {
    const accounts: { id: number; institutionId: number; currency: string }[] = await tx.table('accounts').toArray()
    const byId = new Map(accounts.map((a) => [a.id, a]))
    await tx
      .table('entries')
      .toCollection()
      .modify((e: Record<string, unknown>) => {
        const a = byId.get(e.accountId as number)
        e.institutionId = a?.institutionId ?? 0
        e.currency = a?.currency ?? 'PHP'
        delete e.accountId
      })
  })

let seeding: Promise<void> | null = null

/** Single-flight: React StrictMode runs effects twice in dev, which used to seed everything twice. */
export function seedIfEmpty() {
  seeding ??= doSeed().finally(() => (seeding = null))
  return seeding
}

/** Merge institutions with the same name, repointing entries to the one kept. */
async function dedupeInstitutions() {
  await db.transaction('rw', [db.institutions, db.entries], async () => {
    const kept = new Map<string, number>()
    for (const inst of await db.institutions.orderBy('id').toArray()) {
      const key = inst.name.trim().toLowerCase()
      const keepId = kept.get(key)
      if (keepId === undefined) {
        kept.set(key, inst.id!)
        continue
      }
      await db.entries.where('institutionId').equals(inst.id!).modify({ institutionId: keepId })
      await db.institutions.delete(inst.id!)
    }
  })
}

async function doSeed() {
  await dedupeInstitutions()
  if ((await db.institutions.count()) === 0) {
    await db.institutions.bulkAdd(
      SEED_INSTITUTIONS.map(([name, category], i) => ({ name, category, color: colorFor(i), isCustom: false })),
    )
  }
  if ((await db.fxRates.count()) === 0) {
    const now = new Date().toISOString()
    await db.fxRates.bulkPut(Object.entries(DEFAULT_FX).map(([currency, phpPerUnit]) => ({ currency, phpPerUnit, updatedAt: now })))
  }
}

export interface Backup {
  version: 2
  exportedAt: string
  institutions: Institution[]
  entries: Entry[]
  fxRates: FxRate[]
}

export async function exportAll(): Promise<Backup> {
  const [institutions, entries, fxRates] = await Promise.all([db.institutions.toArray(), db.entries.toArray(), db.fxRates.toArray()])
  return { version: 2, exportedAt: new Date().toISOString(), institutions, entries, fxRates }
}

/** Accepts v2 backups, and v1 backups (which had accounts) by folding accounts into entries. */
export async function importAll(data: any) {
  let entries: Entry[]
  if (data?.version === 2) {
    entries = data.entries
  } else if (data?.version === 1) {
    const byId = new Map<number, { institutionId: number; currency: string }>(data.accounts.map((a: any) => [a.id, a]))
    entries = data.entries.map(({ accountId, ...rest }: any) => ({
      ...rest,
      institutionId: byId.get(accountId)?.institutionId ?? 0,
      currency: byId.get(accountId)?.currency ?? 'PHP',
    }))
  } else {
    throw new Error('Unrecognised backup file')
  }
  await db.transaction('rw', [db.institutions, db.entries, db.fxRates], async () => {
    await Promise.all([db.institutions.clear(), db.entries.clear(), db.fxRates.clear()])
    await db.institutions.bulkAdd(data.institutions)
    await db.entries.bulkAdd(entries)
    await db.fxRates.bulkAdd(data.fxRates)
  })
}

export async function wipeAll() {
  await Promise.all([db.institutions.clear(), db.entries.clear(), db.fxRates.clear()])
  await seedIfEmpty()
}
