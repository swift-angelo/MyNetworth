import { describe, expect, it } from 'vitest'
import { extractArticle, isAllowedArticleUrl } from './article.ts'

describe('isAllowedArticleUrl', () => {
  it('allows https pages on our news sites, including subdomains', () => {
    for (const u of [
      'https://www.bbc.com/news/articles/abc',
      'https://www.theguardian.com/money/2026/oct/03/x',
      'https://bworldonline.com/a/',
      'https://business.philstar.com/story',
      'https://www.gmanetwork.com/news/money/x',
    ])
      expect(isAllowedArticleUrl(u), u).toBe(true)
  })

  it('rejects everything else', () => {
    for (const u of [
      'http://www.bbc.com/news/x', // not https
      'https://evil.example.com/',
      'https://notbbc.com/x', // looks similar, different domain
      'https://bbc.com.evil.com/x',
      'https://bbc.com@evil.com/x', // credentials trick
      'https://user:pw@www.bbc.com/x',
      'https://www.bbc.com:8443/x',
      'https://127.0.0.1/admin',
      'https://localhost/',
      'https://169.254.169.254/latest/meta-data',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'not a url',
      '',
    ])
      expect(isAllowedArticleUrl(u), u).toBe(false)
  })
})

const para = (n: number) => `Paragraph ${n}: the central bank said on Friday that inflation eased for a third month, giving households some relief on food and transport costs. `.repeat(2)

const page = `<!doctype html><html><head><title>Inflation eases | Example News</title><script>window.track=1</script><style>body{}</style></head>
<body>
  <nav><a href="/">Home</a> <a href="/markets">Markets</a> <a href="/about">About</a></nav>
  <div class="ad">Advertisement</div>
  <article>
    <h1>Inflation eases for a third month</h1>
    <p class="byline">By Juan Dela Cruz</p>
    <p>${para(1)}</p>
    <h2>What it means</h2>
    <p>${para(2)}</p>
    <blockquote><p>"Prices are moving in the right direction," the governor said at a briefing in Manila.</p></blockquote>
    <ul><li>Food prices rose 2.1 percent from a year earlier.</li><li>Transport costs were flat for the month.</li></ul>
    <p>${para(3)}</p>
    <p>Read more</p>
  </article>
  <footer>Copyright Example News. All rights reserved. Terms Privacy Contact</footer>
</body></html>`

describe('extractArticle', () => {
  const article = extractArticle(page)

  it('finds the article and drops navigation, ads, scripts and the footer', () => {
    expect(article).not.toBeNull()
    const text = article!.blocks.map((b) => b.text).join(' ')
    expect(text).toContain('central bank said on Friday')
    expect(text).not.toMatch(/Markets|Advertisement|window\.track|All rights reserved|Terms Privacy/)
    expect(article!.chars).toBeGreaterThan(400)
  })

  it('keeps structure as plain-text blocks', () => {
    const kinds = new Set(article!.blocks.map((b) => b.t))
    expect(kinds.has('p')).toBe(true)
    expect(kinds.has('h')).toBe(true)
    expect(kinds.has('quote')).toBe(true)
    expect(kinds.has('li')).toBe(true)
    expect(article!.blocks.find((b) => b.t === 'h')?.text).toBe('What it means')
  })

  it('does not repeat the headline as a block, and drops "Read more" style filler', () => {
    const texts = article!.blocks.map((b) => b.text)
    expect(texts).not.toContain('Inflation eases for a third month')
    expect(texts).not.toContain('Read more')
  })

  it('never returns markup', () => {
    const evil = `<html><body><article><p>${'Safe text sentence number one. '.repeat(30)}<img src=x onerror=alert(1)><script>alert(1)</script></p></article></body></html>`
    const a = extractArticle(evil)
    expect(JSON.stringify(a)).not.toMatch(/<|onerror|alert\(1\)/)
  })

  it('returns null for pages with nothing article-like', () => {
    expect(extractArticle('<html><body></body></html>')).toBeNull()
    expect(extractArticle('not html')).toBeNull()
  })
})
