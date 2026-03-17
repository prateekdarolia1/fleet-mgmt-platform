/**
 * Unit tests for useRetroactiveEntry hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRetroactiveEntry, getHistoricalTrackingFields } from '@/hooks/useRetroactiveEntry';

describe('useRetroactiveEntry', () => {
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleDateChange', () => {
    it('should detect past dates and show confirmation', () => {
      const { result } = renderHook(() =>
        useRetroactiveEntry({
          entityType: 'ledger',
          onConfirm: mockOnConfirm,
        })
      );

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      act(() => {
        result.current.handleDateChange(pastDate);
      });

      expect(result.current.isHistorical).toBe(true);
      expect(result.current.showConfirmation).toBe(true);
      expect(result.current.selectedDate).toEqual(pastDate);
    });

    it('should not show confirmation for today', () => {
      const { result } = renderHook(() =>
        useRetroactiveEntry({
          entityType: 'ledger',
          onConfirm: mockOnConfirm,
        })
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      act(() => {
        result.current.handleDateChange(today);
      });

      expect(result.current.isHistorical).toBe(false);
      expect(result.current.showConfirmation).toBe(false);
    });

    it('should not show confirmation for future dates', () => {
      const { result } = renderHook(() =>
        useRetroactiveEntry({
          entityType: 'ledger',
          onConfirm: mockOnConfirm,
        })
      );

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      act(() => {
        result.current.handleDateChange(futureDate);
      });

      expect(result.current.isHistorical).toBe(false);
      expect(result.current.showConfirmation).toBe(false);
    });

    it('should clear state when date is undefined', () => {
      const { result } = renderHook(() =>
        useRetroactiveEntry({
          entityType: 'ledger',
          onConfirm: mockOnConfirm,
        })
      );

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      act(() => {
        result.current.handleDateChange(pastDate);
      });

      expect(result.current.isHistorical).toBe(true);

      act(() => {
        result.current.handleDateChange(undefined);
      });

      expect(result.current.isHistorical).toBe(false);
      expect(result.current.selectedDate).toBeNull();
    });
  });

  describe('confirmHistorical', () => {
    it('should hide confirmation and call callback', () => {
      const { result } = renderHook(() =>
        useRetroactiveEntry({
          entityType: 'ledger',
          onConfirm: mockOnConfirm,
        })
      );

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      act(() => {
        result.current.handleDateChange(pastDate);
      });

      expect(result.current.showConfirmation).toBe(true);

      act(() => {
        result.current.confirmHistorical();
      });

      expect(result.current.showConfirmation).toBe(false);
    });
  });

  describe('cancelHistorical', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() =>
        useRetroactiveEntry({
          entityType: 'ledger',
          onConfirm: mockOnConfirm,
        })
      );

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      act(() => {
        result.current.handleDateChange(pastDate);
      });

      expect(result.current.isHistorical).toBe(true);
      expect(result.current.showConfirmation).toBe(true);

      act(() => {
        result.current.cancelHistorical();
      });

      expect(result.current.isHistorical).toBe(false);
      expect(result.current.showConfirmation).toBe(false);
      expect(result.current.selectedDate).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() =>
        useRetroactiveEntry({
          entityType: 'ledger',
          onConfirm: mockOnConfirm,
        })
      );

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      act(() => {
        result.current.handleDateChange(pastDate);
        result.current.confirmHistorical();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isHistorical).toBe(false);
      expect(result.current.showConfirmation).toBe(false);
      expect(result.current.selectedDate).toBeNull();
    });
  });

  describe('getHistoricalTrackingFields', () => {
    it('should return historical fields when isHistorical is true', () => {
      const fields = getHistoricalTrackingFields(true);

      expect(fields).toEqual({
        is_historical: true,
        data_source: 'MANUAL_ENTRY',
        confidence_score: 0.70,
      });
    });

    it('should return non-historical fields when isHistorical is false', () => {
      const fields = getHistoricalTrackingFields(false);

      expect(fields).toEqual({
        is_historical: false,
      });
    });
  });
});
