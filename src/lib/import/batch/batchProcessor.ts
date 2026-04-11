/**
 * Batch import processor with error isolation
 *
 * Handles database insertion in batches with:
 * - Individual row error isolation
 * - Progress tracking
 * - Rate limiting
 * - Detailed error reporting
 */

import { supabase } from '@/integrations/supabase/client';
import type { ValidatedRow, ImportProgress, ImportResult, EntityType } from '@/types/import';

// ===== CONSTANTS =====

const BATCH_SIZE = 50; // Following PlacesSeeder pattern
const BATCH_DELAY_MS = 100; // Rate limiting delay between batches

// ===== HELPER FUNCTIONS =====

/**
 * Delays execution for specified milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ===== BATCH PROCESSOR =====

/**
 * Processes batch import with error isolation
 *
 * Strategy:
 * 1. Try batch insert first (fast path)
 * 2. If batch fails, retry rows individually to isolate failures
 * 3. Track all successes and failures
 * 4. Report progress in real-time
 *
 * @param validRows - Rows that passed validation
 * @param entityType - Type of entity being imported
 * @param onProgress - Callback for progress updates
 * @returns Promise with import result summary
 */
export async function processBatchImport(
  validRows: ValidatedRow[],
  entityType: EntityType,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const startTime = Date.now();
  const totalRows = validRows.length;
  const totalBatches = Math.ceil(totalRows / BATCH_SIZE);

  // Initialize result object
  const result: ImportResult = {
    success: true,
    totalAttempted: totalRows,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    errors: [],
    insertedIds: [],
    updatedIds: [],
    duration: 0,
    timestamp: new Date(),
  };

  // Initialize progress tracker
  const progress: ImportProgress = {
    totalRows,
    processedRows: 0,
    successCount: 0,
    failureCount: 0,
    currentBatch: 0,
    totalBatches,
    status: 'running',
    errors: [],
  };

  // Process in batches
  for (let i = 0; i < totalBatches; i++) {
    progress.currentBatch = i + 1;
    onProgress({ ...progress });

    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, totalRows);
    const batch = validRows.slice(start, end);

    // Prepare data for insertion (only transformed data, no metadata)
    const dataToInsert = batch.map(row => row.transformedData);

    try {
      // Attempt batch insert first (fast path)
      const { data, error } = await (supabase as any)
        .from(entityType)
        .insert(dataToInsert)
        .select('id');

      if (error) {
        // Batch insert failed - fallback to individual inserts
        console.warn(`Batch ${i + 1} failed, retrying individually:`, error.message);

        await processIndividualRows(
          batch,
          entityType,
          result,
          progress,
          onProgress
        );
      } else {
        // Batch insert succeeded
        const insertedCount = data.length;
        result.successCount += insertedCount;
        result.insertedIds.push(...data.map(d => d.id));
        progress.successCount += insertedCount;
        progress.processedRows += insertedCount;

        onProgress({ ...progress });
      }
    } catch (err) {
      // Unexpected error - retry individually
      console.error(`Unexpected error in batch ${i + 1}:`, err);

      await processIndividualRows(
        batch,
        entityType,
        result,
        progress,
        onProgress
      );
    }

    // Rate limiting: delay between batches
    if (i < totalBatches - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Finalize progress
  progress.status = 'completed';
  onProgress({ ...progress });

  // Finalize result
  result.duration = Date.now() - startTime;
  result.success = result.failureCount === 0;

  return result;
}

/**
 * Processes rows individually when batch insert fails
 *
 * This isolates errors to specific rows rather than failing the entire batch.
 *
 * @param batch - Rows to process
 * @param entityType - Entity type
 * @param result - Result object to update
 * @param progress - Progress object to update
 * @param onProgress - Progress callback
 */
async function processIndividualRows(
  batch: ValidatedRow[],
  entityType: EntityType,
  result: ImportResult,
  progress: ImportProgress,
  onProgress: (progress: ImportProgress) => void
): Promise<void> {
  for (const row of batch) {
    try {
      const { data, error } = await (supabase as any)
        .from(entityType)
        .insert([row.transformedData])
        .select('id')
        .single();

      if (error) {
        // Insert failed for this row
        result.failureCount++;
        result.errors.push({
          rowIndex: row.rowIndex,
          data: row.originalData,
          error: error.message,
        });
        progress.failureCount++;
        progress.errors.push({
          rowIndex: row.rowIndex,
          error: error.message,
        });
      } else {
        // Insert succeeded
        result.successCount++;
        result.insertedIds.push(data.id);
        progress.successCount++;
      }
    } catch (err) {
      // Unexpected error
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      result.failureCount++;
      result.errors.push({
        rowIndex: row.rowIndex,
        data: row.originalData,
        error: errorMessage,
      });
      progress.failureCount++;
      progress.errors.push({
        rowIndex: row.rowIndex,
        error: errorMessage,
      });
    }

    progress.processedRows++;
    onProgress({ ...progress });

    // Small delay between individual inserts
    await sleep(50);
  }
}

/**
 * Processes batch update for duplicate resolution with "update" strategy
 *
 * Updates existing records in the database with new CSV data.
 *
 * @param validRows - Rows to update
 * @param entityType - Entity type
 * @param uniqueField - Field to match on (e.g., 'vehicle_number')
 * @param onProgress - Progress callback
 * @returns Promise with import result
 */
export async function processBatchUpdate(
  validRows: ValidatedRow[],
  entityType: EntityType,
  uniqueField: string,
  onProgress: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const startTime = Date.now();
  const totalRows = validRows.length;

  const result: ImportResult = {
    success: true,
    totalAttempted: totalRows,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    errors: [],
    insertedIds: [],
    updatedIds: [],
    duration: 0,
    timestamp: new Date(),
  };

  const progress: ImportProgress = {
    totalRows,
    processedRows: 0,
    successCount: 0,
    failureCount: 0,
    currentBatch: 1,
    totalBatches: 1,
    status: 'running',
    errors: [],
  };

  // Process updates individually (safer than batch update)
  for (const row of validRows) {
    try {
      const uniqueValue = row.transformedData[uniqueField];

      const { data, error } = await (supabase as any)
        .from(entityType)
        .update(row.transformedData)
        .eq(uniqueField, uniqueValue)
        .select('id')
        .single();

      if (error) {
        result.failureCount++;
        result.errors.push({
          rowIndex: row.rowIndex,
          data: row.originalData,
          error: error.message,
        });
        progress.failureCount++;
      } else {
        result.successCount++;
        result.updatedIds.push(data.id);
        progress.successCount++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      result.failureCount++;
      result.errors.push({
        rowIndex: row.rowIndex,
        data: row.originalData,
        error: errorMessage,
      });
      progress.failureCount++;
    }

    progress.processedRows++;
    onProgress({ ...progress });

    await sleep(100); // Rate limiting for updates
  }

  progress.status = 'completed';
  onProgress({ ...progress });

  result.duration = Date.now() - startTime;
  result.success = result.failureCount === 0;

  return result;
}
