/**
 * Transform Engine
 *
 * Transforms reconciled data by applying date estimation, creating ghost entities,
 * calculating effective dates, and generating retroactive events.
 */

import type {
  DataSource,
  RetroactiveEvent,
  RetroactiveEntityType,
  RetroactiveEventType,
} from '@/types/historical';
import { DATA_SOURCE_CONFIDENCE } from './dateEstimation';
import {
  estimateOnboardDate,
  estimateDeboardDate,
  estimateAssignmentDate,
  estimateDueDate,
  calculateEffectiveDates,
} from './dateEstimation';

// ============================================================================
// TYPES
// ============================================================================

export interface TransformContext {
  batchId: string;
  dataSource: DataSource;
  dataPeriodStart: Date;
  dataPeriodEnd: Date;
}

export interface TransformedRecord {
  original: Record<string, unknown>;
  transformed: Record<string, unknown>;
  effectiveDates: {
    effective_start_date: string | null;
    effective_end_date: string | null;
  };
  retroactiveEvents: RetroactiveEvent[];
  ghostEntities: GhostEntity[];
  confidenceScore: number;
  warnings: string[];
}

export interface GhostEntity {
  entityType: RetroactiveEntityType;
  entityId: string;
  placeholderData: Record<string, unknown>;
  confidenceScore: number;
  reason: string;
}

export interface TransformResult {
  records: TransformedRecord[];
  ghostEntities: GhostEntity[];
  retroactiveEvents: RetroactiveEvent[];
  statistics: {
    totalRecords: number;
    recordsWithEstimatedDates: number;
    ghostEntitiesCreated: number;
    retroactiveEventsCreated: number;
    avgConfidenceScore: number;
  };
}

// ============================================================================
// DATE ESTIMATION APPLICATION
// ============================================================================

/**
 * Apply date estimation to a set of records
 */
export function applyDateEstimation(
  records: Array<{ type: string; data: Record<string, unknown> }>,
  context: TransformContext
): TransformedRecord[] {
  const results: TransformedRecord[] = [];

  for (const record of records) {
    const result = transformRecord(record.type, record.data, context);
    results.push(result);
  }

  return results;
}

/**
 * Transform a single record based on its type
 */
function transformRecord(
  type: string,
  data: Record<string, unknown>,
  context: TransformContext
): TransformedRecord {
  const warnings: string[] = [];
  let confidenceScore = DATA_SOURCE_CONFIDENCE[context.dataSource];
  const retroactiveEvents: RetroactiveEvent[] = [];
  const ghostEntities: GhostEntity[] = [];

  let transformed = { ...data };

  switch (type) {
    case 'rider':
      transformed = transformRiderRecord(
        data,
        context,
        warnings,
        retroactiveEvents,
        ghostEntities
      );
      break;

    case 'vehicle':
      transformed = transformVehicleRecord(
        data,
        context,
        warnings,
        retroactiveEvents,
        ghostEntities
      );
      break;

    case 'battery':
      transformed = transformBatteryRecord(
        data,
        context,
        warnings,
        retroactiveEvents,
        ghostEntities
      );
      break;

    case 'payment':
      transformed = transformPaymentRecord(
        data,
        context,
        warnings,
        retroactiveEvents
      );
      break;
  }

  // Calculate effective dates
  const effectiveDates = calculateEffectiveDatesForRecord(type, transformed, context);

  // Adjust confidence based on warnings
  if (warnings.length > 0) {
    confidenceScore = Math.max(0.30, confidenceScore - warnings.length * 0.10);
  }

  return {
    original: data,
    transformed,
    effectiveDates,
    retroactiveEvents,
    ghostEntities,
    confidenceScore,
    warnings,
  };
}

// ============================================================================
// ENTITY-SPECIFIC TRANSFORMATIONS
// ============================================================================

