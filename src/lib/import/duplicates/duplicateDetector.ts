/**
 * Duplicate detection for import system
 *
 * Detects duplicates in two contexts:
 * 1. Within the CSV file itself (CSV duplicates)
 * 2. Against existing database records (Database duplicates)
 */

import { supabase } from '@/integrations/supabase/client';
import type { ValidatedRow, DuplicateGroup, EntityType } from '@/types/import';

// ===== UNIQUE KEY CONFIGURATIONS =====

/**
 * Defines unique fields for each entity type
 * These fields must be unique in the database
 */
const UNIQUE_KEY_STRATEGIES: Record<EntityType, {
  fields: string[];      // Field names in transformed data
  dbColumns: string[];   // Column names in database
}> = {
  vehicles: {
    fields: ['vehicle_number', 'chassis_number', 'motor_serial_number'],
    dbColumns: ['vehicle_number', 'chassis_number', 'motor_serial_number'],
  },
  batteries: {
    fields: ['battery_id'],
    dbColumns: ['battery_id'],
  },
  riders: {
    fields: ['rider_id'],
    dbColumns: ['rider_id'],
  },
};

// ===== CSV DUPLICATE DETECTION =====

/**
 * Detects duplicate records within the CSV file
 *
 * Checks if the same unique key appears multiple times in the upload.
 *
 * @param validRows - Array of validated rows from CSV
 * @param entityType - Type of entity being imported
 * @returns Array of duplicate groups found in CSV
 */
export function detectCSVDuplicates(
  validRows: ValidatedRow[],
  entityType: EntityType
): DuplicateGroup[] {
  const strategy = UNIQUE_KEY_STRATEGIES[entityType];
  const duplicateGroups: DuplicateGroup[] = [];

  // For each unique field, track occurrences
  for (const field of strategy.fields) {
    const seenValues = new Map<string, ValidatedRow[]>();

    for (const row of validRows) {
      const value = row.transformedData[field];
      if (!value) continue;

      // Normalize value (uppercase, trim)
      const normalizedValue = String(value).toUpperCase().trim();
      const key = `${field}:${normalizedValue}`;

      if (!seenValues.has(key)) {
        seenValues.set(key, []);
      }
      seenValues.get(key)!.push(row);
    }

    // Find groups with more than one occurrence
    for (const [key, records] of seenValues.entries()) {
      if (records.length > 1) {
        // Check if this duplicate group already exists
        const existing = duplicateGroups.find(g => g.uniqueKey === key);

        if (!existing) {
          duplicateGroups.push({
            uniqueKey: key,
            newRecords: records,
            conflictType: 'csv',
          });
        } else {
          // Merge records if duplicate group already exists
          existing.newRecords = [...new Set([...existing.newRecords, ...records])];
        }
      }
    }
  }

  return duplicateGroups;
}

// ===== DATABASE DUPLICATE DETECTION =====

/**
 * Detects duplicate records against existing database records
 *
 * Queries database to find existing records with matching unique fields.
 *
 * @param validRows - Array of validated rows from CSV
 * @param entityType - Type of entity being imported
 * @returns Promise with array of duplicate groups found in database
 */
