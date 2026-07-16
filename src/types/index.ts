// 核心业务类型定义

export type RecordType = 'expense' | 'income'

export interface Record {
  id?: number
  type: RecordType
  amount: number
  major: string
  minor: string
  date: string // YYYY-MM-DD
  note: string
  created_at?: string // ISO 8601
}

export interface Summary {
  expense: number
  income: number
  balance: number
}

export interface CategoryMinor {
  id: number
  name: string
  preset: boolean
}

export interface CategoryGroup {
  major: string
  minors: CategoryMinor[]
}

export interface Categories {
  expense: CategoryGroup[]
  income: CategoryGroup[]
}

export type DateRangeMode = 'week' | 'month' | 'year' | 'all'

export interface DateRange {
  start: string | null // YYYY-MM-DD or null for 'all'
  end: string | null
}

export interface ApiResponse<T = void> {
  ok: boolean
  error?: string
  canceled?: boolean
  data?: T
}

// IPC API 类型定义
export interface IpcApi {
  ping: () => Promise<string>
  getCategories: () => Promise<Categories>
  addCategory: (cat: { type: string; major: string; minor: string }) => Promise<ApiResponse>
  updateCategory: (cat: { id: number; major: string; minor: string }) => Promise<ApiResponse>
  deleteCategory: (id: number) => Promise<ApiResponse>
  getRecords: () => Promise<Record[]>
  addRecord: (record: Omit<Record, 'id' | 'created_at'>) => Promise<ApiResponse>
  updateRecord: (record: Record) => Promise<ApiResponse>
  deleteRecord: (id: number) => Promise<ApiResponse>
  getSummary: () => Promise<Summary>
  exportExcel: () => Promise<ApiResponse<{ count: number; filePath: string }>>
  backupData: () => Promise<ApiResponse<{ count: number; filePath: string }>>
  restoreData: () => Promise<ApiResponse<{ count: number }>>
  importExcel: () => Promise<ApiResponse<{ imported: number; skipped: number }>>
}

declare global {
  interface Window {
    api: IpcApi
  }
}
