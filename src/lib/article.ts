import { useEffect, useState } from 'react'

export interface ArticleBlock {
  t: 'p' | 'h' | 'li' | 'quote'
  text: string
}

export interface ArticleData {
  title: string
  byline: string
  blocks: ArticleBlock[]
}

/** Netlify Function that fetches one news article and returns its readable text (browsers can't, no CORS). */
const ENDPOINT = '/.netlify/functions/article'

const KINDS = new Set(['p', 'h', 'li', 'quote'])

/** Only well-formed plain-text blocks get through. Nothing from the network is ever rendered as HTML. */
export function parseArticle(raw: unknown): ArticleData | null {
  if (!raw || typeof raw !== 'object') return null
  const { title, byline, blocks } = raw as Record<string, unknown>
  if (!Array.isArray(blocks)) return null
  const clean: ArticleBlock[] = []
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue
    const { t, text } = b as Record<string, unknown>
    if (typeof t === 'string' && KINDS.has(t) && typeof text === 'string' && text.trim()) clean.push({ t: t as ArticleBlock['t'], text })
  }
  if (clean.length === 0) return null
  return { title: typeof title === 'string' ? title : '', byline: typeof byline === 'string' ? byline : '', blocks: clean }
}

export async function fetchArticle(url: string, signal?: AbortSignal): Promise<ArticleData> {
  const res = await fetch(`${ENDPOINT}?url=${encodeURIComponent(url)}`, { signal })
  if (!res.ok) throw new Error(`Article request failed (${res.status})`)
  const article = parseArticle(await res.json())
  if (!article) throw new Error('No article text came back')
  return article
}

const memory = new Map<string, ArticleData>()

export type ArticleStatus = 'loading' | 'ready' | 'unavailable'

/** The full text of one article. Loaded once per session; `unavailable` means the site blocks us or hides the text behind a login. */
export function useArticle(url: string): { status: ArticleStatus; article: ArticleData | null } {
  const [state, setState] = useState<{ status: ArticleStatus; article: ArticleData | null }>(() => {
    const hit = memory.get(url)
    return hit ? { status: 'ready', article: hit } : { status: 'loading', article: null }
  })

  useEffect(() => {
    const hit = memory.get(url)
    if (hit) {
      setState({ status: 'ready', article: hit })
      return
    }
    setState({ status: 'loading', article: null })
    const ctl = new AbortController()
    fetchArticle(url, ctl.signal)
      .then((article) => {
        memory.set(url, article)
        setState({ status: 'ready', article })
      })
      .catch(() => {
        if (!ctl.signal.aborted) setState({ status: 'unavailable', article: null })
      })
    return () => ctl.abort()
  }, [url])

  return state
}
