/**
 * Historical Import Orchestrator
 *
 * Orchestrates the 5-phase import workflow:
 * 1. Prepare - Parse and validate CSV
 * 2. Reconcile - Match against DB
 * 3. Transform - Apply estimations, create ghosts
 * 4. Execute - Insert/update with transaction
 * 5. Verify - Validate results
 */

import { supabase } from '@/integrations/supabase/client';
import type { DataSource, DataImportBatch, ImportBatchStatus } from '@/types/historical';
import { generatePreviewReport, reconcileRecords, type ImportPreviewReport } from './reconciliationEngine';
import { transformRecords, type TransformResult, type GhostEntity } from './transformEngine';

// ============================================================================
// TYPES
// ============================================================================

export interface ImportOptions {
  batchName: string;
  sourceFile: string;
  dataSource: DataSource;
  createGhostRecords: boolean;
  applyDateEstimation: boolean;
  dryRun: boolean;
}

export interface ImportPhaseResult {
  phase: 'prepare' | 'reconcile' | 'transform' | 'execute' | 'verify';
  success: boolean;
  duration_ms: number;
  data?: unknown;
  error?: string;
}

export interface ImportWorkflowResult {
  batchId: string;
  success: boolean;
  phases: ImportPhaseResult[];
  summary: {
    recordsTotal: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsSkipped: number;
    ghostEntitiesCreated: number;
    retroactiveEventsCreated: number;
  };
  error?: string;
}

// ============================================================================
// PHASE 1: PREPARE
// ============================================================================

/**
 * Parse and validate CSV content
 */
export async function prepareImport(
  csvContent: string,
  options: ImportOptions
): Promise<ImportPhaseResult & { data: { parsedRecords: unknown[]; headers: string[] } }> {
  const startTime = Date.now();

  try {
    // Parse CSV
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const records: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const record: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          record[header] = values[index];
        });
        records.push(record);
      }
    }

    return {
      phase: 'prepare',
      success: true,
      duration_ms: Date.now().getTime() - startTime.getTime(),
      data: { parsedRecords: records, headers },
    };
  } catch (error) {
    return {
      phase: 'prepare',
      success: false,
      duration_ms: Date.now().getTime() - startTime.getTime(),
      error: error instanceof Error ? error.message : 'Unknown error in prepare phase',
    };
  }
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      if (current !== '') {
        result.push(current);
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (inQuotes) {
    result.push(current);
  } else {
    result.push(current);
  }

  return result;
}

// ============================================================================
// PHASE 2: RECONCILE
// ============================================================================

/**
 * Reconcile CSV records with database
 */
export async function reconcileImport(
  parsedRecords: Record<string, unknown>[],
  options: ImportOptions
): Promise<ImportPhaseResult & { data: ImportPreviewReport }> {
  const startTime = Date.now();

  try {
    // Fetch existing records from database
    // This would need to be adapted based on the data source
    const existingRecords = await fetchExistingRecords(options.dataSource);

    const previewReport = generatePreviewReport(
      parsedRecords,
      existingRecords,
      'rider_id',
      ['name', 'phone', 'status', 'vehicle_assigned'],
      options.dataSource
    );

    return {
      phase: 'reconcile',
      success: true,
      duration_ms: Date.now().getTime() - startTime.getTime(),
      data: { previewReport },
    };
  } catch (error) {
    return {
      phase: 'reconcile',
      success: false,
      duration_ms: Date.now().getTime() - startTime.getTime(),
      error: error instanceof Error ? error.message : 'Unknown error in reconcile phase',
    };
  }
}

// ============================================================================
// PHASE 3: TRANSFORM
// ============================================================================

/**
 * Transform reconciled records
 */
