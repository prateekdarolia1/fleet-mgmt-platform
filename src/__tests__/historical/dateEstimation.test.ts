/**
 * Unit Tests for Date Estimation Rules Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  estimateOnboardDate,
  estimateDeboardDate,
  estimateAssignmentDate,
  estimateDueDate,
  getConfidenceScore,
  getDataQuality,
  isConfidenceAcceptable,
  formatDateForDb,
  parseDate,
  calculateEffectiveDates,
  DATA_SOURCE_CONFIDENCE,
} from '@/lib/import/dateEstimation';
import type { DataSource } from '@/types/historical';

describe('Date Estimation Engine', () => {
  describe('DATA_SOURCE_CONFIDENCE', () => {
    it('should have correct confidence scores for each source', () => {
      expect(DATA_SOURCE_CONFIDENCE.PLATFORM).toBe(1.00);
      expect(DATA_SOURCE_CONFIDENCE.EXACT_REVENUE_CSV).toBe(0.95);
      expect(DATA_SOURCE_CONFIDENCE.CL87_CSV).toBe(0.90);
      expect(DATA_SOURCE_CONFIDENCE.ESTIMATED_DATE).toBe(0.50);
      expect(DATA_SOURCE_CONFIDENCE.DEFAULT_FILL).toBe(0.30);
    });

    it('should have decreasing confidence from platform to default', () => {
      const scores = Object.values(DATA_SOURCE_CONFIDENCE);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });
  });

  describe('estimateOnboardDate', () => {
    it('should return existing onboard date with high confidence', () => {
      const rider = { onboard_date: '2024-01-15', join_date: null };
      const result = estimateOnboardDate(rider, []);

      expect(result.estimatedDate).toEqual(new Date('2024-01-15'));
      expect(result.confidenceScore).toBe(1.00);
      expect(result.estimationMethod).toBe('existing_onboard_date');
      expect(result.dataSource).toBe('PLATFORM');
    });

    it('should use join_date as fallback with moderate confidence', () => {
      const rider = { onboard_date: null, join_date: '2024-01-10' };
      const result = estimateOnboardDate(rider, []);

      expect(result.estimatedDate).toEqual(new Date('2024-01-10'));
      expect(result.confidenceScore).toBe(0.80);
      expect(result.estimationMethod).toBe('join_date_fallback');
    });

    it('should estimate from earliest deployment date', () => {
      const rider = { onboard_date: null, join_date: null };
      const assignments = [
        { deployment_date: '2024-01-20' },
        { deployment_date: '2024-01-15' },
        { deployment_date: '2024-01-18' },
      ];

      const result = estimateOnboardDate(rider, assignments);

      expect(result.estimatedDate).toEqual(new Date('2024-01-15'));
      expect(result.confidenceScore).toBe(0.50);
      expect(result.estimationMethod).toBe('earliest_deployment_date');
    });

    it('should return null when no data available', () => {
      const rider = { onboard_date: null, join_date: null };
      const result = estimateOnboardDate(rider, []);

      expect(result.estimatedDate).toBeNull();
      expect(result.confidenceScore).toBe(0.00);
      expect(result.estimationMethod).toBe('unable_to_estimate');
    });
  });

  describe('estimateDeboardDate', () => {
    it('should return existing deboard date with high confidence', () => {
      const rider = { status: 'deboarded', deboard_date: '2024-02-15' };
      const result = estimateDeboardDate(rider, [], null);

      expect(result.estimatedDate).toEqual(new Date('2024-02-15'));
      expect(result.confidenceScore).toBe(1.00);
    });

    it('should return null for non-deboarded riders', () => {
      const rider = { status: 'active', deboard_date: null };
      const result = estimateDeboardDate(rider, [], null);

      expect(result.estimatedDate).toBeNull();
      expect(result.estimationMethod).toBe('not_deboarded');
    });

    it('should estimate from last payment + 7 days', () => {
      const rider = { status: 'deboarded', deboard_date: null };
      const payments = [
        { payment_date: '2024-01-15' },
        { payment_date: '2024-02-08' },
        { payment_date: '2024-02-01' },
      ];

      const result = estimateDeboardDate(rider, payments, null);

      // Feb 8 + 7 days = Feb 15
      expect(result.estimatedDate).toEqual(new Date('2024-02-15'));
      expect(result.confidenceScore).toBe(0.50);
      expect(result.estimationMethod).toBe('last_payment_plus_7');
    });

    it('should estimate from unassignment date', () => {
      const rider = { status: 'deboarded', deboard_date: null };
      const result = estimateDeboardDate(rider, [], '2024-02-10');

      expect(result.estimatedDate).toEqual(new Date('2024-02-10'));
      expect(result.estimationMethod).toBe('vehicle_unassignment');
    });
  });

  describe('estimateAssignmentDate', () => {
    it('should return null for unassigned vehicles', () => {
      const vehicle = { rider_id: null, rental_start_date: null };
      const result = estimateAssignmentDate(vehicle, null);

      expect(result.estimatedDate).toBeNull();
      expect(result.estimationMethod).toBe('no_rider_assigned');
    });

    it('should use rental_start_date with high confidence', () => {
      const vehicle = { rider_id: 'DR001', rental_start_date: '2024-01-15' };
      const result = estimateAssignmentDate(vehicle, null);

      expect(result.estimatedDate).toEqual(new Date('2024-01-15'));
      expect(result.confidenceScore).toBe(0.90);
    });

    it('should estimate from battery deployment date', () => {
      const vehicle = { rider_id: 'DR001', rental_start_date: null };
      const battery = { deployment_date: '2024-01-20' };

      const result = estimateAssignmentDate(vehicle, battery);

      expect(result.estimatedDate).toEqual(new Date('2024-01-20'));
      expect(result.confidenceScore).toBe(0.70);
    });
  });

  describe('estimateDueDate', () => {
    it('should return existing due date', () => {
      const payment = { due_date: '2024-01-22', week_number: 1 };
      const result = estimateDueDate(payment, null);

      expect(result.estimatedDate).toEqual(new Date('2024-01-22'));
      expect(result.confidenceScore).toBe(1.00);
    });

    it('should calculate from rental start + weeks', () => {
      const payment = { due_date: null, week_number: 3 };
      const ledger = { rental_start_date: '2024-01-01' };

      const result = estimateDueDate(payment, ledger);

      // Jan 1 + (3-1) * 7 = Jan 15
      expect(result.estimatedDate).toEqual(new Date('2024-01-15'));
      expect(result.confidenceScore).toBe(0.60);
    });
  });

  describe('Helper Functions', () => {
    describe('getConfidenceScore', () => {
      it('should return correct scores for known methods', () => {
        expect(getConfidenceScore('existing_onboard_date')).toBe(1.00);
        expect(getConfidenceScore('join_date_fallback')).toBe(0.80);
        expect(getConfidenceScore('earliest_deployment_date')).toBe(0.50);
      });

      it('should return default for unknown methods', () => {
        expect(getConfidenceScore('unknown_method')).toBe(0.30);
      });
    });

    describe('getDataQuality', () => {
      it('should return high for scores >= 0.90', () => {
        expect(getDataQuality(0.95)).toBe('high');
        expect(getDataQuality(0.90)).toBe('high');
      });

      it('should return moderate for scores >= 0.70', () => {
        expect(getDataQuality(0.75)).toBe('moderate');
        expect(getDataQuality(0.70)).toBe('moderate');
      });

      it('should return low for scores < 0.70', () => {
        expect(getDataQuality(0.65)).toBe('low');
        expect(getDataQuality(0.30)).toBe('low');
      });
    });

    describe('isConfidenceAcceptable', () => {
      it('should return true for scores above threshold', () => {
        expect(isConfidenceAcceptable(0.70, 0.50)).toBe(true);
        expect(isConfidenceAcceptable(0.50, 0.50)).toBe(true);
      });

      it('should return false for scores below threshold', () => {
        expect(isConfidenceAcceptable(0.40, 0.50)).toBe(false);
      });
    });

    describe('formatDateForDb', () => {
      it('should format date to ISO string', () => {
        const date = new Date('2024-01-15');
        const result = formatDateForDb(date);

        expect(result).toBe('2024-01-15T00:00:00.000Z');
      });

      it('should return null for null input', () => {
        expect(formatDateForDb(null)).toBeNull();
      });
    });

    describe('parseDate', () => {
      it('should parse valid date strings', () => {
        const result = parseDate('2024-01-15');

        expect(result).toBeInstanceOf(Date);
        expect(result?.getFullYear()).toBe(2024);
      });

      it('should return null for invalid dates', () => {
        expect(parseDate('invalid-date')).toBeNull();
        expect(parseDate(null)).toBeNull();
        expect(parseDate(undefined)).toBeNull();
      });
    });

    describe('calculateEffectiveDates', () => {
      it('should return formatted dates', () => {
        const startDate = new Date('2024-01-15');
        const endDate = new Date('2024-02-15');

        const result = calculateEffectiveDates(startDate, endDate);

        expect(result.effective_start_date).toContain('2024-01-15');
        expect(result.effective_end_date).toContain('2024-02-15');
      });

      it('should return null end date when not provided', () => {
        const startDate = new Date('2024-01-15');

        const result = calculateEffectiveDates(startDate);

        expect(result.effective_start_date).toContain('2024-01-15');
        expect(result.effective_end_date).toBeNull();
      });
    });
  });
});
