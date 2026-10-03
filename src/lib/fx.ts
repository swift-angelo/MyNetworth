import { useSyncExternalStore } from 'react'
import { db } from '../db/db'
import { CURRENCIES } from '../db/schema'

/** Free, keyless, CORS-enabled, daily updates, covers every currency we support (including AED and SAR). */
const PRIMARY = 'https://open.er-api.com/v6/latest/PHP'
/** Same idea from a CDN, used only if the primary fails. Keys are lowercase. */
const FALLBACK = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/php.json'

const TIMEOUT_MS = 8000
/** Opening the app can fire several triggers at once (StrictMode, quick app switches); only one fetch per minute. */
const MIN_GAP_MS = 60_000

export type FxStatus = 'idle' | 'loading' | 'ok' | 'error'

let status: FxStatus = 'idle'
const listeners = new Set<() => void>()
const setStatus = (s: FxStatus) => {
  status = s
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Current state of the live-rate fetch, for the Settings screen. */
export const useFxStatus = (): FxStatus => useSyncExternalStore(subscribe, () => status)

/** Both APIs give "units of X per 1 PHP"; we store "PHP per 1 unit of X". Anything that is not a sane positive number is dropped. */
function invert(perPhp: Record<string, unknown>, upperCaseKeys: boolean): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of CURRENCIES) {
    if (c === 'PHP') continue
    const v = perPhp[upperCaseKeys ? c : c.toLowerCase()]
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue
    const phpPerUnit = 1 / v
    if (phpPerUnit > 0.0001 && phpPerUnit < 100000) out[c] = phpPerUnit
  }
  return out
}

export function parsePrimary(data: any): Record<string, number> {
  if (data?.result !== 'success' || typeof data?.rates !== 'object' || data.rates === null) return {}
  return invert(data.rates, true)
}

export function parseFallback(data: any): Record<string, number> {
  if (typeof data?.php !== 'object' || data.php === null) return {}
  return invert(data.php, false)
}

async function getJson(url: string): Promise<unknown> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** PHP-per-unit rates from the primary source, or the fallback if that fails or returns nothing usable. Throws if both fail. */
export async function fetchLiveRates(): Promise<Record<string, number>> {
  try {
    const rates = parsePrimary(await getJson(PRIMARY))
    if (Object.keys(rates).length > 0) return rates
  } catch {
    // fall through to the backup source
  }
  const rates = parseFallback(await getJson(FALLBACK))
  if (Object.keys(rates).length === 0) throw new Error('No usable exchange rates')
  return rates
}

let inFlight: Promise<boolean> | null = null
let lastStart = 0

/**
 * Fetch live rates and store them. Never throws: on any failure the previously stored rates stay in place.
 * Returns whether new rates were stored (or a recent attempt already did).
 */
export function refreshRates({ force = false }: { force?: boolean } = {}): Promise<boolean> {
  if (inFlight) return inFlight
  if (!force && lastStart && Date.now() - lastStart < MIN_GAP_MS) return Promise.resolve(status !== 'error')
  lastStart = Date.now()
  setStatus('loading')
  inFlight = (async () => {
    try {
      const rates = await fetchLiveRates()
      const updatedAt = new Date().toISOString()
      await db.fxRates.bulkPut(Object.entries(rates).map(([currency, phpPerUnit]) => ({ currency, phpPerUnit, updatedAt, live: true })))
      setStatus('ok')
      return true
    } catch {
      setStatus('error')
      return false
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

/** Test helper: forget the guard and status between tests. */
export function __resetFxForTests() {
  inFlight = null
  lastStart = 0
  setStatus('idle')
}
