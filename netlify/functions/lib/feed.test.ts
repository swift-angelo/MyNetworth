import { describe, expect, it } from 'vitest'
import { decodeEntities, mergeItems, parseFeed, plainText, truncate, type NewsItem } from './feed.ts'

const rss = (items: string) => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Test</title>${items}</channel></rss>`

describe('plainText', () => {
  it('strips markup and decodes entities', () => {
    expect(plainText('<p>Stocks &amp; bonds rose&nbsp;1%.</p><p>Peso &#8369;62 &mdash; steady.</p>')).toBe('Stocks & bonds rose 1%.\n\nPeso ₱62 — steady.')
  })
  it('removes scripts and styles entirely', () => {
    expect(plainText('Hello<script>alert(1)</script> world<style>p{color:red}</style>')).toBe('Hello world')
  })
  it('handles double-encoded markup and non-strings', () => {
    expect(plainText('&lt;b&gt;Bold&lt;/b&gt; text')).toBe('Bold text')
    expect(plainText(undefined)).toBe('')
    expect(plainText({ '#text': '<i>x</i>' })).toBe('x')
  })
  it('never leaves a tag behind', () => {
    expect(plainText('<img src=x onerror=alert(1)><a href="javascript:alert(1)">link</a>')).toBe('link')
  })
})

describe('decodeEntities', () => {
  it('decodes named, decimal and hex entities and ignores unknown or invalid ones', () => {
    expect(decodeEntities('&lt;&gt;&amp;&quot;&#39;&#x20B1;')).toBe('<>&"\'₱')
    expect(decodeEntities('&bogus; &#0; &#99999999;')).toBe('&bogus;  ')
  })
})

describe('truncate', () => {
  it('leaves short text alone', () => expect(truncate('Short.', 100)).toBe('Short.'))
  it('ends on a sentence when one is near the limit', () => {
    const text = 'First sentence is here. Second sentence is also here. Third sentence runs past the limit for sure.'
    expect(truncate(text, 60)).toBe('First sentence is here. Second sentence is also here.')
  })
  it('falls back to a word boundary with an ellipsis', () => {
    expect(truncate('one two three four five six seven', 15)).toBe('one two three…')
  })
})

describe('parseFeed', () => {
  it('parses RSS with CDATA, offsets and boilerplate', () => {
    const xml = rss(`
      <item>
        <title><![CDATA[Peso &amp; yields: what to watch]]></title>
        <link>https://example.com/a?utm=1</link>
        <pubDate>Sat, 03 Oct 2026 17:02:52 +0800</pubDate>
        <description><![CDATA[<p>The peso held steady.</p> The post Peso &amp; yields appeared first on Example Online.]]></description>
      </item>
      <item>
        <title>Second</title>
        <link>https://example.com/b</link>
        <pubDate>Fri, 02 Oct 2026 16:05:29 GMT</pubDate>
        <description>Second</description>
      </item>`)
    const items = parseFeed(xml, 'Example')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      title: 'Peso & yields: what to watch',
      summary: 'The peso held steady.',
      url: 'https://example.com/a?utm=1',
      source: 'Example',
      publishedAt: '2026-10-03T09:02:52.000Z', // +0800 converted to UTC
    })
    expect(items[1].summary).toBe('') // a summary that only repeats the title is dropped
    expect(items[1].publishedAt).toBe('2026-10-02T16:05:29.000Z')
  })

  it('parses Atom feeds', () => {
    const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom story</title><link rel="self" href="https://x.test/self"/><link rel="alternate" href="https://x.test/story"/><updated>2026-10-01T10:00:00Z</updated><summary>Short &lt;b&gt;summary&lt;/b&gt;</summary></entry></feed>`
    expect(parseFeed(xml, 'Atom')).toEqual([
      expect.objectContaining({ title: 'Atom story', url: 'https://x.test/story', summary: 'Short summary', publishedAt: '2026-10-01T10:00:00.000Z' }),
    ])
  })

  it('skips entries without an https link, a title or a valid date', () => {
    const xml = rss(`
      <item><title>Insecure</title><link>http://example.com/x</link><pubDate>Fri, 02 Oct 2026 16:05:29 GMT</pubDate></item>
      <item><title>Script link</title><link>javascript:alert(1)</link><pubDate>Fri, 02 Oct 2026 16:05:29 GMT</pubDate></item>
      <item><title></title><link>https://example.com/y</link><pubDate>Fri, 02 Oct 2026 16:05:29 GMT</pubDate></item>
      <item><title>No date</title><link>https://example.com/z</link></item>
      <item><title>Bad date</title><link>https://example.com/w</link><pubDate>not a date</pubDate></item>
      <item><title>Good</title><link>https://example.com/ok</link><pubDate>Fri, 02 Oct 2026 16:05:29 GMT</pubDate></item>`)
    expect(parseFeed(xml, 'S').map((i) => i.title)).toEqual(['Good'])
  })

  it('copes with a single item, no items and garbage', () => {
    expect(parseFeed(rss('<item><title>One</title><link>https://a.test/1</link><pubDate>Fri, 02 Oct 2026 16:05:29 GMT</pubDate></item>'), 'S')).toHaveLength(1)
    expect(parseFeed(rss(''), 'S')).toEqual([])
    expect(parseFeed('not xml at all', 'S')).toEqual([])
  })
})

const item = (over: Partial<NewsItem>): NewsItem => ({
  id: over.url ?? 'x',
  title: 'T',
  summary: '',
  url: 'https://a.test/1',
  source: 'A',
  publishedAt: '2026-10-01T00:00:00.000Z',
  ...over,
})

describe('mergeItems', () => {
  it('sorts newest first and de-duplicates by URL (ignoring query and slash) and by title', () => {
    const merged = mergeItems([
      [item({ title: 'Same story', url: 'https://a.test/s?utm=1', publishedAt: '2026-10-03T00:00:00.000Z' })],
      [
        item({ title: 'Same story, other site', url: 'https://a.test/s/', source: 'B', publishedAt: '2026-10-03T01:00:00.000Z' }),
        item({ title: 'SAME STORY', url: 'https://b.test/other', source: 'B', publishedAt: '2026-10-03T02:00:00.000Z' }),
        item({ title: 'Different', url: 'https://b.test/d', source: 'B', publishedAt: '2026-10-02T00:00:00.000Z' }),
      ],
    ])
    expect(merged.map((i) => i.title)).toEqual(['Same story', 'Different'])
  })

  it('caps each source so one feed cannot crowd out the rest, and caps the total', () => {
    const many = (source: string, n: number) =>
      Array.from({ length: n }, (_, i) => item({ title: `${source}${i}`, url: `https://${source}.test/${i}`, source, publishedAt: `2026-10-0${1 + (i % 3)}T00:00:00.000Z` }))
    const merged = mergeItems([many('a', 10), many('b', 10), many('c', 10), many('d', 10)], { perSource: 4, total: 12 })
    expect(merged).toHaveLength(12)
    for (const s of ['a', 'b', 'c', 'd']) expect(merged.filter((i) => i.source === s).length).toBeLessThanOrEqual(4)
  })
})