export async function transformImport(
  previewReport: ImportPreviewReport,
  options: ImportOptions
): Promise<ImportPhaseResult & { data: TransformResult }> {
  const startTime = Date.now();

  try {
    const transformResult = transformRecords(
      previewReport.matches.map(m => ({
        type: 'rider',
        data: m.csvRecord,
      })),
      {
        batchId: '', // Will be set by caller
        dataSource: options.dataSource,
        dataPeriodStart: new Date('2024-01-01'),
        dataPeriodEnd: new Date(),
      }
    );

    return {
      phase: 'transform',
      success: true,
      duration_ms: Date.now().getTime() - startTime.getTime(),
      data: transformResult,
    };
  } catch (error) {
    return {
      phase: 'transform',
      success: false,
      duration_ms: Date.now().getTime() - startTime.getTime(),
      error: error instanceof Error ? error.message : 'Unknown error in transform phase',
    };
  }
}

// ============================================================================
// PHASE 4: EXECUTE
// ============================================================================

/**
 * Execute the import with database transaction
 */
export async function executeImport(
  transformResult: TransformResult,
  batchId: string,
  options: ImportOptions
): Promise<ImportPhaseResult & { data: { insertedIds: string[] } }> {
  const startTime = Date.now();

  try {
    // Start transaction
    // Note: Supabase doesn't support explicit transactions in the same way
    // We'll do a best-effort insert with rollback capability

    const insertedIds: string[] = [];
    const errors: string[] = [];

    // Insert ghost entities first
    for (const ghost of transformResult.ghostEntities) {
      try {
        const { data, error } = await supabase
          .from(ghost.entityType + 's')
          .insert(ghost.placeholderData)
          .select('id')
          .single();

        if (error) {
          errors.push(`Failed to create ghost ${ghost.entityType}: ${error.message}`);
        } else if (data) {
          insertedIds.push(data.id);
        }
      } catch (err) {
        errors.push(`Error creating ghost ${ghost.entityType}: ${err}`);
      }
    }

    // Insert transformed records
    for (const record of transformResult.records) {
      try {
        const { data, error } = await supabase
          .from('riders')
          .insert({
            ...record.transformed,
            import_batch_id: batchId,
            is_historical_import: true,
            data_source: options.dataSource,
          })
          .select('id');

        if (error) {
          errors.push(`Failed to insert record: ${error.message}`);
        } else if (data) {
          insertedIds.push(data.id);
        }
      } catch (err) {
        errors.push(`Error inserting record: ${err}`);
      }
    }

    // Insert retroactive events
    for (const event of transformResult.retroactiveEvents) {
      try {
        const { error } = await supabase
          .from('retroactive_events')
          .insert({
            ...event,
            import_batch_id: batchId,
          });

        if (error) {
          errors.push(`Failed to insert retroactive event: ${error.message}`);
        }
      } catch (err) {
        errors.push(`Error inserting retroactive event: ${err}`);
      }
    }

    // Update batch status
    const { error: updateError } = await supabase
      .from('data_import_batches')
      .update({
        status: errors.length > 0 ? 'failed' : 'completed',
        records_created: insertedIds.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    if (updateError) {
      errors.push(`Failed to update batch status: ${updateError.message}`);
    }

    return {
      phase: 'execute',
      success: errors.length === 0,
      duration_ms: Date.now().getTime() - startTime.getTime(),
      data: { insertedIds, errors: errors.length > 0 ? errors : undefined },
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (error) {
    return {
      phase: 'execute',
      success: false,
      duration_ms: Date.now().getTime() - startTime.getTime(),
      error: error instanceof Error ? error.message : 'Unknown error in execute phase',
    };
  }
}

// ============================================================================
// PHASE 5: VERIFY
// ============================================================================

/**
 * Verify import results
 */
export async function verifyImport(
  batchId: string
): Promise<ImportPhaseResult & { data: { summary: unknown } }> {
  const startTime = Date.now();

  try {
    // Get batch summary
    const { data: batch, error } = await supabase
      .from('data_import_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error || !batch) {
      return {
        phase: 'verify',
        success: false,
        duration_ms: Date.now().getTime() - startTime.getTime(),
        error: 'Batch not found',
      };
    }

    // Count created records
    const counts = await Promise.all([
      supabase.from('riders').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
      supabase.from('retroactive_events').select('id', { count: 'exact', head: true }).eq('import_batch_id', batchId),
    ]);

    const [ridersCount, eventsCount] = await Promise.all([
      counts[0],
      counts[1],
    ]);

    const summary = {
      batch,
      ridersCreated: ridersCount.count || 0,
      retroactiveEventsCreated: eventsCount.count || 0,
    };

    return {
      phase: 'verify',
      success: true,
      duration_ms: Date.now().getTime() - startTime.getTime(),
      data: { summary },
    };
  } catch (error) {
    return {
      phase: 'verify',
      success: false,
      duration_ms: Date.now().getTime() - startTime.getTime(),
      error: error instanceof Error ? error.message : 'Unknown error in verify phase',
    };
  }
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

/**
 * Execute full import workflow
 */
export async function executeImportWorkflow(
  csvContent: string,
  options: ImportOptions
): Promise<ImportWorkflowResult> {
  const phases: ImportPhaseResult[] = [];
  let batchId: string | undefined;

  try {
    // Create batch record
    const { data: batch, error: createError } = await supabase
      .from('data_import_batches')
      .insert({
        batch_name: options.batchName,
        source_file: options.sourceFile,
        status: 'pending',
        data_source: options.dataSource,
      })
      .select('id')
      .single();

    if (createError || !batch) {
        throw new Error(`Failed to create batch: ${createError?.message}`);
      }

    batchId = batch.id;

    // Update status to in_progress
    await supabase
      .from('data_import_batches')
      .update({ status: 'in_progress' })
      .eq('id', batchId);

    // Phase 1: Prepare
    const prepareResult = await prepareImport(csvContent, options);
    phases.push(prepareResult);

    if (!prepareResult.success) {
      throw new Error(prepareResult.error || 'Prepare phase failed');
    }

    // Phase 2: Reconcile
    const reconcileResult = await reconcileImport(
      prepareResult.data?.parsedRecords || [],
      options
    );
    phases.push(reconcileResult);

    if (!reconcileResult.success) {
      throw new Error(reconcileResult.error || 'Reconcile phase failed');
    }

    // Phase 3: Transform
    const transformResult = await transformImport(
      reconcileResult.data?.previewReport || { matches: [], totalRecords: 0 },
      options
    );
    phases.push(transformResult);

    if (!transformResult.success) {
      throw new Error(transformResult.error || 'Transform phase failed');
    }

    // Phase 4: Execute
    if (!options.dryRun) {
      const executeResult = await executeImport(
        transformResult.data!,
        batchId,
        options
      );
      phases.push(executeResult);

      if (!executeResult.success) {
        throw new Error(executeResult.error || 'Execute phase failed');
      }

      // Phase 5: Verify
      const verifyResult = await verifyImport(batchId);
      phases.push(verifyResult);

      if (!verifyResult.success) {
        throw new Error(verifyResult.error || 'Verify phase failed');
      }
    }

    // Update batch status to completed
    await supabase
      .from('data_import_batches')
      .update({ status: 'completed' })
      .eq('id', batchId);

    return {
      batchId,
      success: true,
      phases,
      summary: verifyResult.data?.summary || {},
    };
  } catch (error) {
    // Update batch status to failed
    if (batchId) {
      await supabase
        .from('data_import_batches')
        .update({
          status: 'failed',
          notes: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', batchId);
    }

    return {
      batchId,
      success: false,
      phases,
      summary: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// ROLLBACK
// ============================================================================

/**
 * Rollback an import by batch ID
 */
export async function rollbackImport(batchId: string): Promise<boolean> {
  try {
    // Delete records created by this batch
    await Promise.all([
      supabase.from('riders').delete().eq('import_batch_id', batchId),
      supabase.from('retroactive_events').delete().eq('import_batch_id', batchId),
    ]);

    // Update batch status
    await supabase
      .from('data_import_batches')
      .update({ status: 'rolled_back' })
      .eq('id', batchId);

    return true;
  } catch (error) {
    console.error('Rollback failed:', error);
    return false;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch existing records from database
 */
async function fetchExistingRecords(dataSource: DataSource): Promise<Record<string, unknown>[]> {
  // This is a placeholder - implement based on your specific import logic
  // For now, return empty array
  return [];
}
