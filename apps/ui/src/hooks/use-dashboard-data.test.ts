import { describe, expect, it } from 'vitest';
import { buildDateRange, isDateRangeValid } from './use-dashboard-data.ts';

describe('use-dashboard-data helpers', () => {
  describe('buildDateRange', () => {
    it('builds deterministic date range for preset days', () => {
      const range = buildDateRange(7, new Date('2026-02-12T18:45:00.000Z'));

      expect(range.dateFrom).toBe('2026-02-06');
      expect(range.dateTo).toBe('2026-02-12');
    });

    it('builds range for 30 days', () => {
      const range = buildDateRange(30, new Date('2026-02-15T00:00:00.000Z'));

      expect(range.dateFrom).toBe('2026-01-17');
      expect(range.dateTo).toBe('2026-02-15');
    });

    it('builds range for 90 days', () => {
      const range = buildDateRange(90, new Date('2026-03-31T23:59:59.999Z'));

      expect(range.dateFrom).toBe('2026-01-01');
      expect(range.dateTo).toBe('2026-03-31');
    });

    it('handles single day range', () => {
      const range = buildDateRange(1, new Date('2026-02-10T12:00:00.000Z'));

      expect(range.dateFrom).toBe('2026-02-10');
      expect(range.dateTo).toBe('2026-02-10');
    });

    it('normalizes time to midnight UTC', () => {
      const range = buildDateRange(3, new Date('2026-02-12T23:59:59.999Z'));

      expect(range.dateFrom).toBe('2026-02-10');
      expect(range.dateTo).toBe('2026-02-12');
    });

    it('handles month boundary correctly', () => {
      const range = buildDateRange(5, new Date('2026-03-02T00:00:00.000Z'));

      expect(range.dateFrom).toBe('2026-02-26');
      expect(range.dateTo).toBe('2026-03-02');
    });

    it('handles year boundary correctly', () => {
      const range = buildDateRange(7, new Date('2026-01-03T00:00:00.000Z'));

      expect(range.dateFrom).toBe('2025-12-28');
      expect(range.dateTo).toBe('2026-01-03');
    });
  });

  describe('isDateRangeValid', () => {
    it('validates date range ordering', () => {
      expect(isDateRangeValid({ dateFrom: '2026-02-01', dateTo: '2026-02-28' })).toBe(true);
      expect(isDateRangeValid({ dateFrom: '2026-03-01', dateTo: '2026-02-28' })).toBe(false);
    });

    it('accepts equal dates', () => {
      expect(isDateRangeValid({ dateFrom: '2026-02-15', dateTo: '2026-02-15' })).toBe(true);
    });

    it('rejects empty dateFrom', () => {
      expect(isDateRangeValid({ dateFrom: '', dateTo: '2026-02-28' })).toBe(false);
    });

    it('rejects empty dateTo', () => {
      expect(isDateRangeValid({ dateFrom: '2026-02-01', dateTo: '' })).toBe(false);
    });

    it('rejects both empty', () => {
      expect(isDateRangeValid({ dateFrom: '', dateTo: '' })).toBe(false);
    });

    it('validates lexicographic date comparison', () => {
      expect(isDateRangeValid({ dateFrom: '2026-02-01', dateTo: '2026-12-31' })).toBe(true);
      expect(isDateRangeValid({ dateFrom: '2026-12-31', dateTo: '2026-02-01' })).toBe(false);
    });

    it('handles ISO 8601 date format', () => {
      expect(isDateRangeValid({ dateFrom: '2026-01-01', dateTo: '2026-12-31' })).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles leap year dates', () => {
      const range = buildDateRange(2, new Date('2024-02-29T00:00:00.000Z'));

      expect(range.dateFrom).toBe('2024-02-28');
      expect(range.dateTo).toBe('2024-02-29');
      expect(isDateRangeValid(range)).toBe(true);
    });

    it('handles very large day ranges', () => {
      const range = buildDateRange(365, new Date('2026-12-31T00:00:00.000Z'));

      expect(range.dateFrom).toBe('2026-01-01');
      expect(range.dateTo).toBe('2026-12-31');
      expect(isDateRangeValid(range)).toBe(true);
    });

    it('validates dates spanning multiple years', () => {
      expect(isDateRangeValid({ dateFrom: '2025-01-01', dateTo: '2027-12-31' })).toBe(true);
    });
  });
});