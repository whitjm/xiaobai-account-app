import { describe, it, expect } from 'vitest';
import {
  validateAmount,
  validateDate,
  validateCategoryName,
  validateNote,
  validateRecordType,
  sanitizeString,
} from '../validation';

describe('validateAmount', () => {
  it('accepts valid positive amounts', () => {
    expect(validateAmount(100)).toBe(true);
    expect(validateAmount(0.01)).toBe(true);
    expect(validateAmount('99.50')).toBe(true);
    expect(validateAmount(999999999999999)).toBe(true);
  });

  it('rejects invalid amounts', () => {
    expect(validateAmount(0)).toBe(false);
    expect(validateAmount(-100)).toBe(false);
    expect(validateAmount('abc')).toBe(false);
    expect(validateAmount(1e16)).toBe(false); // 超过上限
  });
});

describe('validateDate', () => {
  it('accepts valid YYYY-MM-DD dates', () => {
    expect(validateDate('2026-07-15')).toBe(true);
    expect(validateDate('2026-01-01')).toBe(true);
    expect(validateDate('2026-12-31')).toBe(true);
  });

  it('rejects invalid dates', () => {
    expect(validateDate('2026-13-01')).toBe(false); // 月份无效
    expect(validateDate('07-15-2026')).toBe(false); // 格式错误
    expect(validateDate('not-a-date')).toBe(false);
    expect(validateDate('')).toBe(false);
    expect(validateDate(null as unknown as string)).toBe(false);
  });
});

describe('validateCategoryName', () => {
  it('accepts valid category names', () => {
    expect(validateCategoryName('餐饮')).toBe(true);
    expect(validateCategoryName('早餐')).toBe(true);
    expect(validateCategoryName('a')).toBe(true);
  });

  it('rejects invalid category names', () => {
    expect(validateCategoryName('')).toBe(false);
    expect(validateCategoryName('   ')).toBe(false);
    expect(validateCategoryName('a'.repeat(51))).toBe(false); // 超过50字符
  });
});

describe('validateNote', () => {
  it('accepts valid notes', () => {
    expect(validateNote('')).toBe(true);
    expect(validateNote('和朋友聚餐')).toBe(true);
    expect(validateNote(undefined)).toBe(true);
    expect(validateNote('a'.repeat(500))).toBe(true);
  });

  it('rejects overly long notes', () => {
    expect(validateNote('a'.repeat(501))).toBe(false);
  });
});

describe('validateRecordType', () => {
  it('accepts valid record types', () => {
    expect(validateRecordType('expense')).toBe(true);
    expect(validateRecordType('income')).toBe(true);
  });

  it('rejects invalid record types', () => {
    expect(validateRecordType('invalid')).toBe(false);
    expect(validateRecordType('')).toBe(false);
    expect(validateRecordType('EXPENSE')).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('removes dangerous characters', () => {
    expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    expect(sanitizeString('"hello"')).toBe('hello');
    expect(sanitizeString("'world'")).toBe('world');
    expect(sanitizeString('a&b')).toBe('ab');
  });

  it('returns empty string for null/undefined', () => {
    expect(sanitizeString('')).toBe('');
    expect(sanitizeString(null as unknown as string)).toBe('');
    expect(sanitizeString(undefined as unknown as string)).toBe('');
  });

  it('trims whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });
});
