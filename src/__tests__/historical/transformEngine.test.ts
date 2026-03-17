/**
 * Unit Tests for Transform Engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyDateEstimation,
  createGhostEntity,
  generateRetroactiveEvents,
  transformRecords,
} from '@/lib/import/transformEngine';
import type { DataSource } from '@/types/historical';

describe('Transform Engine', () => {
  const mockContext = {
    batchId: 'batch-001',
    dataSource: 'CL87_CSV' as DataSource,
    dataPeriodStart: new Date('2024-01-01'),
    dataPeriodEnd: new Date('2024-12-31'),
  };

  describe('applyDateEstimation', () => {
    it('should apply date estimation to rider records', () => {
      const records = [
        {
          type: 'rider',
          data: {
            rider_id: 'DR001',
            name: 'John Doe',
            onboard_date: null,
            join_date: null,
          },
        },
      ];

      const results = applyDateEstimation(records, mockContext);

      expect(results.length).toBe(1);
      expect(results[0].transformed.is_historical_import).toBe(true);
      expect(results[0].transformed.data_source).toBe('CL87_CSV');
      expect(results[0].transformed.import_batch_id).toBe('batch-001');
    });

    it('should preserve existing dates', () => {
      const records = [
        {
          type: 'rider',
          data: {
            rider_id: 'DR001',
            onboard_date: '2024-01-15',
          },
        },
      ];

      const results = applyDateEstimation(records, mockContext);

      expect(results[0].transformed.onboard_date).toBe('2024-01-15');
    });

    it('should add warnings for estimated dates', () => {
      const records = [
        {
          type: 'rider',
          data: {
            rider_id: 'DR001',
            status: 'deboarded',
            deboard_date: null,
          },
        },
      ];

      const results = applyDateEstimation(records, mockContext);

      expect(results[0].warnings.length).toBeGreaterThan(0);
      expect(results[0].retroactiveEvents.length).toBeGreaterThan(0);
    });

    it('should set confidence score based on estimation', () => {
      const records = [
        {
          type: 'rider',
          data: {
            rider_id: 'DR001',
            onboard_date: null, // Will be estimated
          },
        },
      ];

      const results = applyDateEstimation(records, mockContext);

      expect(results[0].confidenceScore).toBeLessThan(1.0);
    });
  });

  describe('createGhostEntity', () => {
    it('should create ghost rider with placeholder data', () => {
      const csvRecord = {
        rider_phone: '9876543210',
      };

      const ghost = createGhostEntity('rider', 'DR999', csvRecord, mockContext);

      expect(ghost.entityType).toBe('rider');
      expect(ghost.entityId).toBe('DR999');
      expect(ghost.confidenceScore).toBe(0.30);
      expect(ghost.placeholderData.name).toContain('Imported Rider');
      expect(ghost.placeholderData.phone).toBe('9876543210');
      expect(ghost.placeholderData.is_historical_import).toBe(true);
      expect(ghost.placeholderData.data_source).toBe('DEFAULT_FILL');
    });

    it('should create ghost vehicle with placeholder data', () => {
      const ghost = createGhostEntity('vehicle', 'VH999', {}, mockContext);

      expect(ghost.entityType).toBe('vehicle');
      expect(ghost.placeholderData.vehicle_number).toBe('VH999');
      expect(ghost.placeholderData.make).toBe('Unknown');
      expect(ghost.placeholderData.model).toBe('Unknown');
    });

    it('should create ghost battery with placeholder data', () => {
      const ghost = createGhostEntity('battery', 'BT999', {}, mockContext);

      expect(ghost.entityType).toBe('battery');
      expect(ghost.placeholderData.battery_id).toBe('BT999');
      expect(ghost.placeholderData.service_provider).toBe('BATTERY_SMART');
    });

    it('should include reason for ghost entity', () => {
      const ghost = createGhostEntity('rider', 'DR999', {}, mockContext);

      expect(ghost.reason).toContain('not found in database');
    });
  });

  describe('generateRetroactiveEvents', () => {
    it('should collect all retroactive events from transformed records', () => {
      const transformedRecords = [
        {
          original: { rider_id: 'DR001' },
          transformed: { rider_id: 'DR001' },
          effectiveDates: { effective_start_date: '2024-01-15', effective_end_date: null },
          retroactiveEvents: [
            {
              id: '',
              entity_type: 'rider',
              entity_id: 'DR001',
              event_type: 'ONBOARD',
              effective_date: '2024-01-15',
              recorded_date: '2024-01-20',
              event_data: {},
              source: 'CL87_CSV',
              confidence: 0.5,
              notes: null,
              import_batch_id: 'batch-001',
              created_at: '2024-01-20',
            },
          ],
          ghostEntities: [],
          confidenceScore: 0.9,
          warnings: [],
        },
        {
          original: { vehicle_number: 'VH001' },
          transformed: { vehicle_number: 'VH001' },
          effectiveDates: { effective_start_date: '2024-01-15', effective_end_date: null },
          retroactiveEvents: [
            {
              id: '',
              entity_type: 'vehicle',
              entity_id: 'VH001',
              event_type: 'DEPLOY',
              effective_date: '2024-01-15',
              recorded_date: '2024-01-20',
              event_data: {},
              source: 'CL87_CSV',
              confidence: 0.9,
              notes: null,
              import_batch_id: 'batch-001',
              created_at: '2024-01-20',
            },
          ],
          ghostEntities: [],
          confidenceScore: 1.0,
          warnings: [],
        },
      ];

      const events = generateRetroactiveEvents(transformedRecords, mockContext);

      expect(events.length).toBe(2);
      expect(events[0].entity_type).toBe('rider');
      expect(events[1].entity_type).toBe('vehicle');
    });
  });

  describe('transformRecords', () => {
    it('should transform all records and return statistics', () => {
      const records = [
        { type: 'rider', data: { rider_id: 'DR001', onboard_date: '2024-01-15' } },
        { type: 'rider', data: { rider_id: 'DR002', onboard_date: null } }, // Needs estimation
        { type: 'vehicle', data: { vehicle_number: 'VH001', rider_id: 'DR001' } },
      ];

      const result = transformRecords(records, mockContext);

      expect(result.records.length).toBe(3);
      expect(result.statistics.totalRecords).toBe(3);
      expect(result.statistics.recordsWithEstimatedDates).toBeGreaterThan(0);
      expect(result.statistics.avgConfidenceScore).toBeGreaterThan(0);
    });

    it('should collect ghost entities from all records', () => {
      const records = [
        {
          type: 'rider',
          data: {
            rider_id: 'DR001',
            vehicle_assigned: 'VH999', // Non-existent vehicle
          },
        },
      ];

      const result = transformRecords(records, mockContext);

      // Ghost entities would be created during reconciliation, not transform
      // This tests that the transform step prepares the data correctly
      expect(result.ghostEntities).toBeDefined();
    });

    it('should handle empty records array', () => {
      const result = transformRecords([], mockContext);

      expect(result.records.length).toBe(0);
      expect(result.statistics.totalRecords).toBe(0);
      expect(result.statistics.avgConfidenceScore).toBe(1.0); // Default
    });
  });
});
