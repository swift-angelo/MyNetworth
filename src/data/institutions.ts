import type { Category } from '../db/schema'

type Seed = [name: string, category: Category]

const t = (names: string[], c: Category): Seed[] => names.map((n) => [n, c])

export const SEED_INSTITUTIONS: Seed[] = [
  ...t(
    ['BDO', 'BPI', 'Metrobank', 'Landbank', 'PNB', 'Security Bank', 'UnionBank', 'RCBC', 'China Bank', 'EastWest', 'PSBank', 'DBP', 'Maybank PH'],
    'traditional_bank',
  ),
  ...t(['GoTyme', 'Maya Bank', 'Tonik', 'UNO Digital Bank', 'UnionDigital', 'SeaBank', 'CIMB Bank PH', 'OwnBank', 'Diskartech'], 'digital_bank'),
  ...t(['GCash', 'Maya', 'GrabPay', 'ShopeePay', 'Coins.ph'], 'ewallet'),
  ...t(['Wise', 'PayPal', 'Payoneer', 'Remitly', 'Revolut', 'Skrill', 'Western Union'], 'intl_wallet'),
  ...t(['COL Financial', 'BPI Trade', 'First Metro Sec', 'UITF / Mutual Fund', 'Pag-IBIG MP2'], 'investment'),
  ...t(['SSS', 'Pag-IBIG', 'GSIS'], 'government'),
  ...t(['Binance', 'PDAX'], 'crypto'),
  ...t(['Cash on hand'], 'cash'),
]

// Bright steps of the theme palette (green / cyan / blue). Initials on them are always dark.
const PALETTE = ['#11f20d', '#0dc4f2', '#40f53d', '#3dd0f5', '#70f76e', '#6edcf7', '#3d8af5', '#6ea7f7', '#a0fa9e', '#9ee8fa']

export const colorFor = (index: number) => PALETTE[index % PALETTE.length]

/** Rough FX rates (PHP per 1 unit) used only until the first live update succeeds, e.g. a first launch with no connection. */
export const DEFAULT_FX: Record<string, number> = {
  PHP: 1,
  USD: 62.6,
  EUR: 70.4,
  GBP: 82.7,
  SGD: 48.9,
  AUD: 43.5,
  CAD: 43.9,
  JPY: 0.4,
  HKD: 8,
  AED: 17,
  SAR: 16.7,
}
