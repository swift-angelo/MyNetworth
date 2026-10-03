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

/** Rough default FX rates (PHP per 1 unit). Users should update these in Settings. */
export const DEFAULT_FX: Record<string, number> = {
  PHP: 1,
  USD: 58,
  EUR: 63,
  GBP: 74,
  SGD: 43,
  AUD: 38,
  CAD: 42,
  JPY: 0.39,
  HKD: 7.4,
  AED: 15.8,
  SAR: 15.5,
}
