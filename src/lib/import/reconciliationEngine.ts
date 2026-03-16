/**
 * Reconciliation Engine
 *
 * Compares CSV records against existing database records and categorizes differences.
 * Handles conflict resolution based on data source priority.
 */

import type {
  MatchCategory,
  ReconciliationMatch,
  ImportPreviewReport,
  DataSource,
} from '@/types/historical';
import { DATA_SOURCE_CONFIDENCE } from './dateEstimation';

// ============================================================================
// DATA SOURCE PRIORITY (for conflict resolution)
// ============================================================================

/**
 * Priority order for data sources (higher number = higher priority)
 * When there's a conflict, the higher priority source wins.
 */
export const DATA_SOURCE_PRIORITY: Record<DataSource, number> = {
  EXACT_REVENUE_CSV: 100, // Highest - exact revenue data
  CL87_CSV: 90, // CL87 official export
  PAYMENT_RECORDS_CSV: 85, // Payment records
  BATTERY_SMART_CSV: 80, // Battery Smart export
  PLATFORM: 70, // Existing platform data
  MANUAL_ENTRY: 50, // Human entered
  ESTIMATED_DATE: 30, // Calculated/derived
  DEFAULT_FILL: 10, // Assumed values - lowest
};

// ============================================================================
// MATCH FUNCTIONS
// ============================================================================

/**
 * Match CSV records to database records by ID
 */
export function matchRecords<T extends Record<string, unknown>>(
  csvRecords: T[],
  dbRecords: T[],
  idField: string
): Map<string, { csv: T | null; db: T | null }> {
  const matches = new Map<string, { csv: T | null; db: T | null }>();

  // Index DB records by ID
  const dbIndex = new Map<string, T>();
  for (const dbRecord of dbRecords) {
    const id = String(dbRecord[idField]);
    if (id) {
      dbIndex.set(id, dbRecord);
    }
  }

  // Match CSV records to DB records
  const matchedDbIds = new Set<string>();

  for (const csvRecord of csvRecords) {
    const id = String(csvRecord[idField]);
    if (id) {
      const dbRecord = dbIndex.get(id);
      matches.set(id, { csv: csvRecord, db: dbRecord || null });
      if (dbRecord) {
        matchedDbIds.add(id);
      }
    }
  }

  // Add DB records not in CSV
  for (const [id, dbRecord] of dbIndex) {
    if (!matchedDbIds.has(id)) {
      matches.set(id, { csv: null, db: dbRecord });
    }
  }

  return matches;
}

/**
 * Categorize a match between CSV and DB record
 */
export function categorizeMatch(
  csvRecord: Record<string, unknown> | null,
  dbRecord: Record<string, unknown> | null,
  compareFields: string[]
): MatchCategory {
  // No CSV record = missing in CSV
  if (!csvRecord) {
    return 'MISSING_IN_CSV';
  }

  // No DB record = new record
  if (!dbRecord) {
    return 'NEW_RECORD';
  }

  // Compare fields to check for exact match or conflict
  const differences: string[] = [];

  for (const field of compareFields) {
    const csvValue = csvRecord[field];
    const dbValue = dbRecord[field];

    // Normalize values for comparison
    const normalizedCsv = normalizeValue(csvValue);
    const normalizedDb = normalizeValue(dbValue);

    if (normalizedCsv !== normalizedDb) {
      differences.push(field);
    }
  }

  if (differences.length === 0) {
    return 'EXACT_MATCH';
  }

  return 'CONFLICT';
}

/**
 * Normalize a value for comparison
 */
function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  return String(value);
}

/**
 * Resolve a conflict between CSV and DB values
 */
export function resolveConflict(
  csvValue: unknown,
  dbValue: unknown,
  csvSource: DataSource,
  dbSource: DataSource = 'PLATFORM'
): { value: unknown; resolution: 'csv' | 'db'; reason: string } {
  const csvPriority = DATA_SOURCE_PRIORITY[csvSource];
  const dbPriority = DATA_SOURCE_PRIORITY[dbSource];

  // CSV wins if higher or equal priority (newer data takes precedence)
  if (csvPriority >= dbPriority) {
    return {
      value: csvValue,
      resolution: 'csv',
      reason: `CSV source (${csvSource}) has priority ${csvPriority} >= DB source (${dbSource}) priority ${dbPriority}`,
    };
  }

  // DB wins
  return {
    value: dbValue,
    resolution: 'db',
    reason: `DB source (${dbSource}) has priority ${dbPriority} > CSV source (${csvSource}) priority ${csvPriority}`,
  };
}

// ============================================================================
// PREVIEW REPORT GENERATION
// ============================================================================

/**
 * Generate a preview report for an import
 */
