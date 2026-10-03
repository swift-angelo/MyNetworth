import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import { Fragment } from 'react'
import { useArticle, type ArticleBlock } from '../lib/article'
import type { NewsItem } from '../lib/news'
import { timeAgo } from '../lib/time'
import { Overlay, useModalLock } from './Sheet'

/** Consecutive list items become one list; everything else is its own element. All text, never HTML. */
function Blocks({ blocks }: { blocks: ArticleBlock[] }) {
  const out: React.ReactNode[] = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.t === 'li') {
      const items: string[] = []
      while (i < blocks.length && blocks[i].t === 'li') items.push(blocks[i++].text)
      i--
      out.push(
        <ul key={i} className="mt-4 list-disc space-y-2 pl-6 text-[17px] leading-[1.65] marker:text-text-950/40">
          {items.map((t, n) => (
            <li key={n}>{t}</li>
          ))}
        </ul>,
      )
    } else if (b.t === 'h') {
      out.push(
        <h3 key={i} className="mt-7 text-xl font-bold leading-snug tracking-tight">
          {b.text}
        </h3>,
      )
    } else if (b.t === 'quote') {
      out.push(
        <blockquote key={i} className="mt-4 pl-4 text-[17px] italic leading-[1.7] text-text-950/80">
          {b.text}
        </blockquote>,
      )
    } else {
      out.push(
        <p key={i} className="mt-4 text-[17px] leading-[1.7]">
          {b.text}
        </p>,
      )
    }
  }
  return <Fragment>{out}</Fragment>
}

/**
 * Full-screen reader for one news story. Shows the whole article in the app when the publisher allows it,
 * otherwise the excerpt, and always offers a link icon that opens the original at the source.
 */
export default function ArticleReader({ item, shown, onClose }: { item: NewsItem; shown: boolean; onClose: () => void }) {
  useModalLock(onClose)
  const { status, article } = useArticle(item.url)

  return (
    <Overlay>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Article from ${item.source}`}
        className={
          'reader-bg fixed inset-0 z-30 flex flex-col transition-transform duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)] ' +
          (shown ? 'translate-x-0' : 'translate-x-full')
        }
      >
        <header className="glass-bar z-10 flex shrink-0 items-center gap-1 border-b border-text-950/10 px-2 pb-1 pt-[max(env(safe-area-inset-top),8px)]">
          <button
            type="button"
            aria-label="Back"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90 active:bg-text-950/10"
            onClick={onClose}
          >
            <ArrowLeft size={22} />
          </button>
          <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold">{item.source}</span>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open at ${item.source}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90 active:bg-text-950/10"
          >
            <ExternalLink size={20} />
          </a>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <article className="mx-auto max-w-2xl px-5 pb-[max(env(safe-area-inset-bottom),40px)] pt-5">
            <p className="text-xs text-text-950/65">
              {item.source} · {new Date(item.publishedAt).toLocaleString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} ·{' '}
              {timeAgo(item.publishedAt)}
            </p>
            <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight">{item.title}</h1>
            {article?.byline && <p className="mt-2 text-sm text-text-950/65">{article.byline}</p>}

            {status === 'ready' && article && <Blocks blocks={article.blocks} />}

            {status === 'loading' && (
              <>
                {item.summary && <p className="mt-5 whitespace-pre-line text-[17px] leading-[1.7] text-text-950/80">{item.summary}</p>}
                <div className="mt-6 flex items-center gap-2 text-sm text-text-950/65" role="status">
                  <Loader2 size={16} className="animate-spin" /> Loading the full article…
                </div>
                <div className="mt-4 space-y-3" aria-hidden>
                  {[100, 96, 100, 88, 60].map((w, n) => (
                    <div key={n} className="h-4 animate-pulse rounded bg-text-950/10" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </>
            )}

            {status === 'unavailable' && (
              <>
                {item.summary ? (
                  <p className="mt-5 whitespace-pre-line text-[17px] leading-[1.7]">{item.summary}</p>
                ) : (
                  <p className="mt-5 text-[17px] text-text-950/70">No preview is available for this story.</p>
                )}
                <div className="glass mt-6 rounded-[14px] p-4 text-sm leading-snug text-text-950/80">
                  The full article can't be shown here. {item.source} may block readers like this or keep the text behind a subscription. Use the link icon at the top to read it at the
                  source.
                </div>
              </>
            )}

            <p className="mt-8 text-xs text-text-950/50">Source: {item.source}. The article belongs to its publisher.</p>
          </article>
        </div>

      </div>
    </Overlay>
  )
}
