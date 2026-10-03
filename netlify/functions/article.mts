import { extractArticle, isAllowedArticleUrl } from './lib/article.ts'

const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 3
const MAX_HTML_CHARS = 3_000_000
/** Anything shorter than this is almost certainly a login wall, paywall notice or error page, not the article. */
const MIN_ARTICLE_CHARS = 400
const USER_AGENT = 'Mozilla/5.0 (compatible; MyNetworthReader/1.0; personal reader)'

const json = (body: unknown, status: number, cache: Record<string, string>) =>
  Response.json(body, { status, headers: cache })

const NO_STORE = { 'Cache-Control': 'no-store' }
/** An article doesn't change once published: let Netlify's CDN keep it for a day. */
const CACHE_DAY = { 'Cache-Control': 'public, max-age=3600', 'Netlify-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' }

async function fetchHtml(startUrl: string): Promise<string> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    let url = startUrl
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(url, {
        redirect: 'manual',
        signal: ctl.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en' },
      })
      if (res.status >= 300 && res.status < 400) {
        const next = new URL(res.headers.get('location') ?? '', url).toString()
        if (!isAllowedArticleUrl(next)) throw new Error('Redirected somewhere that is not allowed')
        url = next
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!(res.headers.get('content-type') ?? '').includes('html')) throw new Error('Not a web page')
      return (await res.text()).slice(0, MAX_HTML_CHARS)
    }
    throw new Error('Too many redirects')
  } finally {
    clearTimeout(timer)
  }
}

/** GET /.netlify/functions/article?url=<https article link>. Returns the readable text of a news article as plain-text blocks. */
export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url).searchParams.get('url') ?? ''
  if (!isAllowedArticleUrl(url)) return json({ error: 'That source is not supported' }, 400, NO_STORE)

  try {
    const article = extractArticle(await fetchHtml(url))
    if (!article || article.chars < MIN_ARTICLE_CHARS) return json({ error: 'unavailable' }, 422, NO_STORE)
    return json({ url, source: new URL(url).hostname.replace(/^www\./, ''), ...article }, 200, CACHE_DAY)
  } catch {
    return json({ error: 'unavailable' }, 502, NO_STORE)
  }
}
