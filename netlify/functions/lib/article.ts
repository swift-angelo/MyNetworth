import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

/**
 * Only pages from the news sites we already read headlines from can be fetched. Without this list the function
 * would be an open proxy that anyone could point at any address, including internal ones.
 */
export const ALLOWED_HOSTS = [
  'bworldonline.com',
  'philstar.com',
  'rappler.com',
  'gmanetwork.com',
  'bbc.com',
  'bbc.co.uk',
  'cnbc.com',
  'theguardian.com',
  'marketwatch.com',
]

export function isAllowedArticleUrl(raw: string): boolean {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return false
  }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return false
  const host = u.hostname.toLowerCase()
  return ALLOWED_HOSTS.some((d) => host === d || host.endsWith('.' + d))
}

/** Article body as plain-text blocks. The app renders these as text, never as HTML. */
export interface Block {
  t: 'p' | 'h' | 'li' | 'quote'
  text: string
}

export interface Article {
  title: string
  byline: string
  blocks: Block[]
  /** total characters of text, used to tell a real article from a login or paywall stub */
  chars: number
}

const MAX_BLOCKS = 150
const MAX_CHARS = 40000
const NOISE = /^(advertisement|sponsored|sign up|subscribe|read more|read also|related|share|follow us|listen to|watch:|click here|make this your preferred source|download the|join our)/i

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** Readability turns the page's <h1> into an <h2>, and <title> usually carries a site suffix ("Headline | Site"), so compare loosely. */
function repeatsTitle(heading: string, title: string): boolean {
  const h = norm(heading)
  return title
    .split(/\s[|–—:·-]\s|\|/)
    .map(norm)
    .some((part) => part.length > 8 && (h.includes(part) || part.includes(h)))
}

/** Pull the readable article out of a full web page. Returns null when nothing article-like is found. */
export function extractArticle(html: string): Article | null {
  let parsed: ReturnType<Readability['parse']>
  try {
    const { document } = parseHTML(html)
    parsed = new Readability(document as unknown as Document, { charThreshold: 200 }).parse()
  } catch {
    return null // empty or unparsable page
  }
  if (!parsed?.content) return null

  const title = clean(parsed.title)
  const { document: doc } = parseHTML(`<div id="root">${parsed.content}</div>`)
  const blocks: Block[] = []
  let chars = 0
  let last = ''

  for (const el of Array.from(doc.querySelectorAll('h1, h2, h3, h4, p, li, blockquote'))) {
    const tag = el.tagName.toLowerCase()
    if (tag === 'blockquote' && el.querySelector('p')) continue // its paragraphs are added individually
    if (tag === 'p' && el.closest('li')) continue // the list item already carries this text
    const text = clean(el.textContent)
    if (!text || text === last) continue
    const isHeading = /^h[1-4]$/.test(tag)
    if (isHeading && blocks.length === 0 && repeatsTitle(text, title)) continue // the headline again; the reader shows the title itself
    if (tag === 'h1') continue
    if (!isHeading && (text.length < 15 || NOISE.test(text))) continue
    // bylines, datelines and photo captions: a paragraph that is short and does not end like a sentence
    if (tag === 'p' && text.length < 140 && !/[.!?"”’)]$/.test(text)) continue
    if (tag === 'p' && /^published/i.test(text) && text.length < 80) continue

    const t: Block['t'] = isHeading ? 'h' : tag === 'li' ? 'li' : tag === 'blockquote' || el.closest('blockquote') ? 'quote' : 'p'
    blocks.push({ t, text })
    chars += text.length
    last = text
    if (blocks.length >= MAX_BLOCKS || chars >= MAX_CHARS) break
  }

  return blocks.length === 0 ? null : { title, byline: clean(parsed.byline), blocks, chars }
}
