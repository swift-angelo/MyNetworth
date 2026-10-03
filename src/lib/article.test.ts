import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchArticle, parseArticle } from './article'

const good = { title: 'T', byline: 'By A', blocks: [{ t: 'p', text: 'Hello world.' }, { t: 'h', text: 'Heading' }] }

describe('parseArticle', () => {
  it('keeps well-formed blocks', () => expect(parseArticle(good)).toEqual(good))

  it('drops unknown kinds, empty text and non-string values', () => {
    const a = parseArticle({
      title: 5,
      blocks: [{ t: 'script', text: 'x' }, { t: 'p', text: '   ' }, { t: 'p', text: 7 }, null, 'text', { t: 'quote', text: 'Said.' }],
    })
    expect(a).toEqual({ title: '', byline: '', blocks: [{ t: 'quote', text: 'Said.' }] })
  })

  it('returns null when nothing usable is left', () => {
    expect(parseArticle(null)).toBeNull()
    expect(parseArticle({ blocks: [] })).toBeNull()
    expect(parseArticle({ blocks: 'nope' })).toBeNull()
  })
})

describe('fetchArticle', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks the same-origin function for the article, with the link safely encoded', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => good })
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchArticle('https://www.bbc.com/news/a?x=1&y=2')).toEqual(good)
    expect(fetchMock.mock.calls[0][0]).toBe('/.netlify/functions/article?url=https%3A%2F%2Fwww.bbc.com%2Fnews%2Fa%3Fx%3D1%26y%3D2')
  })

  it('rejects when the site cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422, json: async () => ({ error: 'unavailable' }) }))
    await expect(fetchArticle('https://www.bbc.com/x')).rejects.toThrow()
  })
})
