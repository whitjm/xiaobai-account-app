import { describe, it, expect } from 'vitest';
import { computeRange, shiftAnchor, inRange, rangeLabel, fmt } from '../../../src/utils/dateRange';

describe('dateRange utils', () => {
  describe('fmt', () => {
    it('formats date as YYYY-MM-DD', () => {
      const d = new Date(2026, 6, 15); // July 15, 2026
      expect(fmt(d)).toBe('2026-07-15');
    });

    it('pads single digit month and day', () => {
      const d = new Date(2026, 0, 5); // January 5, 2026
      expect(fmt(d)).toBe('2026-01-05');
    });
  });

  describe('computeRange', () => {
    it('returns correct week range', () => {
      const anchor = new Date(2026, 6, 15); // July 15, 2026 (Wednesday)
      const range = computeRange('week', anchor);
      expect(range.start).toBe('2026-07-13'); // Monday
      expect(range.end).toBe('2026-07-19'); // Sunday
    });

    it('returns correct month range', () => {
      const anchor = new Date(2026, 6, 15); // July 15, 2026
      const range = computeRange('month', anchor);
      expect(range.start).toBe('2026-07-01');
      expect(range.end).toBe('2026-07-31');
    });

    it('returns correct year range', () => {
      const anchor = new Date(2026, 6, 15); // July 15, 2026
      const range = computeRange('year', anchor);
      expect(range.start).toBe('2026-01-01');
      expect(range.end).toBe('2026-12-31');
    });

    it('returns null for all mode', () => {
      const range = computeRange('all', new Date());
      expect(range).toBeNull();
    });

    it('uses current date when no anchor provided', () => {
      const range = computeRange('month');
      expect(range).not.toBeNull();
      expect(range.start).toMatch(/^\d{4}-\d{2}-01$/);
    });
  });

  describe('shiftAnchor', () => {
    it('shifts week forward by 1', () => {
      const anchor = new Date(2026, 6, 15);
      const shifted = shiftAnchor('week', anchor, 1);
      expect(shifted.getDate()).toBe(22);
    });

    it('shifts week backward by 1', () => {
      const anchor = new Date(2026, 6, 15);
      const shifted = shiftAnchor('week', anchor, -1);
      expect(shifted.getDate()).toBe(8);
    });

    it('shifts month forward by 1', () => {
      const anchor = new Date(2026, 6, 15);
      const shifted = shiftAnchor('month', anchor, 1);
      expect(shifted.getMonth()).toBe(7); // August
    });

    it('shifts year forward by 1', () => {
      const anchor = new Date(2026, 6, 15);
      const shifted = shiftAnchor('year', anchor, 1);
      expect(shifted.getFullYear()).toBe(2027);
    });
  });

  describe('inRange', () => {
    it('returns true when date is within range', () => {
      const range = { start: '2026-07-01', end: '2026-07-31' };
      expect(inRange('2026-07-15', range)).toBe(true);
    });

    it('returns false when date is outside range', () => {
      const range = { start: '2026-07-01', end: '2026-07-31' };
      expect(inRange('2026-08-15', range)).toBe(false);
    });

    it('returns true for null range (all mode)', () => {
      expect(inRange('2026-12-25', null)).toBe(true);
    });

    it('handles boundary dates', () => {
      const range = { start: '2026-07-01', end: '2026-07-31' };
      expect(inRange('2026-07-01', range)).toBe(true);
      expect(inRange('2026-07-31', range)).toBe(true);
    });
  });

  describe('rangeLabel', () => {
    it('returns "全部时间" for all mode', () => {
      expect(rangeLabel('all', new Date())).toBe('全部时间');
    });

    it('returns year label for year mode', () => {
      const d = new Date(2026, 6, 15);
      expect(rangeLabel('year', d)).toBe('2026年');
    });

    it('returns month label for month mode', () => {
      const d = new Date(2026, 6, 15);
      expect(rangeLabel('month', d)).toBe('2026年7月');
    });

    it('returns week label for week mode', () => {
      const d = new Date(2026, 6, 15);
      expect(rangeLabel('week', d)).toBe('07-13 ~ 07-19');
    });
  });
});