export async function detectDatabaseDuplicates(
  validRows: ValidatedRow[],
  entityType: EntityType
): Promise<DuplicateGroup[]> {
  const strategy = UNIQUE_KEY_STRATEGIES[entityType];
  const duplicateGroups: DuplicateGroup[] = [];

  // For each unique field, collect values to check
  for (let i = 0; i < strategy.fields.length; i++) {
    const field = strategy.fields[i];
    const dbColumn = strategy.dbColumns[i];

    // Collect all values for this field
    const valuesToCheck = new Set<string>();
    for (const row of validRows) {
      const value = row.transformedData[field];
      if (value) {
        valuesToCheck.add(String(value).toUpperCase().trim());
      }
    }

    if (valuesToCheck.size === 0) continue;

    // Query database for existing records
    const { data: existingRecords, error } = await supabase
      .from(entityType)
      .select('*')
      .in(dbColumn, Array.from(valuesToCheck));

    if (error) {
      console.error(`Error checking for duplicates in ${dbColumn}:`, error);
      continue;
    }

    if (!existingRecords || existingRecords.length === 0) continue;

    // Match existing records with CSV rows
    for (const existingRecord of existingRecords) {
      const dbValue = String(existingRecord[dbColumn] || '').toUpperCase().trim();

      // Find all CSV rows that match this database value
      const matchingRows = validRows.filter(row => {
        const csvValue = String(row.transformedData[field] || '').toUpperCase().trim();
        return csvValue === dbValue;
      });

      if (matchingRows.length > 0) {
        const key = `${field}:${dbValue}`;

        // Check if we already have a duplicate group for this key
        const existing = duplicateGroups.find(g => g.uniqueKey === key);

        if (!existing) {
          duplicateGroups.push({
            uniqueKey: key,
            existingRecord,
            newRecords: matchingRows,
            conflictType: 'database',
          });
        } else {
          // Merge if already exists
          existing.existingRecord = existingRecord;
          existing.newRecords = [...new Set([...existing.newRecords, ...matchingRows])];
          existing.conflictType = 'both'; // Has both CSV and DB conflicts
        }
      }
    }
  }

  return duplicateGroups;
}

// ===== COMBINED DUPLICATE DETECTION =====

/**
 * Detects all duplicates (CSV + Database) in one operation
 *
 * @param validRows - Array of validated rows from CSV
 * @param entityType - Type of entity being imported
 * @returns Promise with all duplicate groups (CSV + Database)
 */
export async function detectAllDuplicates(
  validRows: ValidatedRow[],
  entityType: EntityType
): Promise<DuplicateGroup[]> {
  // Detect CSV duplicates (synchronous)
  const csvDuplicates = detectCSVDuplicates(validRows, entityType);

  // Detect database duplicates (async)
  const dbDuplicates = await detectDatabaseDuplicates(validRows, entityType);

  // Merge duplicate groups
  const allGroups = new Map<string, DuplicateGroup>();

  // Add CSV duplicates
  for (const group of csvDuplicates) {
    allGroups.set(group.uniqueKey, group);
  }

  // Add or merge database duplicates
  for (const group of dbDuplicates) {
    const existing = allGroups.get(group.uniqueKey);

    if (!existing) {
      allGroups.set(group.uniqueKey, group);
    } else {
      // Merge: Mark as 'both' if we have both CSV and DB conflicts
      existing.existingRecord = group.existingRecord;
      existing.conflictType = 'both';
      // Merge newRecords (deduplicate)
      const mergedRecords = [...existing.newRecords, ...group.newRecords];
      existing.newRecords = Array.from(
        new Map(mergedRecords.map(r => [r.rowIndex, r])).values()
      );
    }
  }

  return Array.from(allGroups.values());
}

/**
 * Gets summary of duplicate detection results
 *
 * @param duplicateGroups - Array of duplicate groups
 * @returns Summary object with counts by conflict type
 */
export function getDuplicateSummary(duplicateGroups: DuplicateGroup[]): {
  totalDuplicates: number;
  csvOnly: number;
  databaseOnly: number;
  both: number;
  affectedRows: number;
} {
  const summary = {
    totalDuplicates: duplicateGroups.length,
    csvOnly: 0,
    databaseOnly: 0,
    both: 0,
    affectedRows: 0,
  };

  const affectedRowIndices = new Set<number>();

  for (const group of duplicateGroups) {
    // Count by conflict type
    if (group.conflictType === 'csv') {
      summary.csvOnly++;
    } else if (group.conflictType === 'database') {
      summary.databaseOnly++;
    } else {
      summary.both++;
    }

    // Track affected rows
    for (const row of group.newRecords) {
      affectedRowIndices.add(row.rowIndex);
    }
  }

  summary.affectedRows = affectedRowIndices.size;

  return summary;
}
