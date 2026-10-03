import { mergeItems, parseFeed, type NewsItem } from './lib/feed.ts'
import { SOURCES, type Region } from './lib/sources.ts'

const TIMEOUT_MS = 6000
const USER_AGENT = 'MyNetworth/1.0 (personal finance app; reads public RSS headlines)'

async function loadFeed(name: string, url: string): Promise<NewsItem[]> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    })
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
    return parseFeed(await res.text(), name)
  } finally {
    clearTimeout(timer)
  }
}

/** GET /.netlify/functions/news?region=ph|global, headlines and short excerpts as clean JSON (same origin as the app, so no CORS). */
export default async (req: Request): Promise<Response> => {
  const region: Region = new URL(req.url).searchParams.get('region') === 'global' ? 'global' : 'ph'

  const results = await Promise.allSettled(SOURCES[region].map((s) => loadFeed(s.name, s.url)))
  const lists = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  const items = mergeItems(lists)

  if (items.length === 0) {
    return Response.json({ error: 'No news sources are available right now' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
  return Response.json(
    { region, fetchedAt: new Date().toISOString(), items },
    {
      headers: {
        // browsers re-check after 5 minutes; Netlify's CDN serves the same copy for 15 minutes so publishers are not hit on every open
        'Cache-Control': 'public, max-age=300',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
      },
    },
  )
}
