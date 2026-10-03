import { ChevronRight, ExternalLink, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useNews, type NewsItem, type NewsRegion } from '../lib/news'
import { timeAgo } from '../lib/time'
import { Sheet, useSheetState } from './Sheet'
import { PillGroup, btnCls } from './ui'

const COLLAPSED = 6

/** Finance headlines (Philippines / Global). Tap one to read the publisher's excerpt in a drawer, with a link to the full article. */
export default function NewsSection() {
  const [region, setRegion] = useState<NewsRegion>('ph')
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<NewsItem | null>(null)
  const reader = useSheetState()
  const { items, status, fetchedAt, refresh } = useNews(region)

  const visible = expanded ? items : items.slice(0, COLLAPSED)

  return (
    <section aria-label="Finance news" className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="pl-1 text-[15px] font-semibold">Finance news</h2>
        <PillGroup
          value={region}
          onChange={(r) => {
            setRegion(r)
            setExpanded(false)
          }}
          options={[
            { value: 'ph', label: 'Philippines' },
            { value: 'global', label: 'Global' },
          ]}
        />
      </div>

      {items.length === 0 && status === 'loading' && (
        <ul className="space-y-2" aria-busy="true" aria-label="Loading news">
          {[0, 1, 2, 3].map((n) => (
            <li key={n} className="glass h-[78px] animate-pulse rounded-[14px]" />
          ))}
        </ul>
      )}

      {items.length === 0 && status === 'error' && (
        <div className="glass flex flex-col items-center gap-3 rounded-[16px] px-5 py-6 text-center">
          <p className="text-sm text-text-950/70">Couldn't load the news right now. Check your connection and try again.</p>
          <button type="button" onClick={refresh} className="flex h-11 items-center gap-2 rounded-[10px] bg-primary-500 px-5 text-sm font-semibold text-on-primary transition active:scale-95">
            <RefreshCw size={16} /> Try again
          </button>
        </div>
      )}

      {items.length > 0 && (
        <>
          <ul className="space-y-2">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="glass flex min-h-[62px] w-full items-center gap-3 rounded-[14px] px-3.5 py-3 text-left transition active:scale-[0.99]"
                  onClick={() => {
                    setSelected(item)
                    reader.open()
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{item.title}</span>
                    <span className="mt-1 block truncate text-xs text-text-950/65">
                      {item.source} · {timeAgo(item.publishedAt)}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-text-950/40" />
                </button>
              </li>
            ))}
          </ul>

          {items.length > COLLAPSED && (
            <button type="button" className="h-11 w-full text-sm font-semibold text-link" onClick={() => setExpanded((e) => !e)}>
              {expanded ? 'Show less' : `See ${items.length - COLLAPSED} more`}
            </button>
          )}

          {status === 'error' && fetchedAt && (
            <p className="px-1 text-xs text-text-950/55">
              Couldn't refresh. Showing saved news from {timeAgo(fetchedAt)}.{' '}
              <button type="button" className="font-semibold text-link" onClick={refresh}>
                Retry
              </button>
            </p>
          )}
        </>
      )}

      {reader.mounted && selected && (
        <Sheet shown={reader.shown} onClose={reader.close} label="News article" title={selected.source}>
          <article className="pb-1">
            <p className="px-1 text-xs text-text-950/65">
              {new Date(selected.publishedAt).toLocaleString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
              {' · '}
              {timeAgo(selected.publishedAt)}
            </p>
            <h3 className="mt-2 px-1 text-xl font-bold leading-tight tracking-tight">{selected.title}</h3>
            {selected.summary ? (
              <p className="mt-3 whitespace-pre-line px-1 text-[15px] leading-relaxed text-text-950/85">{selected.summary}</p>
            ) : (
              <p className="mt-3 px-1 text-[15px] text-text-950/65">The publisher didn't include a preview for this story.</p>
            )}
            <a
              href={selected.url}
              target="_blank"
              rel="noopener noreferrer"
              className={btnCls + ' mt-5 inline-flex items-center justify-center gap-2'}
            >
              Read full article <ExternalLink size={18} />
            </a>
            <p className="mt-3 px-1 text-center text-xs text-text-950/55">Opens {selected.source} in your browser.</p>
          </article>
        </Sheet>
      )}
    </section>
  )
}
