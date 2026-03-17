/**
 * Unit Tests for Reconciliation Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  matchRecords,
  categorizeMatch,
  resolveConflict,
  generatePreviewReport,
  getRecordsToCreate,
  getRecordsToUpdate,
  getRecordsToSkip,
  getReconciliationSummary,
  DATA_SOURCE_PRIORITY,
} from '@/lib/import/reconciliationEngine';
import type { DataSource } from '@/types/historical';

describe('Reconciliation Engine', () => {
  describe('DATA_SOURCE_PRIORITY', () => {
    it('should have EXACT_REVENUE_CSV as highest priority', () => {
      expect(DATA_SOURCE_PRIORITY.EXACT_REVENUE_CSV).toBe(100);
    });

    it('should have DEFAULT_FILL as lowest priority', () => {
      expect(DATA_SOURCE_PRIORITY.DEFAULT_FILL).toBe(10);
    });

    it('should have PLATFORM below CSV sources', () => {
      expect(DATA_SOURCE_PRIORITY.PLATFORM).toBeLessThan(DATA_SOURCE_PRIORITY.CL87_CSV);
    });
  });

  describe('matchRecords', () => {
    it('should match records by ID field', () => {
      const csvRecords = [
        { rider_id: 'DR001', name: 'John' },
        { rider_id: 'DR002', name: 'Jane' },
      ];
      const dbRecords = [
        { rider_id: 'DR001', name: 'John' },
        { rider_id: 'DR003', name: 'Bob' },
      ];

      const matches = matchRecords(csvRecords, dbRecords, 'rider_id');

      expect(matches.size).toBe(3); // DR001, DR002, DR003
      expect(matches.get('DR001')?.csv).toBeTruthy();
      expect(matches.get('DR001')?.db).toBeTruthy();
      expect(matches.get('DR002')?.csv).toBeTruthy();
      expect(matches.get('DR002')?.db).toBeNull();
      expect(matches.get('DR003')?.csv).toBeNull();
      expect(matches.get('DR003')?.db).toBeTruthy();
    });

    it('should handle empty arrays', () => {
      const matches = matchRecords([], [], 'id');
      expect(matches.size).toBe(0);
    });
  });

  describe('categorizeMatch', () => {
    it('should return MISSING_IN_CSV for null CSV record', () => {
      const result = categorizeMatch(null, { rider_id: 'DR001' }, []);
      expect(result).toBe('MISSING_IN_CSV');
    });

    it('should return NEW_RECORD for null DB record', () => {
      const result = categorizeMatch({ rider_id: 'DR001' }, null, []);
      expect(result).toBe('NEW_RECORD');
    });

    it('should return EXACT_MATCH for identical records', () => {
      const csv = { rider_id: 'DR001', name: 'John' };
      const db = { rider_id: 'DR001', name: 'John' };

      const result = categorizeMatch(csv, db, ['rider_id', 'name']);
      expect(result).toBe('EXACT_MATCH');
    });

    it('should return CONFLICT for different records', () => {
      const csv = { rider_id: 'DR001', name: 'John', status: 'active' };
      const db = { rider_id: 'DR001', name: 'Johnny', status: 'inactive' };

      const result = categorizeMatch(csv, db, ['name', 'status']);
      expect(result).toBe('CONFLICT');
    });

    it('should normalize values for comparison', () => {
      const csv = { rider_id: 'DR001', name: 'JOHN DOE' };
      const db = { rider_id: 'DR001', name: 'john doe' };

      const result = categorizeMatch(csv, db, ['name']);
      expect(result).toBe('EXACT_MATCH');
    });

    it('should handle null/undefined values', () => {
      const csv = { rider_id: 'DR001', phone: null };
      const db = { rider_id: 'DR001', phone: undefined };

      const result = categorizeMatch(csv, db, ['phone']);
      expect(result).toBe('EXACT_MATCH');
    });
  });

  describe('resolveConflict', () => {
    it('should prefer CSV when priority is higher or equal', () => {
      const result = resolveConflict(
        'John',
        'Johnny',
        'CL87_CSV', // 90
        'PLATFORM' // 70
      );

      expect(result.resolution).toBe('csv');
      expect(result.value).toBe('John');
    });

    it('should prefer DB when priority is higher', () => {
      const result = resolveConflict(
        'John',
        'Johnny',
        'PLATFORM', // 70
        'EXACT_REVENUE_CSV' // 100
      );

      expect(result.resolution).toBe('db');
      expect(result.value).toBe('Johnny');
    });

    it('should CSV wins on equal priority', () => {
      const result = resolveConflict(
        'John',
        'Johnny',
        'CL87_CSV',
        'CL87_CSV'
      );

      expect(result.resolution).toBe('csv');
    });

    it('should include reason in result', () => {
      const result = resolveConflict(
        'John',
        'Johnny',
        'CL87_CSV',
        'PLATFORM'
      );

      expect(result.reason).toContain('priority');
    });
  });

  describe('generatePreviewReport', () => {
    it('should generate correct statistics', () => {
      const csvRecords = [
        { rider_id: 'DR001', name: 'John', status: 'active' }, // EXACT_MATCH
        { rider_id: 'DR002', name: 'Jane', status: 'active' }, // CONFLICT
        { rider_id: 'DR003', name: 'Bob', status: 'active' }, // NEW_RECORD
      ];
      const dbRecords = [
        { rider_id: 'DR001', name: 'John', status: 'active' },
        { rider_id: 'DR002', name: 'Jane Smith', status: 'inactive' },
        { rider_id: 'DR004', name: 'Alice', status: 'active' }, // MISSING_IN_CSV
      ];

      const report = generatePreviewReport(
        csvRecords,
        dbRecords,
        'rider_id',
        ['name', 'status'],
        'CL87_CSV'
      );

      expect(report.totalRecords).toBe(3);
      expect(report.exactMatches).toBe(1); // DR001
      expect(report.conflicts).toBe(1); // DR002
      expect(report.newRecords).toBe(1); // DR003
      expect(report.missingInCSV).toBe(1); // DR004
    });

    it('should detect low confidence records', () => {
      const csvRecords = [
        { rider_id: 'DR001', name: '', status: 'active' }, // Low confidence
        { rider_id: 'DR002', name: 'Jane', status: 'active' },
      ];
      const dbRecords = [
        { rider_id: 'DR002', name: 'Jane', status: 'active' },
      ];

      const report = generatePreviewReport(
        csvRecords,
        dbRecords,
        'rider_id',
        ['name', 'status'],
        'CL87_CSV'
      );

      expect(report.lowConfidenceRecords).toBeGreaterThan(0);
    });

    it('should detect ghost records needed', () => {
      const csvRecords = [
        { rider_id: 'DR001', name: 'John', vehicle_assigned: 'VH999' }, // References non-existent vehicle
      ];
      const dbRecords = [
        { rider_id: 'DR001', name: 'John' },
      ];

      const report = generatePreviewReport(
        csvRecords,
        dbRecords,
        'rider_id',
        ['name'],
        'CL87_CSV'
      );

      expect(report.ghostRecordsNeeded).toBeGreaterThan(0);
    });
  });

  describe('Helper Functions', () => {
    const sampleReport = generatePreviewReport(
      [
        { rider_id: 'DR001', name: 'John' },
        { rider_id: 'DR002', name: 'Jane' },
        { rider_id: 'DR003', name: 'Bob' },
      ],
      [
        { rider_id: 'DR001', name: 'Johnny' }, // Conflict
        { rider_id: 'DR004', name: 'Alice' }, // Missing in CSV
      ],
      'rider_id',
      ['name'],
      'CL87_CSV'
    );

    describe('getRecordsToCreate', () => {
      it('should return only NEW_RECORD category records', () => {
        const toCreate = getRecordsToCreate(sampleReport);

        expect(toCreate.length).toBe(2); // DR002, DR003
        expect(toCreate.find(r => r.rider_id === 'DR002')).toBeTruthy();
        expect(toCreate.find(r => r.rider_id === 'DR003')).toBeTruthy();
      });
    });

    describe('getRecordsToUpdate', () => {
      it('should return only CONFLICT category records', () => {
        const toUpdate = getRecordsToUpdate(sampleReport);

        expect(toUpdate.length).toBe(1);
        expect(toUpdate[0].record.rider_id).toBe('DR001');
        expect(toUpdate[0].conflicts).toBeTruthy();
      });
    });

    describe('getRecordsToSkip', () => {
      it('should return only EXACT_MATCH category records', () => {
        const toSkip = getRecordsToSkip(sampleReport);
        // In this case, no exact matches
        expect(toSkip.length).toBe(0);
      });
    });

    describe('getReconciliationSummary', () => {
      it('should generate summary string', () => {
        const { summary } = getReconciliationSummary(sampleReport);

        expect(summary).toContain('Import preview');
        expect(summary).toContain('exact matches');
        expect(summary).toContain('conflicts');
        expect(summary).toContain('new records');
      });

      it('should generate warnings when applicable', () => {
        const { warnings, needsAttention } = getReconciliationSummary(sampleReport);

        expect(warnings.length).toBeGreaterThan(0);
        expect(needsAttention).toBe(true);
      });
    });
  });
});
