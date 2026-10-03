/** Parse a user-typed amount ("1,234.50") into minor units. Returns null if invalid. */
export function toMinor(input: string | number): number | null {
  const s = typeof input === 'number' ? String(input) : input.replace(/,/g, '').trim()
  if (!/^-?\d+(\.\d{0,2})?$/.test(s)) return null
  return Math.round(parseFloat(s) * 100)
}

/** Live-format what the user types: digits and one dot only, max 2 decimals, commas every 3 integer digits. */
export function formatAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  const intPart = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, '')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (dot === -1) return grouped
  const decimals = cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2)
  return `${grouped || '0'}.${decimals}`
}

export function fromMinor(minor: number): number {
  return minor / 100
}

/** Whole amounts drop the cents (₱290), anything else keeps both decimals (₱290.50). */
export function formatMoney(minor: number, currency = 'PHP'): string {
  const digits = minor % 100 === 0 ? 0 : 2
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(minor / 100)
}

/** Convert minor units of `currency` to PHP minor units using rates (PHP per unit). */
export function toPhpMinor(minor: number, currency: string, rates: Record<string, number>): number {
  const rate = currency === 'PHP' ? 1 : rates[currency]
  if (rate === undefined) return 0
  return Math.round(minor * rate)
}
