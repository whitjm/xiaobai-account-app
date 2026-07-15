import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.api for tests
global.window = {
  ...global.window,
  api: {
    ping: vi.fn(() => Promise.resolve('pong')),
    getCategories: vi.fn(() => Promise.resolve({ expense: [], income: [] })),
    addCategory: vi.fn(() => Promise.resolve({ ok: true })),
    updateCategory: vi.fn(() => Promise.resolve({ ok: true })),
    deleteCategory: vi.fn(() => Promise.resolve({ ok: true })),
    getRecords: vi.fn(() => Promise.resolve([])),
    addRecord: vi.fn(() => Promise.resolve({ ok: true })),
    updateRecord: vi.fn(() => Promise.resolve({ ok: true })),
    deleteRecord: vi.fn(() => Promise.resolve({ ok: true })),
    getSummary: vi.fn(() => Promise.resolve({ expense: 0, income: 0, balance: 0 })),
    exportExcel: vi.fn(() => Promise.resolve({ ok: true })),
    backupData: vi.fn(() => Promise.resolve({ ok: true })),
    restoreData: vi.fn(() => Promise.resolve({ ok: true })),
    importExcel: vi.fn(() => Promise.resolve({ ok: true })),
  },
};
