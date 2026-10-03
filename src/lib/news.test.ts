import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchNews, parseNewsItems, readNewsCache, writeNewsCache, type NewsItem } from './news'

const good: NewsItem = {
  id: 'a1',
  title: 'Peso steadies',
  summary: 'The peso held.',
  url: 'https://example.com/a',
  source: 'Example',
  publishedAt: '2026-10-03T09:02:52.000Z',
}

function fakeStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
}

describe('parseNewsItems', () => {
  it('keeps well-formed items', () => expect(parseNewsItems([good])).toEqual([good]))

  it('drops anything malformed or unsafe', () => {
    const bad = [
      null,
      'text',
      { ...good, url: 'http://example.com/insecure' },
      { ...good, url: 'javascript:alert(1)' },
      { ...good, title: '   ' },
      { ...good, publishedAt: 'yesterday-ish' },
      { ...good, source: 42 },
      { ...good, id: undefined },
    ]
    expect(parseNewsItems([...bad, good])).toEqual([good])
  })

  it('tolerates a missing summary and a non-array', () => {
    expect(parseNewsItems([{ ...good, summary: undefined }])[0].summary).toBe('')
    expect(parseNewsItems({ items: [] })).toEqual([])
  })
})

describe('cache', () => {
  beforeEach(() => vi.stubGlobal('localStorage', fakeStorage()))
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips per region', () => {
    writeNewsCache('ph', [good], 1000)
    expect(readNewsCache('ph')).toEqual({ fetchedAt: 1000, items: [good] })
    expect(readNewsCache('global')).toBeNull()
  })

  it('ignores corrupt or empty saved data', () => {
    localStorage.setItem('mn-news-ph', '{not json')
    expect(readNewsCache('ph')).toBeNull()
    localStorage.setItem('mn-news-ph', JSON.stringify({ fetchedAt: 1, items: [{ title: 'no url' }] }))
    expect(readNewsCache('ph')).toBeNull()
  })

  it('does not throw if storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('full') } })
    expect(() => writeNewsCache('ph', [good], 1)).not.toThrow()
    expect(readNewsCache('ph')).toBeNull()
  })
})

describe('fetchNews', () => {
  afterEach(() => vi.unstubAllGlobals())
  const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

  it('asks the same-origin function for the region and returns validated items', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ items: [good, { ...good, url: 'http://nope' }] }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchNews('global')).toEqual([good])
    expect(fetchMock.mock.calls[0][0]).toBe('/.netlify/functions/news?region=global')
  })

  it('rejects on an error status or when nothing usable comes back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) }))
    await expect(fetchNews('ph')).rejects.toThrow()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ items: [] })))
    await expect(fetchNews('ph')).rejects.toThrow()
  })
})
