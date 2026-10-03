import { useCallback, useEffect, useRef, useState } from 'react'

export type NewsRegion = 'ph' | 'global'

export interface NewsItem {
  id: string
  title: string
  /** Plain text excerpt from the publisher; may be empty */
  summary: string
  /** https link to the original article */
  url: string
  source: string
  /** ISO timestamp */
  publishedAt: string
}

/** Netlify Function that reads the publishers' RSS feeds (browsers can't, no CORS) and returns clean JSON. */
const ENDPOINT = '/.netlify/functions/news'
/** News older than this is refreshed when Home opens or the app returns to the foreground. */
export const NEWS_STALE_MS = 10 * 60 * 1000

const cacheKey = (region: NewsRegion) => `mn-news-${region}`

/** Keep only well-formed items: every field a string, an https link, a real date. Nothing from the network is trusted. */
export function parseNewsItems(raw: unknown): NewsItem[] {
  if (!Array.isArray(raw)) return []
  const items: NewsItem[] = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const { id, title, summary, url, source, publishedAt } = x as Record<string, unknown>
    if (typeof id !== 'string' || typeof title !== 'string' || typeof url !== 'string' || typeof source !== 'string' || typeof publishedAt !== 'string') continue
    if (!title.trim() || !/^https:\/\//i.test(url) || Number.isNaN(new Date(publishedAt).getTime())) continue
    items.push({ id, title, summary: typeof summary === 'string' ? summary : '', url, source, publishedAt })
  }
  return items
}

export function readNewsCache(region: NewsRegion): { fetchedAt: number; items: NewsItem[] } | null {
  try {
    const raw = localStorage.getItem(cacheKey(region))
    if (!raw) return null
    const data = JSON.parse(raw)
    const items = parseNewsItems(data?.items)
    return typeof data?.fetchedAt === 'number' && items.length > 0 ? { fetchedAt: data.fetchedAt, items } : null
  } catch {
    return null
  }
}

export function writeNewsCache(region: NewsRegion, items: NewsItem[], fetchedAt: number) {
  try {
    localStorage.setItem(cacheKey(region), JSON.stringify({ fetchedAt, items }))
  } catch {
    // storage full or unavailable: news just won't be saved for offline
  }
}

/** `fresh` (manual refresh) skips the browser and CDN copies so the publishers are asked again. */
export async function fetchNews(region: NewsRegion, signal?: AbortSignal, fresh = false): Promise<NewsItem[]> {
  const res = await fetch(`${ENDPOINT}?region=${region}${fresh ? `&t=${Date.now()}` : ''}`, { signal, cache: fresh ? 'no-store' : 'default' })
  if (!res.ok) throw new Error(`News request failed (${res.status})`)
  const items = parseNewsItems((await res.json())?.items)
  if (items.length === 0) throw new Error('No news came back')
  return items
}

export type NewsStatus = 'loading' | 'ready' | 'error'

/**
 * News for one region. Shows the saved copy straight away, refreshes in the background when it is stale
 * (on mount, on switching region, and when the app comes back to the foreground). If a refresh fails the saved copy stays.
 */
export function useNews(region: NewsRegion) {
  const [cache, setCache] = useState(() => readNewsCache(region))
  const [status, setStatus] = useState<NewsStatus>(() => {
    const c = readNewsCache(region)
    return c && Date.now() - c.fetchedAt < NEWS_STALE_MS ? 'ready' : 'loading'
  })
  const abort = useRef<AbortController | null>(null)

  const load = useCallback(async (fresh = false) => {
    abort.current?.abort()
    const ctl = new AbortController()
    abort.current = ctl
    setStatus('loading')
    try {
      const items = await fetchNews(region, ctl.signal, fresh)
      const fetchedAt = Date.now()
      writeNewsCache(region, items, fetchedAt)
      setCache({ fetchedAt, items })
      setStatus('ready')
    } catch {
      if (!ctl.signal.aborted) setStatus('error')
    }
  }, [region])

  useEffect(() => {
    const saved = readNewsCache(region)
    setCache(saved)
    if (saved && Date.now() - saved.fetchedAt < NEWS_STALE_MS) {
      setStatus('ready')
      return
    }
    void load()
    return () => abort.current?.abort()
  }, [region, load])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const saved = readNewsCache(region)
      if (!saved || Date.now() - saved.fetchedAt >= NEWS_STALE_MS) void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [region, load])

  /** Manual refresh: always asks the publishers again. */
  const refresh = useCallback(() => load(true), [load])

  return { items: cache?.items ?? [], status, fetchedAt: cache?.fetchedAt ?? null, refresh }
}
