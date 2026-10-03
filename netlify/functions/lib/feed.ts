import { XMLParser } from 'fast-xml-parser'

export interface NewsItem {
  id: string
  title: string
  /** Plain text, never HTML. Empty when the publisher gave no usable summary. */
  summary: string
  /** https only */
  url: string
  source: string
  /** ISO timestamp */
  publishedAt: string
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: true, htmlEntities: true, trimValues: true })

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…',
}

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : ''
    }
    return NAMED[e.toLowerCase()] ?? match
  })
}

/** Anything a feed gives us for a text field (string, CDATA, object with #text, array) as one string. */
function asString(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return asString(v[0])
  if (v && typeof v === 'object') return asString((v as Record<string, unknown>)['#text'])
  return ''
}

/** HTML (or text containing HTML) to plain text. Paragraph breaks are kept as blank lines. */
export function plainText(input: unknown): string {
  let s = asString(input)
  if (!s) return ''
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  s = s.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n\n')
  s = s.replace(/<[^>]*>/g, '')
  s = decodeEntities(s)
  s = s.replace(/<\/?[a-z][^>]*>/gi, '') // markup that was double-encoded in the feed
  s = s.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return s
}

/** Shorten to about `max` characters, ending on a sentence when one is close enough, otherwise on a word. */
export function truncate(text: string, max = 1000): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '), cut.lastIndexOf('.\n'))
  if (sentenceEnd > max * 0.4) return cut.slice(0, sentenceEnd + 1).trim()
  const space = cut.lastIndexOf(' ')
  return cut.slice(0, space > 0 ? space : max).trim() + '…'
}

/** WordPress feeds end every excerpt with "The post <title> appeared first on <site>." */
function stripBoilerplate(text: string): string {
  return text.replace(/\s*The post[\s\S]*?appeared first on[\s\S]*$/i, '').trim()
}

function linkOf(entry: Record<string, any>): string {
  const link = entry.link
  const candidates: unknown[] = Array.isArray(link) ? link : [link]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
    if (c && typeof c === 'object') {
      const { '@_rel': rel, '@_href': href } = c as Record<string, unknown>
      if ((!rel || rel === 'alternate') && typeof href === 'string') return href.trim()
    }
  }
  const guid = asString(entry.guid)
  return /^https?:\/\//i.test(guid) ? guid.trim() : ''
}

function dateOf(entry: Record<string, any>): string {
  const raw = asString(entry.pubDate) || asString(entry.published) || asString(entry.updated) || asString(entry['dc:date'])
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/** One feed (RSS 2.0, RSS 1.0/RDF or Atom) to normalized items. Entries without a title, an https link or a valid date are skipped. */
export function parseFeed(xml: string, source: string): NewsItem[] {
  const doc = parser.parse(xml)
  const raw = doc?.rss?.channel?.item ?? doc?.['rdf:RDF']?.item ?? doc?.feed?.entry ?? []
  const entries: Record<string, any>[] = Array.isArray(raw) ? raw : raw ? [raw] : []
  const items: NewsItem[] = []
  for (const entry of entries) {
    const title = plainText(entry.title).replace(/\s+/g, ' ')
    const url = linkOf(entry)
    const publishedAt = dateOf(entry)
    if (!title || !publishedAt || !/^https:\/\//i.test(url)) continue
    let summary = stripBoilerplate(plainText(entry.description ?? entry.summary))
    if (summary.toLowerCase() === title.toLowerCase()) summary = ''
    items.push({ id: hash(url), title, summary: truncate(summary), url, source, publishedAt })
  }
  return items
}

/** Strip query/fragment and trailing slash so the same story from two feeds counts once. */
function canonical(url: string): string {
  try {
    const u = new URL(url)
    return (u.hostname + u.pathname).replace(/\/+$/, '').toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

/** Newest first, de-duplicated, and no single source allowed to crowd out the others. */
export function mergeItems(lists: NewsItem[][], { perSource = 4, total = 12 }: { perSource?: number; total?: number } = {}): NewsItem[] {
  const byNewest = (a: NewsItem, b: NewsItem) => b.publishedAt.localeCompare(a.publishedAt)
  const seenUrls = new Set<string>()
  const seenTitles = new Set<string>()
  const merged: NewsItem[] = []
  for (const list of lists) {
    let kept = 0
    for (const item of [...list].sort(byNewest)) {
      if (kept >= perSource) break
      const u = canonical(item.url)
      const t = item.title.toLowerCase()
      if (seenUrls.has(u) || seenTitles.has(t)) continue
      seenUrls.add(u)
      seenTitles.add(t)
      merged.push(item)
      kept++
    }
  }
  return merged.sort(byNewest).slice(0, total)
}