export function generatePreviewReport<T extends Record<string, unknown>>(
  csvRecords: T[],
  dbRecords: T[],
  idField: string,
  compareFields: string[],
  csvSource: DataSource = 'CL87_CSV'
): ImportPreviewReport {
  const matches = matchRecords(csvRecords, dbRecords, idField);
  const reconciliationMatches: ReconciliationMatch[] = [];

  let exactMatches = 0;
  let conflicts = 0;
  let newRecords = 0;
  let missingInCSV = 0;
  let lowConfidenceRecords = 0;
  let ghostRecordsNeeded = 0;

  for (const [, { csv, db }] of matches) {
    const category = categorizeMatch(csv, db, compareFields);

    const match: ReconciliationMatch = {
      csvRecord: csv || {},
      dbRecord: db,
      category,
    };

    // Handle conflicts
    if (category === 'CONFLICT' && csv && db) {
      const conflictFields: Array<{
        field: string;
        csvValue: unknown;
        dbValue: unknown;
        resolution: 'csv' | 'db' | 'manual';
      }> = [];

      for (const field of compareFields) {
        const normalizedCsv = normalizeValue(csv[field]);
        const normalizedDb = normalizeValue(db[field]);

        if (normalizedCsv !== normalizedDb) {
          const resolution = resolveConflict(
            csv[field],
            db[field],
            csvSource
          );

          conflictFields.push({
            field,
            csvValue: csv[field],
            dbValue: db[field],
            resolution: resolution.resolution,
          });
        }
      }

      match.conflicts = conflictFields;
      conflicts++;
    }

    // Count by category
    switch (category) {
      case 'EXACT_MATCH':
        exactMatches++;
        break;
      case 'CONFLICT':
        conflicts++;
        break;
      case 'NEW_RECORD':
        newRecords++;
        // Check if this might need ghost records (references missing entities)
        if (csv && hasExternalReferences(csv)) {
          ghostRecordsNeeded++;
        }
        break;
      case 'MISSING_IN_CSV':
        missingInCSV++;
        break;
    }

    // Check for low confidence records
    if (csv && isLowConfidence(csv)) {
      lowConfidenceRecords++;
    }

    reconciliationMatches.push(match);
  }

  return {
    totalRecords: csvRecords.length,
    exactMatches,
    conflicts,
    newRecords,
    missingInCSV,
    lowConfidenceRecords,
    ghostRecordsNeeded,
    matches: reconciliationMatches,
  };
}

/**
 * Check if a record has external references that might need ghost entities
 */
function hasExternalReferences(record: Record<string, unknown>): boolean {
  const referenceFields = ['rider_id', 'vehicle_id', 'battery_id', 'vehicle_number'];

  for (const field of referenceFields) {
    if (record[field] && typeof record[field] === 'string') {
      // Check if it looks like a reference (not empty, not 'null')
      const value = record[field] as string;
      if (value.trim() && value.toLowerCase() !== 'null') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a record has low confidence data
 */
function isLowConfidence(record: Record<string, unknown>): boolean {
  // Check for missing critical fields
  const criticalFields = ['rider_id', 'vehicle_number', 'battery_id'];

  for (const field of criticalFields) {
    if (field in record) {
      const value = record[field];
      if (!value || (typeof value === 'string' && !value.trim())) {
        return true;
      }
    }
  }

  // Check for estimated dates (indicated by confidence score)
  if ('confidence_score' in record) {
    const score = Number(record.confidence_score);
    if (score < 0.70) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get records that need to be created (NEW_RECORD category)
 */
export function getRecordsToCreate(
  report: ImportPreviewReport
): Record<string, unknown>[] {
  return report.matches
    .filter(m => m.category === 'NEW_RECORD')
    .map(m => m.csvRecord);
}

/**
 * Get records that need to be updated (CONFLICT category)
 */
export function getRecordsToUpdate(
  report: ImportPreviewReport
): Array<{ record: Record<string, unknown>; conflicts: ReconciliationMatch['conflicts'] }> {
  return report.matches
    .filter(m => m.category === 'CONFLICT')
    .map(m => ({
      record: m.csvRecord,
      conflicts: m.conflicts,
    }));
}

/**
 * Get records to skip (EXACT_MATCH category)
 */
export function getRecordsToSkip(
  report: ImportPreviewReport
): Record<string, unknown>[] {
  return report.matches
    .filter(m => m.category === 'EXACT_MATCH')
    .map(m => m.csvRecord);
}

/**
 * Summary statistics for display
 */
export function getReconciliationSummary(report: ImportPreviewReport): {
  summary: string;
  warnings: string[];
  needsAttention: boolean;
} {
  const warnings: string[] = [];

  if (report.conflicts > 0) {
    warnings.push(`${report.conflicts} records have conflicts that will be resolved using CSV data`);
  }

  if (report.lowConfidenceRecords > 0) {
    warnings.push(`${report.lowConfidenceRecords} records have low confidence scores and may need review`);
  }

  if (report.ghostRecordsNeeded > 0) {
    warnings.push(`${report.ghostRecordsNeeded} new records reference entities not in the database (ghost records will be created)`);
  }

  if (report.missingInCSV > 0) {
    warnings.push(`${report.missingInCSV} database records are not in the CSV (will be kept unchanged)`);
  }

  const summary = `Import preview: ${report.totalRecords} records total, ` +
    `${report.exactMatches} exact matches (skip), ` +
    `${report.conflicts} conflicts (update), ` +
    `${report.newRecords} new records (create)`;

  return {
    summary,
    warnings,
    needsAttention: warnings.length > 0,
  };
}
