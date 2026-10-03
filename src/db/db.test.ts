import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { db, seedIfEmpty } from './db'

it('seeds a fresh database without hanging, even when called twice at once', async () => {
  await Promise.all([seedIfEmpty(), seedIfEmpty()])
  const names = (await db.institutions.toArray()).map((i) => i.name)
  expect(names.length).toBeGreaterThan(40)
  expect(new Set(names).size).toBe(names.length)
  expect(await db.fxRates.count()).toBeGreaterThan(5)
}, 10000)
