export type Region = 'ph' | 'global'

export interface Source {
  name: string
  url: string
}

/** Feeds that returned items when tested (Inquirer and Manila Bulletin block automated requests, so they are left out). */
export const SOURCES: Record<Region, Source[]> = {
  ph: [
    { name: 'BusinessWorld', url: 'https://www.bworldonline.com/feed/' },
    { name: 'Philstar', url: 'https://www.philstar.com/rss/business' },
    { name: 'Rappler', url: 'https://www.rappler.com/business/feed/' },
    { name: 'GMA News', url: 'https://data.gmanetwork.com/gno/rss/money/feed.xml' },
  ],
  global: [
    { name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
    { name: 'CNBC', url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/uk/business/rss' },
    { name: 'MarketWatch', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  ],
}
