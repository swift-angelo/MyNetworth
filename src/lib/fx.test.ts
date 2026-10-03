import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { __resetFxForTests, fetchLiveRates, parseFallback, parsePrimary, refreshRates } from './fx'

const primaryOk = {
  result: 'success',
  rates: { PHP: 1, USD: 0.016, EUR: 0.0142, GBP: 0.0121, SGD: 0.0205, AUD: 0.023, CAD: 0.0228, JPY: 2.5, HKD: 0.125, AED: 0.0587, SAR: 0.0599 },
}

const json = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body }) as Response

describe('parsing', () => {
  it('turns "X per PHP" into "PHP per X"', () => {
    const r = parsePrimary(primaryOk)
    expect(r.USD).toBeCloseTo(62.5, 5)
    expect(r.JPY).toBeCloseTo(0.4, 5)
    expect(r.PHP).toBeUndefined()
    expect(Object.keys(r).sort()).toEqual(['AED', 'AUD', 'CAD', 'EUR', 'GBP', 'HKD', 'JPY', 'SAR', 'SGD', 'USD'])
  })

  it('rejects an unsuccessful or malformed response', () => {
    expect(parsePrimary({ result: 'error', rates: primaryOk.rates })).toEqual({})
    expect(parsePrimary({ result: 'success' })).toEqual({})
    expect(parsePrimary(null)).toEqual({})
  })

  it('drops values that are not sane positive numbers', () => {
    const r = parsePrimary({ result: 'success', rates: { USD: 0, EUR: -1, GBP: NaN, SGD: '0.02', AUD: Infinity, CAD: 0.0228 } })
    expect(Object.keys(r)).toEqual(['CAD'])
  })

  it('reads the fallback format (lowercase keys)', () => {
    const r = parseFallback({ date: '2026-10-02', php: { usd: 0.016, aed: 0.0587, eur: 0.0142 } })
    expect(r.USD).toBeCloseTo(62.5, 5)
    expect(r.AED).toBeCloseTo(17.036, 2)
    expect(parseFallback({})).toEqual({})
  })
})

describe('fetching', () => {
  beforeEach(() => __resetFxForTests())
  afterEach(() => vi.unstubAllGlobals())

  it('uses the primary source when it works', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(primaryOk))
    vi.stubGlobal('fetch', fetchMock)
    const r = await fetchLiveRates()
    expect(r.USD).toBeCloseTo(62.5, 5)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('open.er-api.com')
  })

  it('falls back when the primary fails, errors or returns nothing usable', async () => {
    for (const first of [() => Promise.reject(new Error('network')), () => Promise.resolve(json({}, false)), () => Promise.resolve(json({ result: 'error' }))]) {
      const fetchMock = vi.fn().mockImplementationOnce(first).mockResolvedValueOnce(json({ php: { usd: 0.016 } }))
      vi.stubGlobal('fetch', fetchMock)
      const r = await fetchLiveRates()
      expect(r.USD).toBeCloseTo(62.5, 5)
      expect(String(fetchMock.mock.calls[1][0])).toContain('jsdelivr')
    }
  })

  it('throws when both sources fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(fetchLiveRates()).rejects.toThrow()
  })
})

describe('refreshRates', () => {
  beforeEach(async () => {
    __resetFxForTests()
    await db.fxRates.clear()
    await db.fxRates.bulkPut([
      { currency: 'USD', phpPerUnit: 58, updatedAt: '2026-01-01T00:00:00.000Z' },
      { currency: 'EUR', phpPerUnit: 63, updatedAt: '2026-01-01T00:00:00.000Z' },
    ])
  })
  afterEach(() => vi.unstubAllGlobals())

  it('stores live rates, marks them live, and leaves a currency the source skipped alone', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ result: 'success', rates: { USD: 0.016, GBP: 0.0121 } })))
    expect(await refreshRates({ force: true })).toBe(true)
    const usd = await db.fxRates.get('USD')
    expect(usd?.phpPerUnit).toBeCloseTo(62.5, 5)
    expect(usd?.live).toBe(true)
    expect((await db.fxRates.get('GBP'))?.live).toBe(true)
    expect((await db.fxRates.get('EUR'))?.phpPerUnit).toBe(63) // not in the response: untouched
  })

  it('keeps the stored rates and reports failure when everything fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await refreshRates({ force: true })).toBe(false)
    expect((await db.fxRates.get('USD'))?.phpPerUnit).toBe(58)
  })

  it('only fetches once per minute unless forced', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(primaryOk))
    vi.stubGlobal('fetch', fetchMock)
    await Promise.all([refreshRates(), refreshRates()]) // StrictMode-style double call shares one request
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await refreshRates() // within a minute: skipped
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await refreshRates({ force: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
