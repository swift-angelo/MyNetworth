import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../db/db'

export function useData() {
  const institutions = useLiveQuery(() => db.institutions.toArray(), [])
  const entries = useLiveQuery(() => db.entries.toArray(), [])
  const fx = useLiveQuery(() => db.fxRates.toArray(), [])

  const rates = useMemo(() => Object.fromEntries((fx ?? []).map((r) => [r.currency, r.phpPerUnit])), [fx])
  const loading = !institutions || !entries || !fx

  return {
    loading,
    institutions: institutions ?? [],
    entries: entries ?? [],
    fx: fx ?? [],
    rates,
  }
}
