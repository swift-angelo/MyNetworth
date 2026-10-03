export type Category =
  | 'traditional_bank'
  | 'digital_bank'
  | 'ewallet'
  | 'intl_wallet'
  | 'investment'
  | 'crypto'
  | 'government'
  | 'cash'
  | 'other'

export const CATEGORY_LABELS: Record<Category, string> = {
  traditional_bank: 'Traditional bank',
  digital_bank: 'Digital bank',
  ewallet: 'E-wallet (local)',
  intl_wallet: 'International wallet',
  investment: 'Investment',
  crypto: 'Crypto',
  government: 'Government fund',
  cash: 'Cash',
  other: 'Other',
}

export const CURRENCIES = ['PHP', 'USD', 'EUR', 'GBP', 'SGD', 'AUD', 'CAD', 'JPY', 'HKD', 'AED', 'SAR'] as const
export const BASE_CURRENCY = 'PHP'

export interface Institution {
  id?: number
  name: string
  category: Category
  color: string
  isCustom: boolean
}

export type EntryType = 'deposit' | 'withdrawal'

export interface Entry {
  id?: number
  institutionId: number
  type: EntryType
  /** Minor units (centavos/cents) of `currency`. */
  amountMinor: number
  currency: string
  /** ISO date, yyyy-mm-dd */
  date: string
  note: string
  /** ISO timestamp of when the note was written or last changed. Absent on entries saved before this existed. */
  noteUpdatedAt?: string
}

export interface FxRate {
  currency: string
  phpPerUnit: number
  updatedAt: string
  /** true once the rate came from the live source; the built-in defaults are only rough estimates */
  live?: boolean
}
