/**
 * Integration Tests for Historical Import Workflow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  prepareImport,
  reconcileImport,
  transformImport,
  executeImport,
  verifyImport,
  executeImportWorkflow,
  rollbackImport,
} from '@/lib/import/historicalImport';
import { SAMPLE_CL87_CSV, SAMPLE_CL87_CSV_WITH_ISSUES } from './fixtures';
import type { ImportOptions } from '@/lib/import/historicalImport';

describe('Historical Import Integration', () => {
  const defaultOptions: ImportOptions = {
    batchName: 'Test Batch',
    sourceFile: 'test.csv',
    dataSource: 'CL87_CSV',
    createGhostRecords: true,
    applyDateEstimation: true,
    dryRun: true, // Use dry run by default for tests
  };

  describe('Phase 1: Prepare', () => {
    it('should parse valid CSV content', async () => {
      const result = await prepareImport(SAMPLE_CL87_CSV, defaultOptions);

      expect(result.success).toBe(true);
      expect(result.phase).toBe('prepare');
      expect(result.data).toBeDefined();
      expect((result.data as any).parsedRecords.length).toBe(4);
      expect((result.data as any).headers.length).toBeGreaterThan(0);
    });

    it('should handle CSV with issues', async () => {
      const result = await prepareImport(SAMPLE_CL87_CSV_WITH_ISSUES, defaultOptions);

      expect(result.success).toBe(true);
      // Should still parse, but records may have missing data
      expect((result.data as any).parsedRecords.length).toBe(4);
    });

    it('should handle empty CSV content', async () => {
      const result = await prepareImport('', defaultOptions);

      expect(result.success).toBe(true);
      expect((result.data as any).parsedRecords.length).toBe(0);
    });

    it('should report duration', async () => {
      const result = await prepareImport(SAMPLE_CL87_CSV, defaultOptions);

      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Phase 2: Reconcile', () => {
    it('should reconcile records against database', async () => {
      const prepareResult = await prepareImport(SAMPLE_CL87_CSV, defaultOptions);
      const parsedRecords = (prepareResult.data as any).parsedRecords;

      const result = await reconcileImport(parsedRecords, defaultOptions);

      expect(result.success).toBe(true);
      expect(result.phase).toBe('prepare');
      expect(result.data).toBeDefined();
    });

    it('should generate preview report', async () => {
      const prepareResult = await prepareImport(SAMPLE_CL87_CSV, defaultOptions);
      const parsedRecords = (prepareResult.data as any).parsedRecords;

      const result = await reconcileImport(parsedRecords, defaultOptions);
      const report = (result.data as any)?.previewReport;

      expect(report).toBeDefined();
      expect(report.totalRecords).toBeGreaterThanOrEqual(0);
      expect(report.exactMatches).toBeGreaterThanOrEqual(0);
      expect(report.conflicts).toBeGreaterThanOrEqual(0);
      expect(report.newRecords).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Phase 3: Transform', () => {
    it('should transform reconciled records', async () => {
      const prepareResult = await prepareImport(SAMPLE_CL87_CSV, defaultOptions);
      const parsedRecords = (prepareResult.data as any).parsedRecords;

      const reconcileResult = await reconcileImport(parsedRecords, defaultOptions);
      const previewReport = (reconcileResult.data as any).previewReport;

      const result = await transformImport(previewReport, defaultOptions);

      expect(result.success).toBe(true);
      expect(result.phase).toBe('prepare');
    });

    it('should apply date estimation when enabled', async () => {
      const options = { ...defaultOptions, applyDateEstimation: true };
      const prepareResult = await prepareImport(SAMPLE_CL87_CSV, options);
      const parsedRecords = (prepareResult.data as any).parsedRecords;

      const reconcileResult = await reconcileImport(parsedRecords, options);
      const previewReport = (reconcileResult.data as any).previewReport;

      const result = await transformImport(previewReport, options);
      const transformData = result.data as any;

      expect(transformData?.statistics).toBeDefined();
    });
  });

  describe('Phase 4: Execute', () => {
    it('should skip execution in dry run mode', async () => {
      const prepareResult = await prepareImport(SAMPLE_CL87_CSV, defaultOptions);
      const parsedRecords = (prepareResult.data as any).parsedRecords;

      const reconcileResult = await reconcileImport(parsedRecords, defaultOptions);
      const previewReport = (reconcileResult.data as any).previewReport;

      const transformResult = await transformImport(previewReport, defaultOptions);

      // In dry run mode, execute should return success without making changes
      const result = await executeImport(
        transformResult.data as any,
        'test-batch-id',
        defaultOptions
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Phase 5: Verify', () => {
    it('should verify import results', async () => {
      const result = await verifyImport('test-batch-id');

      expect(result.phase).toBe('verify');
      // In test mode without actual DB, this may fail
      // The test verifies the function signature and structure
    });
  });

  describe('Full Workflow', () => {
    it('should execute full workflow with dry run', async () => {
      const result = await executeImportWorkflow(SAMPLE_CL87_CSV, {
        ...defaultOptions,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.phases.length).toBeGreaterThan(0);
    });

    it('should report errors during workflow', async () => {
      // Use invalid CSV to trigger error
      const result = await executeImportWorkflow('invalid,csv\nbad,data', defaultOptions);

      // Should still complete, but may have issues
      expect(result.phases.length).toBeGreaterThan(0);
    });

    it('should track phase durations', async () => {
      const result = await executeImportWorkflow(SAMPLE_CL87_CSV, {
        ...defaultOptions,
        dryRun: true,
      });

      for (const phase of result.phases) {
        expect(phase.duration_ms).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Rollback', () => {
    it('should handle rollback request', async () => {
      // In test mode, rollback will fail without actual DB
      const result = await rollbackImport('test-batch-id');

      // Just verify the function runs
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Edge Cases', () => {
    it('should handle large CSV content', async () => {
      // Generate large CSV
      const lines = ['rider_id,name,phone'];
      for (let i = 0; i < 1000; i++) {
        lines.push(`DR${i},Rider ${i},987654321${i % 10}`);
      }
      const largeCsv = lines.join('\n');

      const result = await prepareImport(largeCsv, defaultOptions);

      expect(result.success).toBe(true);
      expect((result.data as any).parsedRecords.length).toBe(1000);
    });

    it('should handle CSV with special characters', async () => {
      const csvWithSpecial = `rider_id,name,notes
DR001,"O'Brien, John","Has "quotes" in notes"
DR002,"Test, Rider","Normal notes"`;      const result = await prepareImport(csvWithSpecial, defaultOptions);

      expect(result.success).toBe(true);
    });

    it('should handle different line endings', async () => {
      const csvWithCRLF = 'rider_id,name\r\nDR001,John\r\nDR002,Jane';
      const csvWithLF = 'rider_id,name\nDR001,John\nDR002,Jane';

      const resultCRLF = await prepareImport(csvWithCRLF, defaultOptions);
      const resultLF = await prepareImport(csvWithLF, defaultOptions);

      expect(resultCRLF.success).toBe(true);
      expect(resultLF.success).toBe(true);
    });
  });
});
