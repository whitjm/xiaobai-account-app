// 全局 window.api 类型声明

interface Categories {
  expense: { major: string; minors: { id: number; name: string; preset: boolean }[] }[];
  income: { major: string; minors: { id: number; name: string; preset: boolean }[] }[];
}

interface RecordEntry {
  id?: number;
  type: 'expense' | 'income';
  amount: number;
  major: string;
  minor: string;
  date: string;
  note?: string;
  created_at?: string;
}

interface Window {
  api: {
    ping: () => string;
    // 分类
    getCategories: () => Promise<Categories>;
    addCategory: (cat: { type: string; major: string; minor: string }) => Promise<{ ok: boolean; error?: string }>;
    updateCategory: (cat: { id: number; major: string; minor: string }) => Promise<{ ok: boolean; error?: string }>;
    deleteCategory: (id: number) => Promise<{ ok: boolean; error?: string }>;
    // 账目增删改查
    getRecords: () => Promise<RecordEntry[]>;
    addRecord: (record: { type: string; amount: number; major: string; minor: string; date: string; note?: string }) => Promise<{ ok: boolean; error?: string }>;
    updateRecord: (record: RecordEntry) => Promise<{ ok: boolean; error?: string }>;
    deleteRecord: (id: number) => Promise<{ ok: boolean; error?: string }>;
    getSummary: () => Promise<{ expense: number; income: number; balance: number }>;
    // 数据导入导出
    exportExcel: () => Promise<string>;
    backupData: () => Promise<string>;
    restoreData: () => Promise<string>;
    importExcel: () => Promise<string>;
  };
}
