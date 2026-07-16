// Electron 端类型定义

export interface Record {
  id?: number
  type: 'expense' | 'income'
  amount: number
  major: string
  minor: string
  date: string
  note: string
  created_at?: string
}

export interface Category {
  id: number
  type: 'expense' | 'income'
  major: string
  minor: string
  sort: number
  is_preset: number
}

export interface Summary {
  expense: number
  income: number
  balance: number
}

export interface QueryResult {
  columns: string[]
  values: unknown[][]
}

export interface ApiResponse<T = void> {
  ok: boolean
  error?: string
  canceled?: boolean
  data?: T
}

export interface CategoryInput {
  type: 'expense' | 'income'
  major: string
  minor: string
}

export interface CategoryUpdate {
  id: number
  major: string
  minor: string
}