function transformRiderRecord(
  data: Record<string, unknown>,
  context: TransformContext,
  warnings: string[],
  retroactiveEvents: RetroactiveEvent[],
  ghostEntities: GhostEntity[]
): Record<string, unknown> {
  const transformed = { ...data };

  // Estimate onboard date if missing
  if (!data.onboard_date && !data.join_date) {
    const estimation = estimateOnboardDate(
      { onboard_date: null, join_date: null },
      []
    );

    if (estimation.estimatedDate) {
      transformed.onboard_date = estimation.estimatedDate.toISOString();
      transformed.confidence_score = Math.min(
        (transformed.confidence_score as number) || 1.0,
        estimation.confidenceScore
      );

      retroactiveEvents.push({
        id: '',
        entity_type: 'rider',
        entity_id: String(data.rider_id),
        event_type: 'ONBOARD',
        effective_date: estimation.estimatedDate.toISOString(),
        recorded_date: new Date().toISOString(),
        event_data: { estimated: true, method: estimation.estimationMethod },
        source: context.dataSource,
        confidence: estimation.confidenceScore,
        notes: estimation.notes || null,
        import_batch_id: context.batchId,
        created_at: new Date().toISOString(),
      });

      warnings.push(`Onboard date estimated using ${estimation.estimationMethod}`);
    }
  }

  // Estimate deboard date if rider is deboarded without date
  if (data.status === 'deboarded' && !data.deboard_date) {
    const estimation = estimateDeboardDate(
      { status: 'deboarded', deboard_date: null },
      [],
      null
    );

    if (estimation.estimatedDate) {
      transformed.deboard_date = estimation.estimatedDate.toISOString();
      transformed.confidence_score = Math.min(
        (transformed.confidence_score as number) || 1.0,
        estimation.confidenceScore
      );

      retroactiveEvents.push({
        id: '',
        entity_type: 'rider',
        entity_id: String(data.rider_id),
        event_type: 'DEBOARD',
        effective_date: estimation.estimatedDate.toISOString(),
        recorded_date: new Date().toISOString(),
        event_data: { estimated: true, method: estimation.estimationMethod },
        source: context.dataSource,
        confidence: estimation.confidenceScore,
        notes: estimation.notes || null,
        import_batch_id: context.batchId,
        created_at: new Date().toISOString(),
      });

      warnings.push(`Deboard date estimated using ${estimation.estimationMethod}`);
    }
  }

  // Set historical tracking fields
  transformed.is_historical_import = true;
  transformed.data_source = context.dataSource;
  transformed.import_batch_id = context.batchId;

  return transformed;
}

function transformVehicleRecord(
  data: Record<string, unknown>,
  context: TransformContext,
  warnings: string[],
  retroactiveEvents: RetroactiveEvent[],
  ghostEntities: GhostEntity[]
): Record<string, unknown> {
  const transformed = { ...data };

  // Estimate assignment date if missing but rider assigned
  if (data.rider_id && !data.rental_start_date) {
    const estimation = estimateAssignmentDate(
      { rider_id: String(data.rider_id), rental_start_date: null },
      null
    );

    if (estimation.estimatedDate) {
      transformed.rental_start_date = estimation.estimatedDate.toISOString();
      transformed.confidence_score = Math.min(
        (transformed.confidence_score as number) || 1.0,
        estimation.confidenceScore
      );

      retroactiveEvents.push({
        id: '',
        entity_type: 'vehicle',
        entity_id: String(data.vehicle_number),
        event_type: 'ASSIGN',
        effective_date: estimation.estimatedDate.toISOString(),
        recorded_date: new Date().toISOString(),
        event_data: {
          estimated: true,
          method: estimation.estimationMethod,
          rider_id: data.rider_id,
        },
        source: context.dataSource,
        confidence: estimation.confidenceScore,
        notes: estimation.notes || null,
        import_batch_id: context.batchId,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Set historical tracking fields
  transformed.is_historical_import = true;
  transformed.data_source = context.dataSource;
  transformed.import_batch_id = context.batchId;

  return transformed;
}

function transformBatteryRecord(
  data: Record<string, unknown>,
  context: TransformContext,
  warnings: string[],
  retroactiveEvents: RetroactiveEvent[],
  ghostEntities: GhostEntity[]
): Record<string, unknown> {
  const transformed = { ...data };

  // Set historical tracking fields
  transformed.is_historical_import = true;
  transformed.data_source = context.dataSource;
  transformed.import_batch_id = context.batchId;

  return transformed;
}

function transformPaymentRecord(
  data: Record<string, unknown>,
  context: TransformContext,
  warnings: string[],
  retroactiveEvents: RetroactiveEvent[]
): Record<string, unknown> {
  const transformed = { ...data };

  // Estimate due date if missing
  if (!data.due_date) {
    const estimation = estimateDueDate(
      { due_date: null, week_number: data.week_number as number | undefined },
      { rental_start_date: data.rental_start_date as string | null }
    );

    if (estimation.estimatedDate) {
      transformed.due_date = estimation.estimatedDate.toISOString();
      transformed.confidence_score = Math.min(
        (transformed.confidence_score as number) || 1.0,
        estimation.confidenceScore
      );

      warnings.push(`Due date estimated using ${estimation.estimationMethod}`);
    }
  }

  // Set historical tracking fields
  transformed.is_historical_import = true;
  transformed.data_source = context.dataSource;
  transformed.import_batch_id = context.batchId;

  return transformed;
}

// ============================================================================
// GHOST ENTITY CREATION
// ============================================================================

/**
 * Create a ghost entity for a missing reference
 */
export function createGhostEntity(
  entityType: RetroactiveEntityType,
  entityId: string,
  csvRecord: Record<string, unknown>,
  context: TransformContext
): GhostEntity {
  const placeholderData = getPlaceholderData(entityType, entityId, csvRecord);

  return {
    entityType,
    entityId,
    placeholderData,
    confidenceScore: 0.30,
    reason: `Entity ${entityId} referenced in CSV but not found in database`,
  };
}

/**
 * Get placeholder data for a ghost entity
 */
function getPlaceholderData(
  entityType: RetroactiveEntityType,
  entityId: string,
  csvRecord: Record<string, unknown>
): Record<string, unknown> {
  switch (entityType) {
    case 'rider':
      return {
        rider_id: entityId,
        name: `Imported Rider [${entityId}]`,
        phone: csvRecord.rider_phone || '0000000000',
        email: `imported.${entityId}@placeholder.local`,
        status: 'active',
        rental_plan: 'weekly',
        is_historical_import: true,
        data_source: 'DEFAULT_FILL',
        confidence_score: 0.30,
      };

    case 'vehicle':
      return {
        vehicle_number: entityId,
        make: 'Unknown',
        model: 'Unknown',
        status: 'Deployed',
        is_historical_import: true,
        data_source: 'DEFAULT_FILL',
        confidence_score: 0.30,
      };

    case 'battery':
      return {
        battery_id: entityId,
        status: 'MAPPED',
        service_provider: 'BATTERY_SMART',
        is_historical_import: true,
        data_source: 'DEFAULT_FILL',
        confidence_score: 0.30,
      };

    default:
      return {
        id: entityId,
        is_historical_import: true,
        data_source: 'DEFAULT_FILL',
        confidence_score: 0.30,
      };
  }
}

// ============================================================================
// EFFECTIVE DATE CALCULATION
// ============================================================================

/**
 * Calculate effective dates for a record
 */
function calculateEffectiveDatesForRecord(
  type: string,
  data: Record<string, unknown>,
  context: TransformContext
): { effective_start_date: string | null; effective_end_date: string | null } {
  let startDate: Date | null = null;

  // Determine start date based on record type
  switch (type) {
    case 'rider':
      startDate = parseDate(data.onboard_date as string) ||
                  parseDate(data.join_date as string);
      break;

    case 'vehicle':
      startDate = parseDate(data.rental_start_date as string) ||
                  parseDate(data.delivery_date as string);
      break;

    case 'battery':
      startDate = parseDate(data.retrofit_date as string) ||
                  parseDate(data.created_at as string);
      break;

    case 'payment':
      startDate = parseDate(data.due_date as string) ||
                  parseDate(data.payment_date as string);
      break;
  }

  // If no start date found, use the data period start
  if (!startDate) {
    startDate = context.dataPeriodStart;
  }

  return calculateEffectiveDates(startDate, null);
}

/**
 * Parse a date string safely
 */
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

// ============================================================================
// RETROACTIVE EVENT GENERATION
// ============================================================================

/**
 * Generate retroactive events for a set of transformed records
 */
export function generateRetroactiveEvents(
  records: TransformedRecord[],
  context: TransformContext
): RetroactiveEvent[] {
  const allEvents: RetroactiveEvent[] = [];

  for (const record of records) {
    allEvents.push(...record.retroactiveEvents);
  }

  return allEvents;
}

// ============================================================================
// MAIN TRANSFORM FUNCTION
// ============================================================================

/**
 * Transform all reconciled records
 */
export function transformRecords(
  records: Array<{ type: string; data: Record<string, unknown> }>,
  context: TransformContext
): TransformResult {
  const transformedRecords = applyDateEstimation(records, context);

  // Collect all ghost entities and retroactive events
  const allGhostEntities: GhostEntity[] = [];
  const allRetroactiveEvents: RetroactiveEvent[] = [];

  let recordsWithEstimatedDates = 0;
  let totalConfidence = 0;

  for (const record of transformedRecords) {
    allGhostEntities.push(...record.ghostEntities);
    allRetroactiveEvents.push(...record.retroactiveEvents);

    if (record.warnings.length > 0) {
      recordsWithEstimatedDates++;
    }

    totalConfidence += record.confidenceScore;
  }

  return {
    records: transformedRecords,
    ghostEntities: allGhostEntities,
    retroactiveEvents: allRetroactiveEvents,
    statistics: {
      totalRecords: transformedRecords.length,
      recordsWithEstimatedDates,
      ghostEntitiesCreated: allGhostEntities.length,
      retroactiveEventsCreated: allRetroactiveEvents.length,
      avgConfidenceScore: transformedRecords.length > 0
        ? totalConfidence / transformedRecords.length
        : 1.0,
    },
  };
}
